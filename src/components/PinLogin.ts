import { SecurityService } from '../services/SecurityService';
import { showToast } from './Toast';

export type PinMode = 'lock' | 'setup' | 'change' | 'disable';

export class PinLogin {
  private securityService = new SecurityService();
  private inputBuffer: string = '';
  private currentMode: PinMode = 'lock';
  private onUnlockSuccess: () => void = () => {};
  
  // Variables de estado temporal para configuración de PIN
  private firstPinAttempt: string | null = null;
  private isVisible: boolean = false;

  init(onUnlockSuccess: () => void): void {
    this.onUnlockSuccess = onUnlockSuccess;

    // Enlazar clics en teclas del teclado virtual
    document.querySelectorAll('.pin-key[data-val]').forEach(key => {
      key.addEventListener('click', () => {
        const val = key.getAttribute('data-val');
        if (val) this.handleKeyPress(val);
      });
    });

    // Enlazar botón borrar
    document.getElementById('pin-delete-btn')?.addEventListener('click', () => this.handleBackspace());

    // Enlazar botón cancelar (solo activo al configurar/cambiar, no al estar bloqueado)
    document.getElementById('pin-cancel-btn')?.addEventListener('click', () => this.handleCancel());

    // Enlazar teclado físico
    window.addEventListener('keydown', (e) => this.handlePhysicalKeyboard(e));
  }

  async show(mode: PinMode = 'lock'): Promise<void> {
    this.currentMode = mode;
    this.inputBuffer = '';
    this.firstPinAttempt = null;
    this.isVisible = true;

    const overlay = document.getElementById('pin-login-overlay');
    const title = document.getElementById('pin-title');
    const cancelBtn = document.getElementById('pin-cancel-btn');

    if (!overlay || !title) return;

    // Configurar textos de la pantalla según el modo
    if (mode === 'setup') {
      title.textContent = 'Crea tu PIN de Seguridad (4 dígitos)';
      if (cancelBtn) {
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.visibility = 'visible';
      }
    } else if (mode === 'change') {
      title.textContent = 'Ingresa tu PIN actual';
      if (cancelBtn) {
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.visibility = 'visible';
      }
    } else if (mode === 'disable') {
      title.textContent = 'Ingresa tu PIN para desactivar';
      if (cancelBtn) {
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.visibility = 'visible';
      }
    } else {
      title.textContent = 'Ingresa tu PIN de Seguridad';
      if (cancelBtn) {
        // En bloqueo total no se puede cancelar la pantalla
        cancelBtn.style.visibility = 'hidden';
      }
    }

    this.updateDots();
    this.hideError();
    overlay.classList.add('active');
  }

  hide(): void {
    const overlay = document.getElementById('pin-login-overlay');
    overlay?.classList.remove('active');
    this.isVisible = false;
    this.inputBuffer = '';
  }

  private handleKeyPress(digit: string): void {
    if (!this.isVisible || this.inputBuffer.length >= 4) return;

    this.hideError();
    this.inputBuffer += digit;
    this.updateDots();

    // Cuando llega a 4 dígitos, validar automáticamente
    if (this.inputBuffer.length === 4) {
      setTimeout(() => this.validateInput(), 200);
    }
  }

  private handleBackspace(): void {
    if (!this.isVisible || this.inputBuffer.length === 0) return;
    this.inputBuffer = this.inputBuffer.slice(0, -1);
    this.updateDots();
    this.hideError();
  }

  private handleCancel(): void {
    if (this.currentMode !== 'lock') {
      this.hide();
    }
  }

  private handlePhysicalKeyboard(e: KeyboardEvent): void {
    if (!this.isVisible) return;

    // Números del 0 al 9
    if (/^\d$/.test(e.key)) {
      this.handleKeyPress(e.key);
    }
    // Borrar
    else if (e.key === 'Backspace') {
      this.handleBackspace();
    }
    // Cancelar/Escape (si aplica)
    else if (e.key === 'Escape' && this.currentMode !== 'lock') {
      this.handleCancel();
    }
  }

  private async validateInput(): Promise<void> {
    const pin = this.inputBuffer;
    this.inputBuffer = ''; // Limpiar el buffer temporal para el siguiente intento

    const title = document.getElementById('pin-title');

    // 1. MODO: CONFIGURACIÓN INICIAL DEL PIN
    if (this.currentMode === 'setup') {
      if (!this.firstPinAttempt) {
        // Guardar el primer intento y pedir confirmación
        this.firstPinAttempt = pin;
        if (title) title.textContent = 'Confirma tu nuevo PIN';
        this.updateDots();
      } else {
        // Validar si coincide con el primer intento
        if (this.firstPinAttempt === pin) {
          try {
            await this.securityService.setPin(pin);
            showToast('PIN de seguridad activado con éxito', 'success');
            this.hide();
            this.onUnlockSuccess();
          } catch (err: any) {
            showToast(err.message || 'Error al guardar PIN', 'danger');
            this.resetSetup();
          }
        } else {
          this.triggerError('Los PINs no coinciden. Intenta de nuevo.');
          this.resetSetup();
        }
      }
    } 
    // 2. MODO: CAMBIO DE PIN (INGRESO DEL PIN ACTUAL)
    else if (this.currentMode === 'change') {
      const isValid = await this.securityService.validatePin(pin);
      if (isValid) {
        // PIN actual correcto, ahora pedir el nuevo PIN
        this.currentMode = 'setup';
        this.firstPinAttempt = null;
        if (title) title.textContent = 'Crea tu nuevo PIN';
        this.updateDots();
      } else {
        this.triggerError('PIN incorrecto. Inténtalo de nuevo.');
        this.updateDots();
      }
    } 
    // 3. MODO: DESACTIVAR SEGURIDAD
    else if (this.currentMode === 'disable') {
      const isSuccess = await this.securityService.disableSecurity(pin);
      if (isSuccess) {
        showToast('PIN desactivado con éxito', 'success');
        this.hide();
        this.onUnlockSuccess();
      } else {
        this.triggerError('PIN incorrecto. Inténtalo de nuevo.');
        this.updateDots();
      }
    }
    // 4. MODO: PANTALLA DE BLOQUEO (DESBLOQUEO)
    else {
      const isValid = await this.securityService.validatePin(pin);
      if (isValid) {
        this.hide();
        this.onUnlockSuccess();
      } else {
        this.triggerError('PIN incorrecto. Inténtalo de nuevo.');
        this.updateDots();
      }
    }
  }

  private resetSetup(): void {
    this.firstPinAttempt = null;
    const title = document.getElementById('pin-title');
    if (title) title.textContent = 'Crea tu PIN de Seguridad (4 dígitos)';
    this.updateDots();
  }

  private updateDots(): void {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < this.inputBuffer.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  private triggerError(message: string): void {
    const errorMsg = document.getElementById('pin-error-msg');
    const dotsContainer = document.getElementById('pin-dots');

    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.classList.add('visible');
    }

    // Efecto premium: vibración/shake en el contenedor de los dots
    if (dotsContainer) {
      dotsContainer.classList.add('shake');
      // Remover la clase de animación para que pueda reactivarse en el futuro
      setTimeout(() => {
        dotsContainer.classList.remove('shake');
      }, 500);
    }
  }

  private hideError(): void {
    const errorMsg = document.getElementById('pin-error-msg');
    errorMsg?.classList.remove('visible');
  }
}
