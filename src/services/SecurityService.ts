import { SecurityRepository } from '../repositories/SecurityRepository';
import { SupabaseService } from './SupabaseService';

export class SecurityService {
  private repository = new SecurityRepository();
  private supabaseService = new SupabaseService();
  private static isAuthenticated = false;

  private PASSWORD_HASH_KEY = 'security_password_hash';
  private ENABLED_KEY = 'security_enabled';

  async isSecurityEnabled(): Promise<boolean> {
    const enabled = await this.repository.getVal<boolean>(this.ENABLED_KEY);
    if (enabled !== undefined) return enabled;
    return true;
  }

  async hasPasswordSet(): Promise<boolean> {
    let hash = await this.repository.getVal<string>(this.PASSWORD_HASH_KEY);
    if (!hash) {
      try {
        const remoteHash = await this.supabaseService.getSetting(this.PASSWORD_HASH_KEY);
        if (remoteHash) {
          hash = remoteHash;
          await this.repository.setVal(this.PASSWORD_HASH_KEY, hash);
          await this.repository.setVal(this.ENABLED_KEY, true);
        }
      } catch (e) {
        // Fallback silencioso en offline
      }
    }
    return !!hash;
  }

  async hashPassword(password: string): Promise<string> {
    if (window.crypto && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + "salt_foodadmin_2026");
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (err) {
        console.warn('Fallo al usar WebCrypto SHA-256, usando fallback local:', err);
      }
    }
    let hash = 2166136261;
    for (let i = 0; i < password.length; i++) {
      hash ^= password.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  async setPassword(password: string): Promise<void> {
    if (!password || password.trim().length === 0) {
      throw new Error('La contraseña no puede estar vacía.');
    }
    const hash = await this.hashPassword(password.trim());
    await this.repository.setVal(this.PASSWORD_HASH_KEY, hash);
    await this.repository.setVal(this.ENABLED_KEY, true);
    
    try {
      await this.supabaseService.saveSetting(this.PASSWORD_HASH_KEY, hash);
    } catch (e) {
      console.warn('Fallo al respaldar contraseña en Supabase (se mantiene local):', e);
    }

    SecurityService.isAuthenticated = true;
  }

  async validatePassword(password: string): Promise<boolean> {
    let savedHash = await this.repository.getVal<string>(this.PASSWORD_HASH_KEY);
    if (!savedHash) {
      try {
        const remoteHash = await this.supabaseService.getSetting(this.PASSWORD_HASH_KEY);
        if (remoteHash) {
          savedHash = remoteHash;
          await this.repository.setVal(this.PASSWORD_HASH_KEY, savedHash);
        }
      } catch (e) {}
    }

    if (!savedHash) {
      return false;
    }
    const inputHash = await this.hashPassword(password.trim());
    if (savedHash === inputHash) {
      SecurityService.isAuthenticated = true;
      return true;
    }
    return false;
  }

  async disableSecurity(currentPassword: string): Promise<boolean> {
    const isValid = await this.validatePassword(currentPassword);
    if (isValid) {
      await this.repository.setVal(this.ENABLED_KEY, false);
      await this.repository.deleteVal(this.PASSWORD_HASH_KEY);
      try {
        await this.supabaseService.saveSetting(this.PASSWORD_HASH_KEY, null);
      } catch (e) {}
      SecurityService.isAuthenticated = false;
      return true;
    }
    return false;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const isValid = await this.validatePassword(currentPassword);
    if (!isValid) {
      throw new Error('La contraseña actual es incorrecta.');
    }
    await this.setPassword(newPassword);
  }

  isAuthenticatedSession(): boolean {
    return SecurityService.isAuthenticated;
  }

  lockSession(): void {
    SecurityService.isAuthenticated = false;
  }
}
