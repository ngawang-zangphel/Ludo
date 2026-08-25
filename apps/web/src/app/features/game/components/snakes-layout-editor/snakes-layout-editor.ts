import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  applySnakesBoardClick,
  emptySnakesLayout,
  SnakesBoardLayout,
  SnakesEditorTool,
} from '@ludo-game/shared-types';
import { SnakesBoardComponent } from '../snakes-board/snakes-board';

@Component({
  selector: 'arena-snakes-layout-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnakesBoardComponent],
  template: `
    <div class="space-y-3">
      <div class="flex flex-wrap gap-2">
        @for (option of tools; track option.id) {
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-sm"
            [class.bg-arena-gold]="tool() === option.id"
            [class.text-arena-ink]="tool() === option.id"
            [class.border]="tool() !== option.id"
            [class.border-arena-line]="tool() !== option.id"
            (click)="setTool(option.id)"
          >
            {{ option.label }}
          </button>
        }
        <button
          type="button"
          class="rounded-full border border-arena-line px-3 py-1.5 text-sm text-arena-mist/80 hover:border-arena-gold hover:text-arena-gold"
          (click)="clearBoard()"
        >
          Clear board
        </button>
      </div>
      <p class="text-sm" [class.text-piece-red]="error()" [class.text-arena-mist/70]="!error()">
        {{ error() || hint() }}
      </p>
      @if (showBoard()) {
        <arena-snakes-board
          [layout]="layout()"
          [editable]="true"
          [compact]="compact()"
          [pendingSquare]="pendingFrom()"
          (squareSelect)="applySquare($event)"
        />
      }
    </div>
  `,
})
export class SnakesLayoutEditorComponent {
  readonly layout = input.required<SnakesBoardLayout>();
  readonly showBoard = input(true);
  readonly compact = input(false);
  readonly layoutChange = output<SnakesBoardLayout>();
  readonly tool = signal<SnakesEditorTool>('snake');
  readonly pendingFrom = signal<number | null>(null);
  readonly hint = signal('Click a snake head, then its tail.');
  readonly error = signal<string | null>(null);
  readonly tools: Array<{ id: SnakesEditorTool; label: string; hint: string }> = [
    { id: 'snake', label: 'Place snake', hint: 'Click the snake head, then its tail (a lower square).' },
    { id: 'ladder', label: 'Place ladder', hint: 'Click the ladder bottom, then the top (a higher square).' },
    { id: 'erase', label: 'Erase', hint: 'Click a snake or ladder to remove it.' },
  ];

  setTool(tool: SnakesEditorTool): void {
    this.tool.set(tool);
    this.pendingFrom.set(null);
    this.error.set(null);
    this.hint.set(this.tools.find((item) => item.id === tool)?.hint ?? '');
  }

  clearBoard(): void {
    this.pendingFrom.set(null);
    this.error.set(null);
    this.hint.set('Board cleared. Place snakes and ladders.');
    this.layoutChange.emit(emptySnakesLayout());
  }

  applySquare(square: number): void {
    const result = applySnakesBoardClick(this.layout(), square, this.tool(), this.pendingFrom());
    this.pendingFrom.set(result.pendingFrom);
    this.error.set(result.error);
    if (result.message) {
      this.hint.set(result.message);
    }
    if (result.layout !== this.layout()) {
      this.layoutChange.emit(result.layout);
    }
  }
}
