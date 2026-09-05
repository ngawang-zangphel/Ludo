import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface MultiAutocompleteOption {
  id: string;
  label: string;
  hint?: string;
}

@Component({
  selector: 'ludo-multi-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  template: `
    <div class="relative" #root>
      <div
        class="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border bg-arena-ink px-2.5 py-1.5"
        [class.border-arena-gold]="open()"
        [class.border-arena-line]="!open()"
        (click)="focusInput()"
      >
        @for (item of selectedOptions(); track item.id) {
          <span
            class="inline-flex max-w-full items-center gap-1 rounded-full bg-arena-gold/15 px-2.5 py-0.5 text-sm text-arena-gold"
          >
            <span class="truncate">{{ item.label }}</span>
            <button
              type="button"
              class="grid h-4 w-4 place-items-center rounded-full text-arena-gold/80 hover:bg-arena-gold/20 hover:text-white"
              [attr.aria-label]="'Remove ' + item.label"
              (click)="remove(item.id, $event)"
            >
              ×
            </button>
          </span>
        }
        <input
          #queryInput
          class="min-w-28 flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-arena-mist/40"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="listId"
          [attr.placeholder]="selectedOptions().length ? '' : placeholder()"
          [disabled]="disabled()"
          [value]="query()"
          (input)="onQuery($event)"
          (focus)="openPanel()"
          (keydown)="onKeydown($event)"
        />
      </div>

      @if (open()) {
        <ul
          [id]="listId"
          role="listbox"
          class="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-arena-line bg-arena-navy py-1 shadow-2xl"
          (pointerdown)="$event.stopPropagation()"
        >
          @for (option of filtered(); track option.id; let i = $index) {
            <li role="option" [attr.aria-selected]="i === highlight()">
              <button
                type="button"
                class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm"
                [class.bg-white/10]="i === highlight()"
                [class.text-white]="i === highlight()"
                (click)="choose(option.id, $event)"
                (mouseenter)="highlight.set(i)"
              >
                <span>{{ option.label }}</span>
                @if (option.hint) {
                  <span class="truncate text-xs text-arena-mist/45">{{ option.hint }}</span>
                }
              </button>
            </li>
          } @empty {
            <li class="px-3 py-2 text-sm text-arena-mist/60">{{ emptyMessage() }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class MultiAutocompleteComponent {
  private static nextId = 0;

  readonly options = input.required<MultiAutocompleteOption[]>();
  readonly selectedIds = model<string[]>([]);
  readonly pickOne = input(false);
  readonly picked = output<string>();
  readonly placeholder = input('Search…');
  readonly emptyMessage = input('No matching players.');
  readonly maxSelected = input<number | null>(null);
  readonly disabled = input(false);

  readonly query = signal('');
  readonly open = signal(false);
  readonly highlight = signal(0);
  readonly listId = `ludo-multi-ac-${++MultiAutocompleteComponent.nextId}`;

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly queryInput = viewChild<ElementRef<HTMLInputElement>>('queryInput');

  readonly selectedOptions = computed(() => {
    const byId = new Map(this.options().map((option) => [option.id, option]));
    return this.selectedIds().flatMap((id) => {
      const option = byId.get(id);
      return option ? [option] : [];
    });
  });

  readonly filtered = computed(() => {
    const selected = new Set(this.selectedIds());
    const needle = this.query().trim().toLowerCase();
    return this.options().filter((option) => {
      if (selected.has(option.id)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        option.label.toLowerCase().includes(needle) ||
        (option.hint?.toLowerCase().includes(needle) ?? false)
      );
    });
  });

  onDocumentPointerDown(event: PointerEvent): void {
    const root = this.root()?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.highlight.set(0);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      return;
    }
    if (event.key === 'Backspace' && !this.query() && this.selectedIds().length) {
      this.remove(this.selectedIds().at(-1)!);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.openPanel();
      this.moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.openPanel();
      this.moveHighlight(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = this.filtered()[this.highlight()];
      if (option) {
        this.choose(option.id);
      }
    }
  }

  choose(id: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.pickOne()) {
      this.query.set('');
      this.highlight.set(0);
      this.open.set(false);
      this.picked.emit(id);
      return;
    }
    const max = this.maxSelected();
    if (this.selectedIds().includes(id)) {
      return;
    }
    if (max != null && this.selectedIds().length >= max) {
      return;
    }
    this.selectedIds.update((ids) => [...ids, id]);
    this.query.set('');
    this.highlight.set(0);
    this.open.set(true);
    this.focusInput();
  }

  remove(id: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedIds.update((ids) => ids.filter((item) => item !== id));
  }

  openPanel(): void {
    if (this.disabled()) {
      return;
    }
    this.open.set(true);
  }

  focusInput(): void {
    this.openPanel();
    this.queryInput()?.nativeElement.focus();
  }

  private moveHighlight(delta: number): void {
    const count = this.filtered().length;
    if (!count) {
      this.highlight.set(0);
      return;
    }
    this.highlight.update((index) => (index + delta + count) % count);
  }
}
