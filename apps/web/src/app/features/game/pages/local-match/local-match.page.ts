import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameType, SnakesLevelId } from '@ludo-game/shared-types';
import { LocalMatchService } from '../../services/local-match.service';
import { GameTableComponent } from '../../components/game-table/game-table';
import { SnakesLayoutEditorComponent } from '../../components/snakes-layout-editor/snakes-layout-editor';
import { SnakesPresetPickerComponent } from '../../components/snakes-preset-picker/snakes-preset-picker';

@Component({
  selector: 'ludo-local-match-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LocalMatchService],
  imports: [GameTableComponent, RouterLink, SnakesLayoutEditorComponent, SnakesPresetPickerComponent],
  template: `
    <div class="min-h-screen px-4 py-6 lg:px-8">
      <header class="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Hot-seat · offline engine</p>
          <h1 class="font-display text-3xl font-bold text-white md:text-4xl">Hot-seat arena</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm"
            [class.bg-arena-gold]="match.gameType() === GameType.LUDO"
            [class.text-arena-ink]="match.gameType() === GameType.LUDO"
            [class.border]="match.gameType() !== GameType.LUDO"
            [class.border-arena-line]="match.gameType() !== GameType.LUDO"
            (click)="match.setGameType(GameType.LUDO)"
          >
            Ludo
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm"
            [class.bg-arena-gold]="match.gameType() === GameType.SNAKES"
            [class.text-arena-ink]="match.gameType() === GameType.SNAKES"
            [class.border]="match.gameType() !== GameType.SNAKES"
            [class.border-arena-line]="match.gameType() !== GameType.SNAKES"
            (click)="match.setGameType(GameType.SNAKES)"
          >
            Snakes & Ladders
          </button>
          <a routerLink="/" class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist">
            Lobby
          </a>
          <button
            type="button"
            class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist hover:border-arena-gold"
            (click)="match.newMatch()"
          >
            New match
          </button>
        </div>
      </header>

      @if (match.gameType() === GameType.SNAKES) {
        <div class="mx-auto mb-5 max-w-7xl space-y-3">
          <arena-snakes-preset-picker
            [value]="match.snakesLevelId()"
            (valueChange)="match.setSnakesLevel($event)"
          />
          @if (match.snakesLevelId() === SnakesLevelId.CUSTOM) {
            <arena-snakes-layout-editor
              [layout]="match.customLayout()"
              [showBoard]="false"
              (layoutChange)="match.setCustomLayout($event)"
            />
          }
        </div>
      }

      <ludo-game-table
        [state]="match.state()"
        [displayCoords]="match.displayCoords()"
        [interactive]="!match.animating()"
        [highlightValid]="true"
        [movingPieceId]="match.movingPieceId()"
        [hopTick]="match.hopTick()"
        [diceUi]="match.diceUi()"
        [canRoll]="match.canRoll()"
        [lastEvent]="match.lastEvent()"
        [errorMessage]="match.errorMessage()"
        [editable]="match.gameType() === GameType.SNAKES && match.snakesLevelId() === SnakesLevelId.CUSTOM"
        [pendingSquare]="editor()?.pendingFrom() ?? null"
        (pieceSelect)="match.move($event)"
        (roll)="match.roll()"
        (squareSelect)="editor()?.applySquare($event)"
      />

      @if (match.winner(); as winner) {
        <div class="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
          <div class="rounded-full bg-arena-gold px-6 py-3 font-display text-lg font-semibold text-arena-ink shadow-2xl">
            {{ winner.name }} wins the arena
          </div>
        </div>
      }
    </div>
  `,
})
export class LocalMatchPage {
  readonly match = inject(LocalMatchService);
  readonly GameType = GameType;
  readonly SnakesLevelId = SnakesLevelId;
  readonly editor = viewChild(SnakesLayoutEditorComponent);
}
