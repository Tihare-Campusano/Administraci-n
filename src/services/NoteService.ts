import { NoteRepository } from '../repositories/NoteRepository';
import { SupabaseService } from './SupabaseService';
import { Note } from '../models/Note';

export class NoteService {
  private noteRepo = new NoteRepository();
  private supabaseService = new SupabaseService();

  async getAllNotes(): Promise<Note[]> {
    const notes = await this.noteRepo.getAll();
    return notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    return await this.noteRepo.getById(id);
  }

  async saveNote(data: Partial<Note> & { title: string }): Promise<Note> {
    const now = new Date().toISOString();
    let noteToSave: Note;

    if (data.id) {
      const existing = await this.noteRepo.getById(data.id);
      if (!existing) {
        throw new Error('Nota no encontrada');
      }
      noteToSave = {
        ...existing,
        title: data.title.trim(),
        content: data.content !== undefined ? data.content.trim() : existing.content,
        items: data.items || existing.items || [],
        category: data.category || existing.category || 'General',
        isPinned: data.isPinned !== undefined ? data.isPinned : existing.isPinned,
        color: data.color || existing.color || '#ec4899',
        updatedAt: now
      };
    } else {
      noteToSave = {
        id: crypto.randomUUID(),
        title: data.title.trim(),
        content: (data.content || '').trim(),
        items: data.items || [],
        category: data.category || 'General',
        isPinned: data.isPinned || false,
        color: data.color || '#ec4899',
        createdAt: now,
        updatedAt: now,
        deleted: false
      };
    }

    const saved = await this.noteRepo.save(noteToSave);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async togglePinNote(id: string): Promise<void> {
    const note = await this.noteRepo.getById(id);
    if (note) {
      note.isPinned = !note.isPinned;
      note.updatedAt = new Date().toISOString();
      await this.noteRepo.save(note);
      await this.supabaseService.syncNowIfConfigured();
    }
  }

  async toggleCheckItem(noteId: string, itemId: string): Promise<void> {
    const note = await this.noteRepo.getById(noteId);
    if (note && note.items) {
      const item = note.items.find(i => i.id === itemId);
      if (item) {
        item.completed = !item.completed;
        note.updatedAt = new Date().toISOString();
        await this.noteRepo.save(note);
        await this.supabaseService.syncNowIfConfigured();
      }
    }
  }

  async deleteNote(id: string): Promise<void> {
    await this.noteRepo.delete(id);
    await this.supabaseService.syncNowIfConfigured();
  }
}
