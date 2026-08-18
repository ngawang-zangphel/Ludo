import { Injectable, computed, signal } from '@angular/core';
import {
  BoardCoordinate,
  GameEngineError,
  GameState,
  TurnPhase,
} from '@ludo-game/shared-types';
import {
  applyDiceRoll,
  applyMove,
  createLocalDemoMatch,
  getPieceCoordinate,
} from '@ludo-game/game-engine';
import { DiceUiState } from '../models/dice';

@Injectable()
export class LocalMatchService {
  readonly state = signal<GameState>(createLocalDemoMatch());
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
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

  newMatch(): void {
    const next = createLocalDemoMatch();
    this.state.set(next);
    this.diceUi.set('WAITING');
    this.animating.set(false);
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
      const result = applyDiceRoll(this.state(), this.state().currentPlayerId);
      const wait = Math.max(0, 650 - (Date.now() - startedAt));
      await delay(wait);
      this.state.set(result.state);
      this.diceUi.set('RESULT');
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));
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
      const result = applyMove(this.state(), {
        playerId: this.state().currentPlayerId,
        pieceId,
      });

      if (result.animation && result.animation.steps.length > 0) {
        this.animating.set(true);
        await this.playAnimation(result.animation.pieceId, result.animation.steps);
      }

      this.state.set(result.state);
      this.syncDisplay(result.state);
      this.animating.set(false);
      this.diceUi.set('WAITING');
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));
    } catch (error) {
      this.animating.set(false);
      this.errorMessage.set(toMessage(error));
    }
  }

  private async playAnimation(pieceId: string, steps: BoardCoordinate[]): Promise<void> {
    for (const step of steps) {
      this.displayCoords.update((current) => ({ ...current, [pieceId]: step }));
      await delay(170);
    }
  }

  private syncDisplay(state: GameState): void {
    const coords: Record<string, BoardCoordinate> = {};
    for (const player of state.players) {
      for (const piece of player.pieces) {
        coords[piece.id] = getPieceCoordinate(player.color, piece.state, piece.position);
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
