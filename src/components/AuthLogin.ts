import { SecurityService } from '../services/SecurityService';
import { showToast } from './Toast';

export type AuthMode = 'lock' | 'setup' | 'change' | 'disable';

export class AuthLogin {
  private securityService = new SecurityService();
  private currentMode: AuthMode = 'lock';
  private onUnlockSuccess: () => void = () => {};
  private isVisible: boolean = false;

  init(onUnlockSuccess: () => void): void {
    this.onUnlockSuccess = onUnlockSuccess;

    const form = document.getElementById('auth-login-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    const cancelBtn = document.getElementById('auth-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancel());

    // Configurar botones de ojo para mostrar/ocultar contraseña
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;
        const input = document.getElementById(targetId) as HTMLInputElement;
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          
          // Cambiar ícono visual del botón
          const svg = btn.querySelector('svg');
          if (svg) {
            svg.innerHTML = isPassword 
              ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
              : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
          }
        }
      });
    });

    // Tecla Escape para cancelar si aplica
    window.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Escape' && this.currentMode !== 'lock') {
        this.handleCancel();
      }
    });
  }

  async show(mode: AuthMode = 'lock'): Promise<void> {
    this.currentMode = mode;
    this.isVisible = true;

    const overlay = document.getElementById('auth-login-overlay');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const cancelBtn = document.getElementById('auth-cancel-btn');

    const groupCurrent = document.getElementById('group-current-password');
    const groupMain = document.getElementById('group-main-password');
    const groupConfirm = document.getElementById('group-confirm-password');

    const passwordLabel = document.getElementById('auth-password-label');

    const currentInput = document.getElementById('auth-current-password-input') as HTMLInputElement;
    const mainInput = document.getElementById('auth-password-input') as HTMLInputElement;
    const confirmInput = document.getElementById('auth-confirm-password-input') as HTMLInputElement;

    if (!overlay || !title || !submitBtn) return;

    // Limpiar campos y errores
    if (currentInput) currentInput.value = '';
    if (mainInput) mainInput.value = '';
    if (confirmInput) confirmInput.value = '';
    this.hideError();

    // Restablecer tipos a password
    [currentInput, mainInput, confirmInput].forEach(inp => {
      if (inp) inp.type = 'password';
    });

    if (mode === 'setup') {
      title.textContent = 'Crear Contraseña de Acceso';
      if (subtitle) subtitle.textContent = 'Crea una contraseña (números o caracteres) que será almacenada en Supabase para el acceso a tu aplicación.';
      submitBtn.textContent = 'Guardar Contraseña y Acceder';
      if (passwordLabel) passwordLabel.textContent = 'Crear Contraseña';

      if (groupCurrent) groupCurrent.style.display = 'none';
      if (groupMain) groupMain.style.display = 'flex';
      if (groupConfirm) groupConfirm.style.display = 'flex';

      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      
      // Si no existe ninguna contraseña creada aun, no permitir cancelar (es obligatoria)
      const hasPassword = await this.securityService.hasPasswordSet();
      if (!hasPassword && cancelBtn) {
        cancelBtn.style.display = 'none';
      }
    } else if (mode === 'change') {
      title.textContent = 'Cambiar Contraseña';
      if (subtitle) subtitle.textContent = 'Ingresa tu contraseña actual y la nueva contraseña que deseas usar.';
      submitBtn.textContent = 'Cambiar Contraseña';
      if (passwordLabel) passwordLabel.textContent = 'Nueva Contraseña';

      if (groupCurrent) groupCurrent.style.display = 'flex';
      if (groupMain) groupMain.style.display = 'flex';
      if (groupConfirm) groupConfirm.style.display = 'flex';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
    } else if (mode === 'disable') {
      title.textContent = 'Desactivar Contraseña';
      if (subtitle) subtitle.textContent = 'Ingresa tu contraseña actual para desactivar la seguridad de acceso.';
      submitBtn.textContent = 'Desactivar Seguridad';
      if (passwordLabel) passwordLabel.textContent = 'Contraseña Actual';

      if (groupCurrent) groupCurrent.style.display = 'none';
      if (groupMain) groupMain.style.display = 'flex';
      if (groupConfirm) groupConfirm.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
    } else {
      title.textContent = 'Iniciar Sesión en FoodAdmin';
      if (subtitle) subtitle.textContent = 'Ingresa tu contraseña para acceder a la aplicación.';
      submitBtn.textContent = 'Ingresar';
      if (passwordLabel) passwordLabel.textContent = 'Contraseña';

      if (groupCurrent) groupCurrent.style.display = 'none';
      if (groupMain) groupMain.style.display = 'flex';
      if (groupConfirm) groupConfirm.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
    }

    overlay.classList.add('active');

    // Autofoco en el primer campo visible
    setTimeout(() => {
      if (mode === 'change' && currentInput) currentInput.focus();
      else if (mainInput) mainInput.focus();
    }, 100);
  }

  hide(): void {
    const overlay = document.getElementById('auth-login-overlay');
    overlay?.classList.remove('active');
    this.isVisible = false;
  }

  private handleCancel(): void {
    if (this.currentMode !== 'lock') {
      this.hide();
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.hideError();

    const currentInput = document.getElementById('auth-current-password-input') as HTMLInputElement;
    const mainInput = document.getElementById('auth-password-input') as HTMLInputElement;
    const confirmInput = document.getElementById('auth-confirm-password-input') as HTMLInputElement;

    const currentPass = currentInput?.value || '';
    const mainPass = mainInput?.value || '';
    const confirmPass = confirmInput?.value || '';

    try {
      if (this.currentMode === 'setup') {
        if (!mainPass || mainPass.trim().length === 0) {
          this.triggerError('La contraseña no puede estar vacía.');
          return;
        }
        if (mainPass !== confirmPass) {
          this.triggerError('Las contraseñas no coinciden. Intenta de nuevo.');
          return;
        }

        await this.securityService.setPassword(mainPass);
        showToast('Contraseña guardada con éxito', 'success');
        this.hide();
        this.onUnlockSuccess();
      } 
      else if (this.currentMode === 'change') {
        if (!currentPass) {
          this.triggerError('Ingresa tu contraseña actual.');
          return;
        }
        if (!mainPass || mainPass.trim().length === 0) {
          this.triggerError('La nueva contraseña no puede estar vacía.');
          return;
        }
        if (mainPass !== confirmPass) {
          this.triggerError('Las nuevas contraseñas no coinciden.');
          return;
        }

        await this.securityService.changePassword(currentPass, mainPass);
        showToast('Contraseña actualizada con éxito', 'success');
        this.hide();
        this.onUnlockSuccess();
      } 
      else if (this.currentMode === 'disable') {
        if (!mainPass) {
          this.triggerError('Ingresa tu contraseña actual.');
          return;
        }

        const isSuccess = await this.securityService.disableSecurity(mainPass);
        if (isSuccess) {
          showToast('Seguridad desactivada con éxito', 'success');
          this.hide();
          this.onUnlockSuccess();
        } else {
          this.triggerError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
      } 
      else {
        if (!mainPass) {
          this.triggerError('Ingresa tu contraseña.');
          return;
        }

        const isValid = await this.securityService.validatePassword(mainPass);
        if (isValid) {
          this.hide();
          this.onUnlockSuccess();
        } else {
          this.triggerError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
      }
    } catch (err: any) {
      this.triggerError(err.message || 'Ocurrió un error al procesar la autenticación.');
    }
  }

  private triggerError(message: string): void {
    const errorMsg = document.getElementById('auth-error-msg');
    const card = document.querySelector('.auth-card');

    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.classList.add('visible');
    }

    if (card) {
      card.classList.add('shake');
      setTimeout(() => {
        card.classList.remove('shake');
      }, 500);
    }
  }

  private hideError(): void {
    const errorMsg = document.getElementById('auth-error-msg');
    errorMsg?.classList.remove('visible');
  }
}
