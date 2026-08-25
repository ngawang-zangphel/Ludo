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
      <div class="mx-auto grid max-w-7xl gap-2 lg:grid-cols-[minmax(160px,0.85fr)_auto_minmax(160px,0.85fr)] lg:items-center lg:gap-3">
        <div class="space-y-2">
          @if (ludoPlayer(ludo, PlayerColor.GREEN); as green) {
            <ludo-player-panel
              [player]="green"
              [active]="isActive(green.id)"
              [validPieceIds]="validFor(green.id)"
              [hiddenPieceId]="movingPieceId()"
              (pieceSelect)="pieceSelect.emit($event)"
            />
          }
          @if (ludoPlayer(ludo, PlayerColor.RED); as red) {
            <ludo-player-panel
              [player]="red"
              [active]="isActive(red.id)"
              [validPieceIds]="validFor(red.id)"
              [hiddenPieceId]="movingPieceId()"
              (pieceSelect)="pieceSelect.emit($event)"
            />
          }
        </div>

        <div class="flex flex-col items-center gap-2">
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

        <div class="space-y-2">
          @if (ludoPlayer(ludo, PlayerColor.YELLOW); as yellow) {
            <ludo-player-panel
              [player]="yellow"
              [active]="isActive(yellow.id)"
              [validPieceIds]="validFor(yellow.id)"
              [hiddenPieceId]="movingPieceId()"
              (pieceSelect)="pieceSelect.emit($event)"
            />
          }
          @if (ludoPlayer(ludo, PlayerColor.BLUE); as blue) {
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
    } @else if (snakes(); as snakes) {
      <div class="mx-auto grid max-w-7xl gap-2 lg:grid-cols-[minmax(160px,0.85fr)_auto_minmax(160px,0.85fr)] lg:items-center lg:gap-3">
        <div class="space-y-2">
          @if (snakesPlayer(snakes, PlayerColor.GREEN); as green) {
            <arena-snakes-player-panel [player]="green" [active]="isActive(green.id)" />
          }
          @if (snakesPlayer(snakes, PlayerColor.RED); as red) {
            <arena-snakes-player-panel [player]="red" [active]="isActive(red.id)" />
          }
        </div>
        <div class="flex flex-col items-center gap-2">
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
        <div class="space-y-2">
          @if (snakesPlayer(snakes, PlayerColor.YELLOW); as yellow) {
            <arena-snakes-player-panel [player]="yellow" [active]="isActive(yellow.id)" />
          }
          @if (snakesPlayer(snakes, PlayerColor.BLUE); as blue) {
            <arena-snakes-player-panel [player]="blue" [active]="isActive(blue.id)" />
          }
        </div>
      </div>
    }

    <footer class="mx-auto mt-2 grid max-w-4xl gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <ludo-turn-indicator
        [player]="currentPlayer()"
        [phase]="state().turnPhase"
        [hint]="snakes() ? 'Roll a 6 to enter, then race to 100' : 'Choose a highlighted piece'"
      />
      <ludo-dice
        [value]="state().dice.value"
        [state]="diceUi()"
        [canRoll]="canRoll()"
        [rollDeadlineAt]="rollDeadlineAt()"
        (roll)="roll.emit()"
      />
      <div class="rounded-xl border border-arena-line bg-arena-navy/70 px-3 py-2 text-xs text-arena-mist/70">
        <p>Turn {{ state().turnNumber }} · version {{ state().version }}</p>
        <p class="mt-0.5 line-clamp-2">{{ lastEvent() || hint() }}</p>
        @if (errorMessage(); as error) {
          <p class="mt-1 text-piece-red">{{ error }}</p>
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
      ? 'Race to 100. Roll a 6 to enter. Land on a player and they go back to 1.'
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

  validFor(playerId: string): string[] {
    if (!this.highlightValid() || this.state().currentPlayerId !== playerId) {
      return [];
    }
    return this.state().validPieceIds;
  }
}
