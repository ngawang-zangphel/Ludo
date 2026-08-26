import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  BoardCoordinate,
  DICE_AUTO_ROLL_MS,
  GameState,
  isLudoState,
  isMarriageState,
  isSnakesState,
  LudoGameState,
  LudoPlayer,
  MatchStatus,
  PlayerColor,
  SnakesGameState,
  SnakesPlayer,
  TurnPhase,
} from '@ludo-game/shared-types';
import { DiceUiState } from '../../models/dice';
import { LudoBoardComponent } from '../ludo-board/ludo-board';
import { PlayerPanelComponent } from '../player-panel/player-panel';
import { DiceComponent } from '../dice/dice';
import { TurnIndicatorComponent } from '../turn-indicator/turn-indicator';
import { SnakesBoardComponent } from '../snakes-board/snakes-board';
import { SnakesPlayerPanelComponent } from '../snakes-player-panel/snakes-player-panel';

@Component({
  selector: 'ludo-game-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LudoBoardComponent,
    PlayerPanelComponent,
    DiceComponent,
    TurnIndicatorComponent,
    SnakesBoardComponent,
    SnakesPlayerPanelComponent,
  ],
  template: `
    @if (ludo(); as ludo) {
      <div class="arena-table ludo-table">
        <div class="ludo-table-green">
          @if (ludoPlayer(ludo, PlayerColor.GREEN); as green) {
            <ludo-player-panel
              [player]="green"
              [active]="isActive(green.id)"
              [align]="'start'"
              [diceValue]="state().dice.value"
              [diceUi]="diceUi()"
              [canRoll]="canRoll()"
              [rollDeadlineAt]="rollDeadlineAt()"
              (roll)="roll.emit()"
            />
          }
        </div>
        <div class="ludo-table-red">
          @if (ludoPlayer(ludo, PlayerColor.RED); as red) {
            <ludo-player-panel
              [player]="red"
              [active]="isActive(red.id)"
              [align]="'start'"
              [diceValue]="state().dice.value"
              [diceUi]="diceUi()"
              [canRoll]="canRoll()"
              [rollDeadlineAt]="rollDeadlineAt()"
              (roll)="roll.emit()"
            />
          }
        </div>
        <div class="ludo-table-board">
          <ludo-board
            [state]="ludo"
            [displayCoords]="displayCoords()"
            [interactive]="interactive() && !movingPieceId()"
            [highlightValid]="highlightValid()"
            [movingPieceId]="movingPieceId()"
            [hopTick]="hopTick()"
            (pieceSelect)="pieceSelect.emit($event)"
          />
        </div>
        <div class="ludo-table-yellow">
          @if (ludoPlayer(ludo, PlayerColor.YELLOW); as yellow) {
            <ludo-player-panel
              [player]="yellow"
              [active]="isActive(yellow.id)"
              [align]="'end'"
              [diceValue]="state().dice.value"
              [diceUi]="diceUi()"
              [canRoll]="canRoll()"
              [rollDeadlineAt]="rollDeadlineAt()"
              (roll)="roll.emit()"
            />
          }
        </div>
        <div class="ludo-table-blue">
          @if (ludoPlayer(ludo, PlayerColor.BLUE); as blue) {
            <ludo-player-panel
              [player]="blue"
              [active]="isActive(blue.id)"
              [align]="'end'"
              [diceValue]="state().dice.value"
              [diceUi]="diceUi()"
              [canRoll]="canRoll()"
              [rollDeadlineAt]="rollDeadlineAt()"
              (roll)="roll.emit()"
            />
          }
        </div>
      </div>
    } @else if (snakes(); as snakes) {
      <div class="arena-table ludo-table">
        <div class="ludo-table-green">
          @if (snakesPlayer(snakes, PlayerColor.GREEN); as green) {
            <arena-snakes-player-panel
              [player]="green"
              [active]="isActive(green.id)"
              [align]="'start'"
            />
          }
        </div>
        <div class="ludo-table-red">
          @if (snakesPlayer(snakes, PlayerColor.RED); as red) {
            <arena-snakes-player-panel
              [player]="red"
              [active]="isActive(red.id)"
              [align]="'start'"
            />
          }
        </div>
        <div class="ludo-table-board">
          <arena-snakes-board
            [state]="snakes"
            [displayCoords]="displayCoords()"
            [movingPieceId]="movingPieceId()"
            [hopTick]="hopTick()"
            [editable]="editable()"
            [pendingSquare]="pendingSquare()"
            (squareSelect)="squareSelect.emit($event)"
          />
        </div>
        <div class="ludo-table-yellow">
          @if (snakesPlayer(snakes, PlayerColor.YELLOW); as yellow) {
            <arena-snakes-player-panel
              [player]="yellow"
              [active]="isActive(yellow.id)"
              [align]="'end'"
            />
          }
        </div>
        <div class="ludo-table-blue">
          @if (snakesPlayer(snakes, PlayerColor.BLUE); as blue) {
            <arena-snakes-player-panel
              [player]="blue"
              [active]="isActive(blue.id)"
              [align]="'end'"
            />
          }
        </div>
      </div>
    }

    <footer class="arena-hud mx-auto mt-3 grid max-w-4xl gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <ludo-turn-indicator
        [player]="currentPlayer()"
        [phase]="state().turnPhase"
        [hint]="snakes() ? 'Roll a 6 to leave GO, then race to 100' : 'Tap a highlighted piece'"
      />
      @if (snakes()) {
        <ludo-dice
          [value]="state().dice.value"
          [state]="diceUi()"
          [canRoll]="canRoll()"
          [rollDeadlineAt]="rollDeadlineAt()"
          (roll)="roll.emit()"
        />
      } @else {
        <button
          type="button"
          class="dice-roll-btn justify-self-center"
          [disabled]="!canRoll()"
          (click)="roll.emit()"
        >
          {{ canRoll() ? 'Roll dice' : 'Waiting' }}
        </button>
      }
      <div class="arena-event px-2 py-1 text-sm">
        <p class="text-[0.65rem] uppercase tracking-[0.22em] text-arena-gold/80">Turn {{ state().turnNumber }}</p>
        <p class="mt-1 font-display text-base leading-snug text-white">{{ lastEvent() || hint() }}</p>
        @if (errorMessage(); as error) {
          <p class="mt-1 text-sm text-piece-red">{{ error }}</p>
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
  readonly squareSelect = output<number>();
  readonly editable = input(false);
  readonly pendingSquare = input<number | null>(null);

  readonly ludo = computed<LudoGameState | null>(() => {
    const state = this.state();
    return isLudoState(state) ? state : null;
  });

  readonly snakes = computed<SnakesGameState | null>(() => {
    const state = this.state();
    return isSnakesState(state) ? state : null;
  });

  readonly currentPlayer = computed(() => {
    const state = this.state();
    if (isMarriageState(state)) {
      return null;
    }
    const player = state.players.find((entry) => entry.id === state.currentPlayerId);
    if (!player) {
      return null;
    }
    return { name: player.name, color: player.color };
  });

  /** Shared deadline; falls back so countdown still shows for older live turns. */
  readonly rollDeadlineAt = computed(() => {
    const state = this.state();
    if (state.rollDeadlineAt) {
      return state.rollDeadlineAt;
    }
    if (state.turnPhase !== TurnPhase.WAITING_FOR_ROLL || state.status !== MatchStatus.LIVE) {
      return null;
    }
    const started = Date.parse(state.updatedAt);
    if (Number.isNaN(started)) {
      return null;
    }
    return new Date(started + DICE_AUTO_ROLL_MS).toISOString();
  });

  readonly hint = computed(() =>
    this.snakes()
      ? 'Race to 100. Roll a 6 to leave GO.'
      : 'Roll a 6 to leave the yard.'
  );

  ludoPlayer(state: LudoGameState, color: PlayerColor): LudoPlayer | null {
    return state.players.find((player) => player.color === color) ?? null;
  }

  snakesPlayer(state: SnakesGameState, color: PlayerColor): SnakesPlayer | null {
    return state.players.find((player) => player.color === color) ?? null;
  }

  isActive(playerId: string): boolean {
    return this.state().currentPlayerId === playerId;
  }
}
