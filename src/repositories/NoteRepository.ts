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
      return remote.filter(n => !n.deleted);
    } catch (e) {
      return this.getLocalAll();
    }
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

    // Guardar directamente en Supabase (base de datos primaria)
    await this.supabaseService.saveNote(note);
    // Guardar en cache local silenciosamente
    await this.saveLocal(note).catch(() => {});

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
    const note = await this.getById(id);
    if (note) {
      note.deleted = true;
      note.updatedAt = new Date().toISOString();
      await this.save(note);
    }
  }
}
