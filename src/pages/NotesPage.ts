import { NoteService } from '../services/NoteService';
import { CheckItem, Note } from '../models/Note';
import { showToast } from '../components/Toast';

export class NotesPage {
  private noteService = new NoteService();
  private selectedNoteId: string | null = null;
  private currentTasks: CheckItem[] = [];

  init(): void {
    document.getElementById('notes-new-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('close-note-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-note')?.addEventListener('click', () => this.closeModal());
    document.getElementById('note-form')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('btn-add-task-item')?.addEventListener('click', () => this.addTaskInputRow());

    document.getElementById('notes-search')?.addEventListener('input', () => this.load());
    document.getElementById('notes-filter-category')?.addEventListener('change', () => this.load());

    const modalOverlay = document.getElementById('modal-note');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) this.closeModal();
    });
  }

  async load(): Promise<void> {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="empty-state">Cargando notas...</div>';

    try {
      let notes = await this.noteService.getAllNotes();

      const searchVal = (document.getElementById('notes-search') as HTMLInputElement)?.value.toLowerCase().trim() || '';
      const catVal = (document.getElementById('notes-filter-category') as HTMLSelectElement)?.value || 'all';

      if (catVal !== 'all') {
        notes = notes.filter(n => n.category.toLowerCase() === catVal.toLowerCase());
      }

      if (searchVal) {
        notes = notes.filter(n =>
          n.title.toLowerCase().includes(searchVal) ||
          n.content.toLowerCase().includes(searchVal) ||
          n.items.some(i => i.text.toLowerCase().includes(searchVal))
        );
      }

      if (notes.length === 0) {
        this.renderEmptyState(grid);
        return;
      }

      this.renderNotesGrid(grid, notes);
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">Error al cargar bloc de notas.</div>';
    }
  }

  private renderEmptyState(grid: HTMLElement): void {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <h3>No tienes notas registradas</h3>
        <p>Crea tu primera nota o lista de tareas haciendo clic en "+ Nueva Nota".</p>
      </div>
    `;
  }

  private renderNotesGrid(grid: HTMLElement, notes: Note[]): void {
    grid.innerHTML = notes.map(note => {
      const formattedDate = new Date(note.updatedAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const checklistHtml = note.items && note.items.length > 0 ? `
        <div class="note-checklist">
          ${note.items.map(item => `
            <label class="checklist-item ${item.completed ? 'completed' : ''}" data-note-id="${note.id}" data-item-id="${item.id}">
              <input type="checkbox" ${item.completed ? 'checked' : ''} class="note-task-checkbox" data-note-id="${note.id}" data-item-id="${item.id}">
              <span>${item.text}</span>
            </label>
          `).join('')}
        </div>
      ` : '';

      return `
        <div class="glass-card note-card ${note.isPinned ? 'pinned' : ''}" style="border-left-color: ${note.color || 'var(--accent)'};">
          <div class="note-header">
            <span class="note-category-badge">${note.category}</span>
            <button class="note-pin-btn ${note.isPinned ? 'active' : ''}" data-id="${note.id}" title="${note.isPinned ? 'Desmarcar destacada' : 'Destacar nota'}">
              ${note.isPinned ? '⭐' : '☆'}
            </button>
          </div>
          <h3 class="note-title">${note.title}</h3>
          ${note.content ? `<p class="note-content-preview">${note.content}</p>` : ''}
          ${checklistHtml}
          <div class="note-footer">
            <span>📅 ${formattedDate}</span>
            <div class="note-actions">
              <button class="btn btn-secondary btn-sm edit-note-btn" data-id="${note.id}">Editar</button>
              <button class="btn btn-danger btn-sm delete-note-btn" data-id="${note.id}">Borrar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.bindCardEvents();
  }

  private bindCardEvents(): void {
    document.querySelectorAll('.note-pin-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) {
          await this.noteService.togglePinNote(id);
          this.load();
        }
      });
    });

    document.querySelectorAll('.note-task-checkbox').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const noteId = target.getAttribute('data-note-id');
        const itemId = target.getAttribute('data-item-id');
        if (noteId && itemId) {
          await this.noteService.toggleCheckItem(noteId, itemId);
          this.load();
        }
      });
    });

    document.querySelectorAll('.edit-note-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.getAttribute('data-id') || undefined));
    });

    document.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteNote(btn.getAttribute('data-id') || ''));
    });
  }

  async openModal(id?: string): Promise<void> {
    this.selectedNoteId = id || null;
    this.currentTasks = [];

    const form = document.getElementById('note-form') as HTMLFormElement;
    const titleEl = document.getElementById('note-modal-title');
    const tasksContainer = document.getElementById('note-tasks-builder');

    if (!form) return;
    form.reset();
    if (tasksContainer) tasksContainer.innerHTML = '';

    const idInput = document.getElementById('note-id') as HTMLInputElement;
    if (idInput) idInput.value = id || '';

    if (id && titleEl) {
      titleEl.textContent = 'Editar Nota';
      const note = await this.noteService.getNoteById(id);
      if (note) {
        (document.getElementById('note-title') as HTMLInputElement).value = note.title;
        (document.getElementById('note-category') as HTMLInputElement).value = note.category;
        (document.getElementById('note-color') as HTMLInputElement).value = note.color || '#ec4899';
        (document.getElementById('note-content') as HTMLTextAreaElement).value = note.content || '';
        (document.getElementById('note-pinned') as HTMLInputElement).checked = note.isPinned;

        if (note.items && note.items.length > 0) {
          this.currentTasks = [...note.items];
          this.renderTaskInputRows();
        }
      }
    } else if (titleEl) {
      titleEl.textContent = 'Nueva Nota / Lista';
    }

    document.getElementById('modal-note')?.classList.add('active');
    setTimeout(() => {
      (document.getElementById('note-title') as HTMLInputElement)?.focus();
    }, 50);
  }

  closeModal(): void {
    document.getElementById('modal-note')?.classList.remove('active');
    this.selectedNoteId = null;
    this.currentTasks = [];
  }

  private addTaskInputRow(initialText: string = ''): void {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    this.currentTasks.push({ id: taskId, text: initialText, completed: false });
    this.renderTaskInputRows();
  }

  private renderTaskInputRows(): void {
    const container = document.getElementById('note-tasks-builder');
    if (!container) return;

    container.innerHTML = this.currentTasks.map((t, idx) => `
      <div class="task-builder-row">
        <input type="text" class="form-input task-text-input" data-index="${idx}" value="${t.text}" placeholder="Escribe un ítem de tarea...">
        <button type="button" class="btn btn-danger btn-sm remove-task-btn" data-index="${idx}">&times;</button>
      </div>
    `).join('');

    container.querySelectorAll('.task-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.getAttribute('data-index') || '0', 10);
        if (this.currentTasks[index]) {
          this.currentTasks[index].text = target.value;
        }
      });
    });

    container.querySelectorAll('.remove-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') || '0', 10);
        this.currentTasks.splice(index, 1);
        this.renderTaskInputRows();
      });
    });
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const title = (document.getElementById('note-title') as HTMLInputElement).value;
    const category = (document.getElementById('note-category') as HTMLInputElement).value || 'General';
    const color = (document.getElementById('note-color') as HTMLInputElement).value || '#ec4899';
    const content = (document.getElementById('note-content') as HTMLTextAreaElement).value;
    const isPinned = (document.getElementById('note-pinned') as HTMLInputElement).checked;

    if (!title.trim()) {
      showToast('El título de la nota es obligatorio', 'danger');
      return;
    }

    const items = this.currentTasks.filter(t => t.text.trim().length > 0);

    try {
      await this.noteService.saveNote({
        id: this.selectedNoteId || undefined,
        title,
        category,
        color,
        content,
        isPinned,
        items
      });

      showToast(this.selectedNoteId ? 'Nota actualizada' : 'Nota guardada con éxito');
      this.closeModal();
      this.load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar nota', 'danger');
    }
  }

  private async deleteNote(id: string): Promise<void> {
    if (confirm('¿Estás seguro de eliminar esta nota?')) {
      try {
        await this.noteService.deleteNote(id);
        showToast('Nota eliminada');
        this.load();
      } catch (err) {
        showToast('Error al eliminar nota', 'danger');
      }
    }
  }
}
