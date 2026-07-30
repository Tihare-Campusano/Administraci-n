import { openDB } from '../database/db';
import { Note } from '../models/Note';
import { SupabaseService } from '../services/SupabaseService';

export class NoteRepository {
  private storeName = 'notes';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Note[]> {
    try {
      const remote = await this.supabaseService.getNotes();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
    } catch (e) {
      // Ignorar fallos de red en sync remoto
    }
    return this.getLocalAll();
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

    // 1. Guardar primero en IndexedDB (Fuente de verdad local inmediata)
    await this.saveLocal(note);

    // 2. Intentar sincronizar con la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.saveNote(note);
    } catch (err) {
      console.warn('Sincronización cloud de la nota fallida u offline:', err);
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
    // 1. Eliminar primero de IndexedDB local
    await this.deleteLocal(id);

    // 2. Intentar eliminar en la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.deleteRow('notes', id);
    } catch (err) {
      console.warn('Eliminación cloud de la nota fallida u offline:', err);
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
