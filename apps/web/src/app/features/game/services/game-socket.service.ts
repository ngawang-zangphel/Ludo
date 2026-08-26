import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BoardCoordinate,
  BroadcastMatchChangedPayload,
  DiceRolledPayload,
  GameState,
  isLudoState,
  isMarriageState,
  isSnakesState,
  MarriageGameState,
  MatchErrorPayload,
  MatchFinishedPayload,
  MatchPlayerDto,
  MatchStatePayload,
  MatchStatus,
  MatchStatusPayload,
  PieceMovedPayload,
  PieceMoveAnimation,
  PlayerReadyPayload,
  TurnPhase,
} from '@ludo-game/shared-types';
import {
  getPieceCoordinate,
  getSnakesSquareCoordinate,
  marriageCanShow,
  marriageReadyToSeeMaal,
  marriageSuggestOpen,
  validateMaalMelds,
} from '@ludo-game/game-engine';
import { SocketService } from '../../../core/socket/socket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { DiceUiState } from '../models/dice';
import {
  MARRIAGE_DEAL_CARD_MS,
  MATCH_START_COUNTDOWN_FROM,
  MATCH_START_COUNTDOWN_TICK_MS,
  PIECE_STEP_MS,
} from '../models/motion';

export type GameAttachMode = 'player' | 'spectator' | 'broadcast';

/** Progressive deal reveal for Marriage start animation. */
export interface MarriageDealProgress {
  /** How many hand cards are visible for each player id. */
  revealedByPlayerId: Record<string, number>;
  /** Player currently receiving a flying card, if any. */
  flyingToPlayerId: string | null;
  /** When false, discard stays face-down / empty in the UI. */
  showDiscard: boolean;
  /** Extra cards still shown on the stock pile during the deal. */
  stockBonus: number;
}

@Injectable()
export class GameSocketService {
  private readonly sockets = inject(SocketService);
  private readonly auth = inject(AuthService);
  private unsubs: Array<() => void> = [];
  private mode: GameAttachMode = 'player';
  private introGeneration = 0;
  private maalEnsureRequestedFor: string | null = null;

