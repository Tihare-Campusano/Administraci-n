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
    return false;
  }

  async hasPasswordSet(): Promise<boolean> {
    // 1. Priorizar IndexedDB como fuente de verdad local
    const localHash = await this.repository.getVal<string>(this.PASSWORD_HASH_KEY);
    if (localHash) {
      return true;
    }

    // 2. Si no existe localmente, verificar Supabase (ej: sincronización en nuevo dispositivo)
    try {
      const remoteHash = await this.supabaseService.getSetting(this.PASSWORD_HASH_KEY);
      if (remoteHash) {
        await this.repository.setVal(this.PASSWORD_HASH_KEY, remoteHash);
        await this.repository.setVal(this.ENABLED_KEY, true);
        return true;
      }
    } catch (e) {
      // Ignorar errores de red offline
    }

    return false;
  }

  async hashPassword(password: string): Promise<string> {
    const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoObj && cryptoObj.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + "salt_foodadmin_2026");
        const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
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
    
    // 1. Guardar en IndexedDB (fuente de verdad inmediata)
    await this.repository.setVal(this.PASSWORD_HASH_KEY, hash);
    await this.repository.setVal(this.ENABLED_KEY, true);
    SecurityService.isAuthenticated = true;

    // 2. Intentar respaldar en Supabase sin bloquear si falla
    try {
      await this.supabaseService.saveSetting(this.PASSWORD_HASH_KEY, hash);
    } catch (e) {
      console.warn('No se pudo respaldar la contraseña en Supabase (modo offline):', e);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!password || !password.trim()) return false;
    const inputHash = await this.hashPassword(password.trim());
    
    // 1. Buscar primero en IndexedDB
    let savedHash = await this.repository.getVal<string>(this.PASSWORD_HASH_KEY);

    // 2. Si no existe en IndexedDB, intentar obtener de Supabase
    if (!savedHash) {
      try {
        savedHash = await this.supabaseService.getSetting(this.PASSWORD_HASH_KEY);
        if (savedHash) {
          await this.repository.setVal(this.PASSWORD_HASH_KEY, savedHash);
        }
      } catch (e) {}
    }

    if (savedHash && savedHash === inputHash) {
      SecurityService.isAuthenticated = true;
      return true;
    }
    return false;
  }

  async disableSecurity(currentPassword: string): Promise<boolean> {
    const isValid = await this.validatePassword(currentPassword);
    if (isValid) {
      // 1. Desactivar localmente en IndexedDB inmediatamente
      await this.repository.setVal(this.ENABLED_KEY, false);
      await this.repository.deleteVal(this.PASSWORD_HASH_KEY);
      SecurityService.isAuthenticated = false;

      // 2. Intentar eliminar de Supabase en segundo plano
      try {
        await this.supabaseService.deleteSetting(this.PASSWORD_HASH_KEY);
      } catch (e) {
        console.warn('No se pudo eliminar la contraseña en Supabase (modo offline):', e);
      }
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

  setAuthenticatedSession(auth: boolean): void {
    SecurityService.isAuthenticated = auth;
  }

  lockSession(): void {
    SecurityService.isAuthenticated = false;
  }
}
