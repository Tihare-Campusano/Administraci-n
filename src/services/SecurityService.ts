import { SecurityRepository } from '../repositories/SecurityRepository';

export class SecurityService {
  private repository = new SecurityRepository();
  private static isAuthenticated = false;

  private PIN_HASH_KEY = 'security_pin_hash';
  private ENABLED_KEY = 'security_enabled';

  async isSecurityEnabled(): Promise<boolean> {
    const enabled = await this.repository.getVal<boolean>(this.ENABLED_KEY);
    return enabled === true;
  }

  async hasPinSet(): Promise<boolean> {
    const hash = await this.repository.getVal<string>(this.PIN_HASH_KEY);
    return !!hash;
  }

  // Genera un hash SHA-256 robusto. Si no está disponible crypto.subtle (contextos HTTP no seguros en red local),
  // se implementa un fallback hash algorítmico simple (fnv1a) para evitar excepciones fatales.
  async hashPin(pin: string): Promise<string> {
    if (window.crypto && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + "salt_foodadmin_2026"); // Salting para seguridad extra
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (err) {
        console.warn('Fallo al usar WebCrypto SHA-256, usando fallback local:', err);
      }
    }
    // Fallback FNV-1a hash simple (32-bit)
    let hash = 2166136261;
    for (let i = 0; i < pin.length; i++) {
      hash ^= pin.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  async setPin(pin: string): Promise<void> {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      throw new Error('El PIN debe contener exactamente 4 dígitos numéricos.');
    }
    const hash = await this.hashPin(pin);
    await this.repository.setVal(this.PIN_HASH_KEY, hash);
    await this.repository.setVal(this.ENABLED_KEY, true);
    SecurityService.isAuthenticated = true; // Auto-autenticar al configurarlo
  }

  async validatePin(pin: string): Promise<boolean> {
    const savedHash = await this.repository.getVal<string>(this.PIN_HASH_KEY);
    if (!savedHash) {
      return false;
    }
    const inputHash = await this.hashPin(pin);
    if (savedHash === inputHash) {
      SecurityService.isAuthenticated = true;
      return true;
    }
    return false;
  }

  async disableSecurity(currentPin: string): Promise<boolean> {
    const isValid = await this.validatePin(currentPin);
    if (isValid) {
      await this.repository.setVal(this.ENABLED_KEY, false);
      await this.repository.deleteVal(this.PIN_HASH_KEY);
      SecurityService.isAuthenticated = false;
      return true;
    }
    return false;
  }

  isAuthenticatedSession(): boolean {
    return SecurityService.isAuthenticated;
  }

  lockSession(): void {
    SecurityService.isAuthenticated = false;
  }
}