  readonly matchId = signal<string | null>(null);
  readonly state = signal<GameState | null>(null);
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
  readonly movingPieceId = signal<string | null>(null);
  readonly hopTick = signal(0);
  readonly displayCoords = signal<Record<string, BoardCoordinate>>({});
  readonly errorMessage = signal<string | null>(null);
  readonly lastEvent = signal<string | null>(null);
  private errorClearTimer: ReturnType<typeof setTimeout> | null = null;
  readonly status = signal<MatchStatus | null>(null);
  readonly roster = signal<MatchPlayerDto[]>([]);
  readonly selectedCardId = signal<string | null>(null);
  /** 5…1 while the match-start countdown runs; null otherwise. */
  readonly startCountdown = signal<number | null>(null);
  /** True during countdown and Marriage deal animation. */
  readonly introBusy = signal(false);
  readonly marriageDeal = signal<MarriageDealProgress | null>(null);

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
    if (match && isMarriageState(match)) {
      return false;
    }
    return (
      !!match &&
      match.status === MatchStatus.LIVE &&
      match.turnPhase === TurnPhase.WAITING_FOR_ROLL &&
      this.isMyTurn() &&
      !this.me()?.eliminated &&
      !this.animating() &&
      !this.introBusy() &&
      this.diceUi() !== 'ROLLING'
    );
  });

  readonly marriageCanOpen = computed(() => {
    const match = this.state();
    const userId = this.auth.user()?.id;
    if (!match || !userId || !isMarriageState(match) || !this.isMyTurn()) {
      return false;
    }
    const me = match.players.find((player) => player.id === userId);
    // Open only after three valid melds are parked in the maal sequences tray.
    if (
      !me ||
      !validateMaalMelds(
        (me.maalSequences ?? []).filter((ids) => ids.length > 0),
        me.hand,
        null
      )
    ) {
      return false;
    }
    return marriageSuggestOpen(match, userId) != null;
  });

  readonly marriageCanShowWin = computed(() => {
    const match = this.state();
    const userId = this.auth.user()?.id;
    if (!match || !userId || !isMarriageState(match) || !this.isMyTurn()) {
      return false;
    }
    return marriageCanShow(match, userId) != null;
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
      if (this.diceUi() === 'ROLLING') {
        this.diceUi.set('WAITING');
      }
      // Benign when client and server both fire auto-roll at the deadline.
      if (/already been rolled/i.test(payload.message)) {
        return;
      }
      this.flashError(payload.message);
    });
    this.listen('match-started', (payload: MatchStatusPayload) => {
      if (payload.matchId === this.matchId()) {
        this.status.set(payload.status);
        void this.runMatchStartIntro();
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
    this.listen('player-ready', (payload: PlayerReadyPayload) => {
      if (payload.matchId === this.matchId()) {
        this.roster.set(payload.players);
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

  seedRoster(players: MatchPlayerDto[]): void {
    this.roster.set(players);
  }

  /** Show a short-lived error snackbar message. */
  flashError(message: string): void {
    this.errorMessage.set(message);
    if (this.errorClearTimer) {
      clearTimeout(this.errorClearTimer);
    }
    this.errorClearTimer = setTimeout(() => {
      this.errorMessage.set(null);
      this.errorClearTimer = null;
    }, 4000);
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
    if (this.errorClearTimer) {
      clearTimeout(this.errorClearTimer);
      this.errorClearTimer = null;
    }
    this.matchId.set(null);
    this.state.set(null);
    this.roster.set([]);
    this.errorMessage.set(null);
    this.selectedCardId.set(null);
    this.animating.set(false);
    this.movingPieceId.set(null);
    this.hopTick.set(0);
    this.introGeneration += 1;
    this.startCountdown.set(null);
    this.introBusy.set(false);
    this.marriageDeal.set(null);
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
    if (!matchId || !match || this.animating() || this.introBusy() || !this.isMyTurn() || !match.validPieceIds.includes(pieceId)) {
      return;
    }
    this.sockets.client.emit('move-piece', { matchId, pieceId });
  }

  selectCard(cardId: string | null): void {
    this.selectedCardId.set(cardId);
  }

  marriageDraw(source: 'stock' | 'discard'): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-draw', { matchId, source });
  }

  marriageDiscard(cardId: string): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-discard', { matchId, cardId });
    this.selectedCardId.set(null);
  }

  marriageOpen(): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-open', { matchId });
  }

  marriageShow(): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-show', { matchId });
    this.selectedCardId.set(null);
  }

  marriageReorder(layout: {
    freeCardIds: string[];
    holdCardIds: string[];
    maalSequences: string[][];
  }): void {
    const matchId = this.matchId();
    const match = this.state();
    const userId = this.auth.user()?.id;
    if (!matchId || !match || !userId || !isMarriageState(match)) {
      return;
    }
    const me = match.players.find((player) => player.id === userId);
    if (!me) {
      return;
    }
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    const orderedIds = [
      ...layout.freeCardIds,
      ...layout.holdCardIds,
      ...layout.maalSequences.flat(),
    ];
    const hand = orderedIds
      .map((id) => byId.get(id))
      .filter((card): card is NonNullable<typeof card> => !!card);
    if (hand.length !== me.hand.length) {
      return;
    }
    this.state.set({
      ...match,
      players: match.players.map((player) =>
        player.id === userId
          ? {
              ...player,
              hand,
              holdCardIds: layout.holdCardIds,
              maalSequences: layout.maalSequences,
            }
          : player
      ),
    });
    this.sockets.client.emit('marriage-reorder', { matchId, ...layout });
    // Parking three pure opens should reveal maal (server confirms on reorder / ensure).
    if (layout.maalSequences.length === 3) {
      this.maalEnsureRequestedFor = null;
      const next = this.state();
      if (next) {
        this.maybeRequestMaalReveal(next);
      }
    }
  }

  marriageExtendMeld(cardId: string, meldIndex: number): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-extend-meld', { matchId, cardId, meldIndex });
    this.selectedCardId.set(null);
  }

  marriageJoinMelds(meldIndexA: number, meldIndexB: number): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-join-melds', { matchId, meldIndexA, meldIndexB });
  }

  marriageRemoveMeldCard(cardId: string, meldIndex: number): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-remove-meld-card', { matchId, cardId, meldIndex });
  }

  marriageAddMeld(cardIds: string[]): void {
    const matchId = this.matchId();
    const match = this.state();
    if (!matchId || !match || !isMarriageState(match) || !this.isMyTurn() || this.introBusy()) {
      return;
    }
    this.errorMessage.set(null);
    this.sockets.client.emit('marriage-add-meld', { matchId, cardIds });
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
    if (this.introBusy() && isMarriageState(state) && !this.marriageDeal()) {
      const stockBonus =
        state.players.reduce((sum, player) => sum + player.hand.length, 0) + state.discard.length;
      this.marriageDeal.set({
        revealedByPlayerId: Object.fromEntries(state.players.map((player) => [player.id, 0])),
        flyingToPlayerId: null,
        showDiscard: false,
        stockBonus,
      });
    }
    if (!this.animating()) {
      this.syncDisplay(state);
    }
    this.maybeRequestMaalReveal(state);
  }

  /** If you parked three opens and maal is still hidden, ask the server to cut/reveal it. */
  private maybeRequestMaalReveal(state: GameState): void {
    const matchId = this.matchId();
    const userId = this.auth.user()?.id;
    if (
      !matchId ||
      !userId ||
      this.introBusy() ||
      !isMarriageState(state) ||
      state.turnPhase !== TurnPhase.WAITING_FOR_DRAW ||
      state.currentPlayerId !== userId ||
      !!state.players.find((player) => player.id === userId)?.hasSeenMaal ||
      !marriageReadyToSeeMaal(state, userId)
    ) {
      if (!isMarriageState(state) || state.currentPlayerId !== userId) {
        this.maalEnsureRequestedFor = null;
      }
      return;
    }
    const key = `${matchId}:${state.version}:${userId}`;
    if (this.maalEnsureRequestedFor === key) {
      return;
    }
    this.maalEnsureRequestedFor = key;
    this.sockets.client.emit('marriage-ensure-maal', { matchId });
  }

  private async playAnimation(animation: PieceMoveAnimation): Promise<void> {
    this.animating.set(true);
    this.movingPieceId.set(animation.pieceId);
    try {
      for (const step of animation.steps) {
        this.hopTick.update((tick) => tick + 1);
        this.displayCoords.update((current) => ({ ...current, [animation.pieceId]: step }));
        await delay(PIECE_STEP_MS);
      }
    } finally {
      this.movingPieceId.set(null);
      this.animating.set(false);
    }
  }

  private async runMatchStartIntro(): Promise<void> {
    const generation = ++this.introGeneration;
    this.introBusy.set(true);
    this.marriageDeal.set(null);

    for (let n = MATCH_START_COUNTDOWN_FROM; n >= 1; n -= 1) {
      if (generation !== this.introGeneration) {
        return;
      }
      this.startCountdown.set(n);
      await delay(MATCH_START_COUNTDOWN_TICK_MS);
    }

    if (generation !== this.introGeneration) {
      return;
    }
    this.startCountdown.set(null);

    let state = this.state();
    for (let attempt = 0; attempt < 40 && !state; attempt += 1) {
      await delay(50);
      if (generation !== this.introGeneration) {
        return;
      }
      state = this.state();
    }

    if (generation !== this.introGeneration) {
      return;
    }

    if (state && isMarriageState(state)) {
      await this.runMarriageDealAnimation(state, generation);
    }

    if (generation === this.introGeneration) {
      this.marriageDeal.set(null);
      this.introBusy.set(false);
    }
  }

  private async runMarriageDealAnimation(
    state: MarriageGameState,
    generation: number
  ): Promise<void> {
    const handSize = state.rules.handSize;
    const players = state.players;
    const totalDealt = players.reduce((sum, player) => sum + player.hand.length, 0);
    const revealedByPlayerId: Record<string, number> = Object.fromEntries(
      players.map((player) => [player.id, 0])
    );

    this.marriageDeal.set({
      revealedByPlayerId: { ...revealedByPlayerId },
      flyingToPlayerId: null,
      showDiscard: false,
      stockBonus: totalDealt + state.discard.length,
    });

    for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
      for (const player of players) {
        if (generation !== this.introGeneration) {
          return;
        }
        if (cardIndex >= player.hand.length) {
          continue;
        }
        const stockBonus =
          totalDealt +
          state.discard.length -
          (Object.values(revealedByPlayerId).reduce((sum, n) => sum + n, 0) + 1);
        this.marriageDeal.set({
          revealedByPlayerId: { ...revealedByPlayerId },
          flyingToPlayerId: player.id,
          showDiscard: false,
          stockBonus: Math.max(0, stockBonus),
        });
        await delay(MARRIAGE_DEAL_CARD_MS);
        if (generation !== this.introGeneration) {
          return;
        }
        revealedByPlayerId[player.id] = cardIndex + 1;
        this.marriageDeal.set({
          revealedByPlayerId: { ...revealedByPlayerId },
          flyingToPlayerId: null,
          showDiscard: false,
          stockBonus: Math.max(
            0,
            totalDealt +
              state.discard.length -
              Object.values(revealedByPlayerId).reduce((sum, n) => sum + n, 0)
          ),
        });
      }
    }

    if (generation !== this.introGeneration) {
      return;
    }

    this.marriageDeal.set({
      revealedByPlayerId: { ...revealedByPlayerId },
      flyingToPlayerId: null,
      showDiscard: true,
      stockBonus: 0,
    });
    await delay(MARRIAGE_DEAL_CARD_MS * 2);
  }

  private syncDisplay(state: GameState): void {
    const coords: Record<string, BoardCoordinate> = {};
    if (isSnakesState(state)) {
      for (const player of state.players) {
        coords[player.tokenId] = getSnakesSquareCoordinate(player.position);
      }
    } else if (isLudoState(state)) {
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
