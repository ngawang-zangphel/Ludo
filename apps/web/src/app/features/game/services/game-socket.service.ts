import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BoardCoordinate,
  BroadcastMatchChangedPayload,
  DiceRolledPayload,
  GameState,
  MatchErrorPayload,
  MatchFinishedPayload,
  MatchStatePayload,
  MatchStatus,
  MatchStatusPayload,
  PieceMovedPayload,
  PieceMoveAnimation,
  TurnPhase,
} from '@ludo-game/shared-types';
import { getPieceCoordinate } from '@ludo-game/game-engine';
import { SocketService } from '../../../core/socket/socket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { DiceUiState } from '../models/dice';

export type GameAttachMode = 'player' | 'spectator' | 'broadcast';

@Injectable()
export class GameSocketService {
  private readonly sockets = inject(SocketService);
  private readonly auth = inject(AuthService);
  private unsubs: Array<() => void> = [];
  private mode: GameAttachMode = 'player';

  readonly matchId = signal<string | null>(null);
  readonly state = signal<GameState | null>(null);
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
  readonly displayCoords = signal<Record<string, BoardCoordinate>>({});
  readonly errorMessage = signal<string | null>(null);
  readonly lastEvent = signal<string | null>(null);
  readonly status = signal<MatchStatus | null>(null);

  readonly currentPlayer = computed(() => {
    const match = this.state();
    return match?.players.find((player) => player.id === match.currentPlayerId) ?? null;
  });

  readonly me = computed(() => {
    const userId = this.auth.user()?.id;
    return this.state()?.players.find((player) => player.id === userId) ?? null;
  });

  readonly isMyTurn = computed(() => this.currentPlayer()?.id === this.auth.user()?.id);

  readonly canRoll = computed(() => {
    const match = this.state();
    return (
      !!match &&
      match.status === MatchStatus.LIVE &&
      match.turnPhase === TurnPhase.WAITING_FOR_ROLL &&
      this.isMyTurn() &&
      !this.animating() &&
      this.diceUi() !== 'ROLLING'
    );
  });

  readonly winner = computed(() => {
    const match = this.state();
    const winnerId = match?.rankings[0];
    return match?.players.find((player) => player.id === winnerId) ?? null;
  });

  attach(matchId: string | null, mode: GameAttachMode = 'player'): void {
    this.detach();
    this.mode = mode;
    this.matchId.set(matchId);
    const socket = this.sockets.connect();

    this.listen('match-state', (payload: MatchStatePayload) => {
      if (payload.matchId === this.matchId()) {
        this.applyState(payload.state);
      }
    });
    this.listen('match-state-updated', (payload: MatchStatePayload) => {
      if (payload.matchId === this.matchId()) {
        this.applyState(payload.state);
      }
    });
    this.listen('dice-rolled', (payload: DiceRolledPayload) => {
      if (payload.matchId !== this.matchId()) {
        return;
      }
      this.applyState(payload.state);
      this.diceUi.set('RESULT');
      this.lastEvent.set(`Dice ${payload.value}`);
    });
    this.listen('piece-moved', (payload: PieceMovedPayload) => {
      void this.onPieceMoved(payload);
    });
    this.listen('match-error', (payload: MatchErrorPayload) => {
      this.diceUi.set('WAITING');
      this.errorMessage.set(payload.message);
    });
    this.listen('match-started', (payload: MatchStatusPayload) => {
      if (payload.matchId === this.matchId()) {
        this.status.set(payload.status);
      }
    });
    this.listen('match-paused', (payload: MatchStatusPayload) => {
      if (payload.matchId === this.matchId()) {
        this.status.set(payload.status);
      }
    });
    this.listen('match-resumed', (payload: MatchStatusPayload) => {
      if (payload.matchId === this.matchId()) {
        this.status.set(payload.status);
      }
    });
    this.listen('match-finished', (payload: MatchFinishedPayload) => {
      if (payload.matchId === this.matchId()) {
        this.applyState(payload.state);
        this.status.set(payload.state.status);
      }
    });
    this.listen('broadcast-match-changed', (payload: BroadcastMatchChangedPayload) => {
      if (this.mode !== 'broadcast') {
        return;
      }
      this.matchId.set(payload.matchId);
      if (!payload.matchId) {
        this.state.set(null);
        this.status.set(null);
      }
    });

    if (mode === 'broadcast') {
      socket.emit('join-broadcast');
    } else if (matchId) {
      socket.emit('join-match', { matchId });
      socket.emit('reconnect-match', { matchId });
    }
  }

  seed(state: GameState | null): void {
    if (state) {
      this.applyState(state);
    }
  }

  detach(): void {
    const socket = this.sockets.client;
    const matchId = this.matchId();
    if (this.mode === 'broadcast') {
      socket.emit('leave-broadcast');
    } else if (matchId) {
      socket.emit('leave-match', { matchId });
    }
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs = [];
    this.matchId.set(null);
    this.state.set(null);
    this.errorMessage.set(null);
  }

  roll(): void {
    const matchId = this.matchId();
    if (!matchId || !this.canRoll()) {
      return;
    }
    this.errorMessage.set(null);
    this.diceUi.set('ROLLING');
    this.sockets.client.emit('roll-dice', { matchId });
  }

  move(pieceId: string): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !this.isMyTurn() || !match.validPieceIds.includes(pieceId)) {
      return;
    }
    this.sockets.client.emit('move-piece', { matchId, pieceId });
  }

  private listen<T>(event: string, handler: (payload: T) => void): void {
    const socket = this.sockets.client;
    const wrapped = handler as (payload: unknown) => void;
    socket.on(event, wrapped);
    this.unsubs.push(() => socket.off(event, wrapped));
  }

  private async onPieceMoved(payload: PieceMovedPayload): Promise<void> {
    if (payload.matchId !== this.matchId()) {
      return;
    }
    if (payload.animation) {
      await this.playAnimation(payload.animation);
    }
    this.applyState(payload.state);
    this.diceUi.set('WAITING');
    this.lastEvent.set(payload.events.map((event) => event.type).join(' → '));
  }

  private applyState(state: GameState): void {
    this.state.set(state);
    this.status.set(state.status);
    this.syncDisplay(state);
  }

  private async playAnimation(animation: PieceMoveAnimation): Promise<void> {
    this.animating.set(true);
    for (const step of animation.steps) {
      this.displayCoords.update((current) => ({ ...current, [animation.pieceId]: step }));
      await delay(160);
    }
    this.animating.set(false);
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
