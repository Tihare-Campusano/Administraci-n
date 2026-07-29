import { openDB } from '../database/db';
import { Note } from '../models/Note';

export class NoteRepository {
  private storeName = 'notes';

  async getAll(): Promise<Note[]> {
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
  }

  async getAllRaw(): Promise<Note[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<Note | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(note: Note): Promise<Note> {
    note.updatedAt = new Date().toISOString();
    if (note.deleted === undefined) {
      note.deleted = false;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(note);

      request.onsuccess = () => resolve(note);
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
