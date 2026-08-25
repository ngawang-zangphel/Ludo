import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  cloneSnakesLayout,
  emptySnakesLayout,
  SnakesBoardLayout,
  SnakesCustomBoardDto,
  validateSnakesLayout,
} from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { httpErrorMessage } from '../../../shared/format';
import { SnakesBoardComponent } from '../../game/components/snakes-board/snakes-board';
import { SnakesLayoutEditorComponent } from '../../game/components/snakes-layout-editor/snakes-layout-editor';

@Component({
  selector: 'ludo-admin-snakes-boards-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, SnakesBoardComponent, SnakesLayoutEditorComponent],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <a routerLink="/admin" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">
        Dashboard
      </a>
      <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-bold text-white">Custom boards</h1>
          <p class="mt-1 text-sm text-arena-mist/70">
            Build and save Snakes &amp; Ladders layouts for tournaments.
          </p>
        </div>
        <a
          routerLink="/admin/tournaments"
          class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist hover:border-arena-gold"
        >
          Tournaments
        </a>
      </div>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <section class="mt-6 rounded-3xl border border-arena-line bg-arena-navy/80 p-5">
        <h2 class="font-display text-lg text-white">
          {{ editingId() ? 'Edit board' : 'New custom board' }}
        </h2>

        <label class="mt-4 block">
          <span class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">Board name</span>
          <input
            class="mt-2 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 text-white"
            name="boardName"
            type="text"
            placeholder="e.g. Festival board"
            [(ngModel)]="boardName"
            autocomplete="off"
          />
        </label>

        <div class="mt-4">
          <arena-snakes-layout-editor
            [layout]="layout"
            [compact]="true"
            (layoutChange)="layout = $event"
          />
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink disabled:opacity-50"
            [disabled]="saving()"
            (click)="save()"
          >
            {{ saving() ? 'Saving…' : editingId() ? 'Save changes' : 'Create board' }}
          </button>
          @if (editingId()) {
            <button
              type="button"
              class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist"
              (click)="cancelEdit()"
            >
              Cancel
            </button>
          } @else {
            <button
              type="button"
              class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist"
              (click)="resetForm()"
            >
              Reset
            </button>
          }
        </div>
      </section>

      <section class="mt-8">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-arena-gold">Library</p>
            <h2 class="mt-1 font-display text-xl text-white">Saved boards</h2>
          </div>
          <p class="text-sm text-arena-mist/50">{{ boards().length }} saved</p>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (board of boards(); track board.id) {
            <article
              class="flex flex-col overflow-hidden rounded-3xl border border-arena-line bg-arena-navy/80"
              [class.border-arena-gold]="editingId() === board.id"
            >
              <div class="p-4 pb-2">
                <h3 class="font-display text-lg text-white">{{ board.name }}</h3>
                <p class="mt-1 text-xs text-arena-mist/50">
                  {{ board.layout.snakes.length }} snakes · {{ board.layout.ladders.length }} ladders
                </p>
              </div>
              <div class="px-4">
                <arena-snakes-board [layout]="board.layout" [compact]="true" />
              </div>
              <div class="mt-auto flex flex-wrap gap-2 p-4 pt-3">
                <button
                  type="button"
                  class="rounded-full bg-arena-gold px-3 py-1.5 text-xs font-semibold text-arena-ink"
                  (click)="edit(board)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded-full border border-piece-red px-3 py-1.5 text-xs text-piece-red"
                  (click)="remove(board)"
                >
                  Delete
                </button>
              </div>
            </article>
          } @empty {
            <p
              class="col-span-full rounded-3xl border border-dashed border-arena-line px-4 py-10 text-center text-sm text-arena-mist/60"
            >
              No custom boards yet. Name one above, place snakes and ladders, then Create board.
            </p>
          }
        </div>
      </section>
    </div>
  `,
})
export class AdminSnakesBoardsPage implements OnInit {
  private readonly api = inject(ArenaApiService);

  readonly boards = signal<SnakesCustomBoardDto[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  boardName = '';
  layout: SnakesBoardLayout = emptySnakesLayout();

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  edit(board: SnakesCustomBoardDto): void {
    this.editingId.set(board.id);
    this.boardName = board.name;
    this.layout = cloneSnakesLayout(board.layout);
    this.error.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingId.set(null);
    this.boardName = '';
    this.layout = emptySnakesLayout();
    this.error.set(null);
  }

  async save(): Promise<void> {
    const name = this.boardName.trim();
    if (!name) {
      this.error.set('Enter a board name.');
      return;
    }
    const layoutError = validateSnakesLayout(this.layout);
    if (layoutError) {
      this.error.set(layoutError);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.api.updateSnakesBoard(editingId, name, this.layout);
      } else {
        await this.api.createSnakesBoard(name, this.layout);
      }
      await this.refresh();
      this.resetForm();
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(board: SnakesCustomBoardDto): Promise<void> {
    if (!window.confirm(`Delete custom board “${board.name}”?`)) {
      return;
    }
    this.error.set(null);
    try {
      await this.api.deleteSnakesBoard(board.id);
      if (this.editingId() === board.id) {
        this.resetForm();
      }
      await this.refresh();
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }

  private async refresh(): Promise<void> {
    this.error.set(null);
    try {
      this.boards.set(await this.api.snakesBoards());
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }
}
