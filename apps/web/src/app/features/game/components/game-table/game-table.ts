import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BoardCoordinate, GameState, PlayerColor } from '@ludo-game/shared-types';
import { DiceUiState } from '../../models/dice';
import { LudoBoardComponent } from '../ludo-board/ludo-board';
import { PlayerPanelComponent } from '../player-panel/player-panel';
import { DiceComponent } from '../dice/dice';
import { TurnIndicatorComponent } from '../turn-indicator/turn-indicator';

@Component({
  selector: 'ludo-game-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LudoBoardComponent, PlayerPanelComponent, DiceComponent, TurnIndicatorComponent],
  template: `
    <div class="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] lg:items-center">
      <div class="space-y-4">
        @if (playerOf(PlayerColor.GREEN); as green) {
          <ludo-player-panel
            [player]="green"
            [active]="isActive(green.id)"
            [validPieceIds]="validFor(green.id)"
            [hiddenPieceId]="movingPieceId()"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        }
        @if (playerOf(PlayerColor.RED); as red) {
          <ludo-player-panel
            [player]="red"
            [active]="isActive(red.id)"
            [validPieceIds]="validFor(red.id)"
            [hiddenPieceId]="movingPieceId()"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        }
      </div>

      <div class="flex flex-col items-center gap-4">
        <ludo-board
          [state]="state()"
          [displayCoords]="displayCoords()"
          [interactive]="interactive() && !movingPieceId()"
          [highlightValid]="highlightValid()"
          [movingPieceId]="movingPieceId()"
          [hopTick]="hopTick()"
          (pieceSelect)="pieceSelect.emit($event)"
        />
      </div>

      <div class="space-y-4">
        @if (playerOf(PlayerColor.YELLOW); as yellow) {
          <ludo-player-panel
            [player]="yellow"
            [active]="isActive(yellow.id)"
            [validPieceIds]="validFor(yellow.id)"
            [hiddenPieceId]="movingPieceId()"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        }
        @if (playerOf(PlayerColor.BLUE); as blue) {
          <ludo-player-panel
            [player]="blue"
            [active]="isActive(blue.id)"
            [validPieceIds]="validFor(blue.id)"
            [hiddenPieceId]="movingPieceId()"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        }
      </div>
    </div>

    <footer class="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <ludo-turn-indicator [player]="currentPlayer()" [phase]="state().turnPhase" />
      <ludo-dice
        [value]="state().dice.value"
        [state]="diceUi()"
        [canRoll]="canRoll()"
        (roll)="roll.emit()"
      />
      <div class="rounded-2xl border border-arena-line bg-arena-navy/70 px-4 py-3 text-sm text-arena-mist/70">
        <p>Turn {{ state().turnNumber }} · version {{ state().version }}</p>
        <p class="mt-1">{{ lastEvent() || 'Roll a 6 to leave the yard.' }}</p>
        @if (errorMessage(); as error) {
          <p class="mt-2 text-piece-red">{{ error }}</p>
        }
      </div>
    </footer>
  `,
})
export class GameTableComponent {
  readonly PlayerColor = PlayerColor;
  readonly state = input.required<GameState>();
  readonly displayCoords = input<Record<string, BoardCoordinate>>({});
  readonly interactive = input(false);
  readonly highlightValid = input(true);
  readonly movingPieceId = input<string | null>(null);
  readonly hopTick = input(0);
  readonly diceUi = input<DiceUiState>('WAITING');
  readonly canRoll = input(false);
  readonly lastEvent = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly pieceSelect = output<string>();
  readonly roll = output<void>();

  readonly currentPlayer = computed(
    () => this.state().players.find((player) => player.id === this.state().currentPlayerId) ?? null
  );

  playerOf(color: PlayerColor) {
    return this.state().players.find((player) => player.color === color) ?? null;
  }

  isActive(playerId: string): boolean {
    return this.state().currentPlayerId === playerId;
  }

  validFor(playerId: string): string[] {
    if (!this.highlightValid() || this.state().currentPlayerId !== playerId) {
      return [];
    }
    return this.state().validPieceIds;
  }
}
