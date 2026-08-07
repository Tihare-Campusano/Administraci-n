import { openDB } from '../database/db';
import { Note } from '../models/Note';
import { SupabaseService } from '../services/SupabaseService';

export class NoteRepository {
  private storeName = 'notes';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Note[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getNotes();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Note>(local.map(n => [n.id, n]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveNote(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(n => !n.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de notas desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
  }

  private async getLocalAll(): Promise<Note[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: Note[] = request.result || [];
          resolve(list.filter(n => !n.deleted));
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<Note | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(n => n.id === id);
  }

  async save(note: Note): Promise<Note> {
    note.updatedAt = new Date().toISOString();
    if (note.deleted === undefined) {
      note.deleted = false;
    }

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(note).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveNote(note);
    } catch (err) {
      console.warn('Sincronización cloud de la nota fallida:', err);
    }

    return note;
  }

  private async saveLocal(note: Note): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(note);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('notes', id);
    } catch (err) {
      console.warn('Eliminación cloud de la nota fallida:', err);
    }
  }

  private async deleteLocal(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
