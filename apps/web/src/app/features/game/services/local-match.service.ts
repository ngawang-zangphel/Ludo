import { Injectable, computed, signal } from '@angular/core';
import {
  BoardCoordinate,
  GameEngineError,
  GameState,
  GameType,
  isSnakesState,
  TurnPhase,
} from '@ludo-game/shared-types';
import {
  applyDiceRoll,
  applyMove,
  applySnakesDiceRoll,
  applySnakesMove,
  createLocalDemoMatch,
  createLocalSnakesDemoMatch,
  getPieceCoordinate,
  getSnakesSquareCoordinate,
} from '@ludo-game/game-engine';
import { DiceUiState } from '../models/dice';
import { PIECE_STEP_MS } from '../models/motion';

@Injectable()
export class LocalMatchService {
  readonly gameType = signal<GameType>(GameType.LUDO);
  readonly state = signal<GameState>(createLocalDemoMatch());
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
  readonly movingPieceId = signal<string | null>(null);
  readonly hopTick = signal(0);
  readonly displayCoords = signal<Record<string, BoardCoordinate>>({});
  readonly errorMessage = signal<string | null>(null);
  readonly lastEvent = signal<string | null>(null);

  readonly currentPlayer = computed(() => {
    const match = this.state();
    return match.players.find((player) => player.id === match.currentPlayerId) ?? null;
  });

  readonly canRoll = computed(() => {
    const match = this.state();
    return (
      match.turnPhase === TurnPhase.WAITING_FOR_ROLL &&
      !this.animating() &&
      this.diceUi() !== 'ROLLING'
    );
  });

  readonly canMove = computed(() => {
    return this.state().turnPhase === TurnPhase.WAITING_FOR_MOVE && !this.animating();
  });

  readonly winner = computed(() => {
    const match = this.state();
    const winnerId = match.rankings[0];
    return match.players.find((player) => player.id === winnerId) ?? null;
  });

  constructor() {
    this.syncDisplay(this.state());
  }

  setGameType(type: GameType): void {
    this.gameType.set(type);
    this.newMatch();
  }

  newMatch(): void {
    const next =
      this.gameType() === GameType.SNAKES ? createLocalSnakesDemoMatch() : createLocalDemoMatch();
    this.state.set(next);
    this.diceUi.set('WAITING');
    this.animating.set(false);
    this.movingPieceId.set(null);
    this.hopTick.set(0);
    this.errorMessage.set(null);
    this.lastEvent.set('New hot-seat match started.');
    this.syncDisplay(next);
  }

  async roll(): Promise<void> {
    if (!this.canRoll()) {
      return;
    }

    this.errorMessage.set(null);
    this.diceUi.set('ROLLING');
    const startedAt = Date.now();

    try {
      const current = this.state();
      const result = isSnakesState(current)
        ? applySnakesDiceRoll(current, current.currentPlayerId)
        : applyDiceRoll(current, current.currentPlayerId);
      const wait = Math.max(0, 650 - (Date.now() - startedAt));
      await delay(wait);
      this.state.set(result.state);
      this.diceUi.set('RESULT');
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));
      const tokenId = result.validPieceIds[0];
      if (isSnakesState(result.state) && tokenId) {
        await this.move(tokenId);
      }
    } catch (error) {
      this.diceUi.set('WAITING');
      this.errorMessage.set(toMessage(error));
    }
  }

  async move(pieceId: string): Promise<void> {
    if (!this.canMove() || !this.state().validPieceIds.includes(pieceId)) {
      return;
    }

    this.errorMessage.set(null);
    try {
      const current = this.state();
      const result = isSnakesState(current)
        ? applySnakesMove(current, {
            playerId: current.currentPlayerId,
            pieceId,
          })
        : applyMove(current, {
            playerId: current.currentPlayerId,
            pieceId,
          });

      if (result.animation && result.animation.steps.length > 0) {
        this.animating.set(true);
        await this.playAnimation(result.animation.pieceId, result.animation.steps);
      }

      this.state.set(result.state);
      this.syncDisplay(result.state);
      this.animating.set(false);
      this.movingPieceId.set(null);
      this.diceUi.set('WAITING');
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));
    } catch (error) {
      this.animating.set(false);
      this.movingPieceId.set(null);
      this.errorMessage.set(toMessage(error));
    }
  }

  private async playAnimation(pieceId: string, steps: BoardCoordinate[]): Promise<void> {
    this.movingPieceId.set(pieceId);
    for (const step of steps) {
      this.hopTick.update((tick) => tick + 1);
      this.displayCoords.update((current) => ({ ...current, [pieceId]: step }));
      await delay(PIECE_STEP_MS);
    }
  }

  private syncDisplay(state: GameState): void {
    const coords: Record<string, BoardCoordinate> = {};
    if (isSnakesState(state)) {
      for (const player of state.players) {
        coords[player.tokenId] = getSnakesSquareCoordinate(player.position);
      }
    } else {
      for (const player of state.players) {
        for (const piece of player.pieces) {
          coords[piece.id] = getPieceCoordinate(player.color, piece.state, piece.position);
        }
      }
    }
    this.displayCoords.set(coords);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toMessage(error: unknown): string {
  if (error instanceof GameEngineError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}

function summarize(types: string[]): string {
  return types.join(' → ');
}
