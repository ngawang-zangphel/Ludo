import { Injectable, computed, signal } from '@angular/core';
import {
  BoardCoordinate,
  cloneSnakesLayout,
  CreateMatchPlayer,
  emptySnakesLayout,
  GameEngineError,
  GameState,
  GameType,
  isLudoState,
  isSnakesState,
  MatchStatus,
  maxPlayersForGame,
  PLAYER_COLOR_ORDER,
  PLAYER_COLOR_OPPOSITE,
  PlayerColor,
  defaultSeatColors,
  resolveSnakesRules,
  SnakesBoardLayout,
  SnakesLevelId,
  TurnPhase,
  ValidMove,
} from '@ludo-game/shared-types';
import {
  applyDiceRoll,
  applyMove,
  applySnakesDiceRoll,
  applySnakesMove,
  createMatchState,
  createSnakesMatchState,
  getPieceCoordinate,
  getSnakesSquareCoordinate,
  getValidMoves,
} from '@ludo-game/game-engine';
import { DiceUiState } from '../models/dice';
import { PlaceCelebration, celebrationFromEvents } from '../models/celebration';
import { DICE_REVEAL_MS, DICE_TUMBLE_MS, PIECE_STEP_MS } from '../models/motion';
import { formatGameEvents } from '../../../shared/format';

export interface HotSeatPlayerSlot {
  name: string;
  color: PlayerColor;
}

export type HotSeatCustomSource = 'library' | 'create';
export type HotSeatPlayMode = 'hotseat' | 'ai';

const AI_PLAYER_ID = 'player-ai';
const AI_USER_ID = 'user-ai';
const AI_NAME = 'Arena AI';
const AI_THINK_MS = 650;

@Injectable()
export class LocalMatchService {
  readonly phase = signal<'setup' | 'playing'>('setup');
  readonly gameType = signal<GameType>(GameType.LUDO);
  readonly snakesLevelId = signal<SnakesLevelId>(SnakesLevelId.CLASSIC);
  readonly customSource = signal<HotSeatCustomSource>('library');
  readonly selectedCustomBoardId = signal<string | null>(null);
  readonly customLayout = signal<SnakesBoardLayout>(cloneSnakesLayout(resolveSnakesRules().layout));
  readonly createDraft = signal<SnakesBoardLayout>(emptySnakesLayout());
  private libraryLayout: SnakesBoardLayout | null = null;
  readonly playMode = signal<HotSeatPlayMode>('hotseat');
  readonly playerCount = signal(4);
  /** How many finishers end a Snakes match (1 = first to 100 wins). */
  readonly winnerCap = signal(1);
  readonly playerSlots = signal<HotSeatPlayerSlot[]>(defaultSlots(4));
  readonly state = signal<GameState | null>(null);
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
  readonly movingPieceId = signal<string | null>(null);
  readonly hopTick = signal(0);
  readonly displayCoords = signal<Record<string, BoardCoordinate>>({});
  readonly errorMessage = signal<string | null>(null);
  readonly lastEvent = signal<string | null>(null);
  readonly celebration = signal<PlaceCelebration | null>(null);
  private actionGen = 0;
  private aiBusy = false;
  private celebrationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly currentPlayer = computed(() => {
    const match = this.state();
    if (!match) {
      return null;
    }
    return match.players.find((player) => player.id === match.currentPlayerId) ?? null;
  });

  readonly canRoll = computed(() => {
    const match = this.state();
    return (
      this.phase() === 'playing' &&
      !!match &&
      match.turnPhase === TurnPhase.WAITING_FOR_ROLL &&
      !this.animating() &&
      this.diceUi() !== 'ROLLING'
    );
  });

  readonly canMove = computed(() => {
    return (
      this.phase() === 'playing' &&
      !!this.state() &&
      this.state()!.turnPhase === TurnPhase.WAITING_FOR_MOVE &&
      !this.animating()
    );
  });

  readonly winner = computed(() => {
    const match = this.state();
    if (!match) {
      return null;
    }
    const winnerId = match.rankings[0];
    return match.players.find((player) => player.id === winnerId) ?? null;
  });

  /** Full finish order (1st, 2nd, …) for end-of-match standings. */
  readonly placements = computed(() => {
    const match = this.state();
    if (!match?.rankings.length) {
      return [] as Array<{ place: number; name: string; color: PlayerColor }>;
    }
    return match.rankings
      .map((id, index) => {
        const player = match.players.find((entry) => entry.id === id);
        if (!player) {
          return null;
        }
        return { place: index + 1, name: player.name, color: player.color };
      })
      .filter((entry): entry is { place: number; name: string; color: PlayerColor } => !!entry);
  });

  readonly colors = computed(() =>
    PLAYER_COLOR_ORDER.slice(0, maxPlayersForGame(this.gameType()))
  );

  readonly allowedPlayerCounts = computed(() => {
    const max = maxPlayersForGame(this.gameType());
    return Array.from({ length: max - 1 }, (_, index) => index + 2);
  });

  readonly isAiTurn = computed(() => {
    const match = this.state();
    return this.playMode() === 'ai' && !!match && match.currentPlayerId === AI_PLAYER_ID;
  });

  readonly setupReady = computed(() => {
    const slots = this.playerSlots();
    if (this.playMode() === 'ai') {
      if (!slots[0]?.name.trim()) {
        return false;
      }
    } else if (!slots.every((slot) => slot.name.trim().length > 0)) {
      return false;
    }
    if (
      this.gameType() === GameType.SNAKES &&
      this.snakesLevelId() === SnakesLevelId.CUSTOM &&
      this.customSource() === 'library' &&
      !this.selectedCustomBoardId()
    ) {
      return false;
    }
    return true;
  });

  readonly editingOwnBoard = computed(
    () =>
      this.gameType() === GameType.SNAKES &&
      this.snakesLevelId() === SnakesLevelId.CUSTOM &&
      this.customSource() === 'create'
  );

  setPlayMode(mode: HotSeatPlayMode): void {
    if (this.playMode() === mode) {
      return;
    }
    this.playMode.set(mode);
    if (mode === 'ai') {
      const human = this.playerSlots()[0]?.name ?? '';
      this.setPlayerCount(2);
      this.playerSlots.update((slots) => [
        { color: slots[0]?.color ?? PlayerColor.RED, name: human },
        { color: slots[1]?.color ?? PlayerColor.YELLOW, name: AI_NAME },
      ]);
    } else {
      this.playerSlots.update((slots) =>
        slots.map((slot, index) =>
          index === 1 && slot.name === AI_NAME ? { ...slot, name: '' } : slot
        )
      );
    }
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setGameType(type: GameType): void {
    if (type === GameType.MARRIAGE) {
      return;
    }
    this.gameType.set(type);
    const nextCount =
      this.playMode() === 'ai' ? 2 : Math.min(this.playerCount(), maxPlayersForGame(type));
    this.playerCount.set(nextCount);
    const previous = this.playerSlots();
    const slots = defaultSlots(nextCount).map((slot, index) => ({
      ...slot,
      name:
        this.playMode() === 'ai' && index === 1
          ? AI_NAME
          : (previous[index]?.name ?? slot.name),
    }));
    this.playerSlots.set(slots);
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setSnakesLevel(levelId: SnakesLevelId): void {
    this.snakesLevelId.set(levelId);
    if (levelId !== SnakesLevelId.CUSTOM) {
      this.customLayout.set(cloneSnakesLayout(resolveSnakesRules({ levelId }).layout));
    } else if (this.customSource() === 'create') {
      this.customLayout.set(cloneSnakesLayout(this.createDraft()));
    } else if (this.libraryLayout) {
      this.customLayout.set(cloneSnakesLayout(this.libraryLayout));
    }
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setCustomSource(source: HotSeatCustomSource): void {
    this.customSource.set(source);
    this.snakesLevelId.set(SnakesLevelId.CUSTOM);
    if (source === 'create') {
      this.customLayout.set(cloneSnakesLayout(this.createDraft()));
    } else if (this.libraryLayout) {
      this.customLayout.set(cloneSnakesLayout(this.libraryLayout));
    }
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  selectSavedBoard(id: string, layout: SnakesBoardLayout): void {
    this.snakesLevelId.set(SnakesLevelId.CUSTOM);
    this.customSource.set('library');
    this.selectedCustomBoardId.set(id);
    this.libraryLayout = cloneSnakesLayout(layout);
    this.customLayout.set(cloneSnakesLayout(layout));
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setCustomLayout(layout: SnakesBoardLayout): void {
    this.customLayout.set(cloneSnakesLayout(layout));
    if (this.customSource() === 'create') {
      this.createDraft.set(cloneSnakesLayout(layout));
    }
    if (this.phase() !== 'playing') {
      return;
    }
    const current = this.state();
    if (current && isSnakesState(current)) {
      this.state.set({
        ...current,
        rules: resolveSnakesRules({
          ...current.rules,
          levelId: SnakesLevelId.CUSTOM,
          layout,
        }),
      });
    }
  }

  setHumanName(name: string): void {
    this.setPlayerName(0, name);
  }

  setPlayerCount(count: number): void {
    if (this.playMode() === 'ai') {
      count = 2;
    }
    const next = Math.min(maxPlayersForGame(this.gameType()), Math.max(2, Math.floor(count)));
    const names = this.playerSlots().map((slot) => slot.name);
    if (next === 2) {
      this.playerCount.set(2);
      this.playerSlots.set(
        defaultSeatColors(2).map((color, index) => ({
          color,
          name: names[index] ?? '',
        }))
      );
    } else {
      const slots = [...this.playerSlots()];
      if (next < slots.length) {
        slots.length = next;
      } else {
        while (slots.length < next) {
          const used = new Set(slots.map((slot) => slot.color));
          const color = PLAYER_COLOR_ORDER.find((item) => !used.has(item)) ?? PlayerColor.RED;
          slots.push({ name: names[slots.length] ?? '', color });
        }
      }
      this.playerCount.set(next);
      this.playerSlots.set(slots);
    }
    this.clampWinnerCap();
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setWinnerCap(count: number): void {
    const max = this.playerCount();
    this.winnerCap.set(Math.max(1, Math.min(max, Math.floor(count))));
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  private clampWinnerCap(): void {
    const max = this.playerCount();
    if (this.winnerCap() > max) {
      this.winnerCap.set(max);
    }
  }

  setPlayerName(index: number, name: string): void {
    if (this.playMode() === 'ai' && index === 1) {
      return;
    }
    this.playerSlots.update((slots) =>
      slots.map((slot, i) => (i === index ? { ...slot, name } : slot))
    );
  }

  setPlayerColor(index: number, color: PlayerColor): void {
    this.playerSlots.update((slots) => {
      const next = slots.map((slot) => ({ ...slot }));
      const current = next[index];
      if (!current || current.color === color) {
        return slots;
      }
      if (next.length === 2) {
        const other = index === 0 ? 1 : 0;
        next[index] = { ...current, color };
        const partner = next[other];
        if (partner) {
          next[other] = { ...partner, color: PLAYER_COLOR_OPPOSITE[color] };
        }
        return next;
      }
      const taken = next.findIndex((slot, i) => i !== index && slot.color === color);
      if (taken >= 0 && next[taken]) {
        next[taken] = { ...next[taken], color: current.color };
      }
      next[index] = { ...current, color };
      return next;
    });
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  startMatch(): void {
    if (!this.setupReady()) {
      this.errorMessage.set('Enter a name for every player.');
      return;
    }
    try {
      this.actionGen += 1;
      const next = this.buildMatch();
      this.state.set(next);
      this.phase.set('playing');
      this.diceUi.set('WAITING');
      this.animating.set(false);
      this.movingPieceId.set(null);
      this.hopTick.set(0);
      this.errorMessage.set(null);
      this.lastEvent.set(
        this.playMode() === 'ai'
          ? 'You vs Arena AI. Roll when it is your turn.'
          : 'Hot-seat match started. Pass the device each turn.'
      );
      this.syncDisplay(next);
      void this.maybePlayAi();
    } catch (error) {
      this.errorMessage.set(toMessage(error));
    }
  }

  backToSetup(): void {
    this.actionGen += 1;
    this.phase.set('setup');
    this.state.set(null);
    this.diceUi.set('WAITING');
    this.animating.set(false);
    this.movingPieceId.set(null);
    this.hopTick.set(0);
    this.displayCoords.set({});
    this.errorMessage.set(null);
    this.lastEvent.set(null);
    this.celebration.set(null);
    if (this.celebrationTimer) {
      clearTimeout(this.celebrationTimer);
      this.celebrationTimer = null;
    }
  }

  newMatch(): void {
    this.backToSetup();
  }

  async roll(): Promise<void> {
    if (!this.canRoll()) {
      return;
    }

    const gen = ++this.actionGen;
    this.errorMessage.set(null);
    this.diceUi.set('ROLLING');
    this.animating.set(true);
    const startedAt = Date.now();

    const releaseIfCurrent = (nextDice: DiceUiState = 'WAITING'): void => {
      if (gen !== this.actionGen) {
        return;
      }
      this.animating.set(false);
      this.diceUi.set(nextDice);
    };

    try {
      const current = this.state();
      if (!current) {
        releaseIfCurrent();
        return;
      }
      const result = isSnakesState(current)
        ? applySnakesDiceRoll(current, current.currentPlayerId)
        : isLudoState(current)
          ? applyDiceRoll(current, current.currentPlayerId)
          : null;
      if (!result) {
        releaseIfCurrent();
        return;
      }
      const tumbleWait = Math.max(0, DICE_TUMBLE_MS - (Date.now() - startedAt));
      await delay(tumbleWait);
      if (gen !== this.actionGen) {
        return;
      }

      const value = result.state.dice.value;
      // Reveal the face only — keep animating so chips cannot start until the pause ends.
      this.state.set({
        ...current,
        dice: { value, rolled: true },
        turnPhase: TurnPhase.WAITING_FOR_MOVE,
        validPieceIds: [],
        rollDeadlineAt: null,
      });
      this.diceUi.set('RESULT');
      this.lastEvent.set(value != null ? `Rolled ${value}` : 'Dice rolled');

      await delay(DICE_REVEAL_MS);
      if (gen !== this.actionGen) {
        return;
      }

      this.state.set(result.state);
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));

      const tokenId = result.validPieceIds[0];
      if (isSnakesState(result.state) && tokenId) {
        // Stay animating through into move so the token waits for a completed roll.
        await this.move(tokenId, { fromRoll: true });
      } else {
        this.animating.set(false);
        if (result.state.turnPhase === TurnPhase.WAITING_FOR_ROLL) {
          this.diceUi.set('WAITING');
        }
      }
      if (!this.aiBusy) {
        await this.maybePlayAi();
      }
    } catch (error) {
      releaseIfCurrent();
      if (gen === this.actionGen) {
        this.errorMessage.set(toMessage(error));
      }
    }
  }

  async move(pieceId: string, options?: { fromRoll?: boolean }): Promise<void> {
    const current = this.state();
    const fromRoll = options?.fromRoll === true;
    // fromRoll: roll() already held animating through the dice reveal; allow the auto-move.
    if (
      (!fromRoll && !this.canMove()) ||
      !current ||
      !current.validPieceIds.includes(pieceId) ||
      current.turnPhase !== TurnPhase.WAITING_FOR_MOVE
    ) {
      if (fromRoll) {
        this.animating.set(false);
        this.diceUi.set('WAITING');
      }
      return;
    }

    this.errorMessage.set(null);
    try {
      const result = isSnakesState(current)
        ? applySnakesMove(current, {
            playerId: current.currentPlayerId,
            pieceId,
          })
        : isLudoState(current)
          ? applyMove(current, {
              playerId: current.currentPlayerId,
              pieceId,
            })
          : null;
      if (!result) {
        this.animating.set(false);
        return;
      }

      if (result.animation && result.animation.steps.length > 0) {
        this.displayCoords.update((coords) => ({
          ...coords,
          [result.animation!.pieceId]: result.animation!.from,
        }));
        this.animating.set(true);
        await this.playAnimation(result.animation.pieceId, result.animation.steps);
      }

      this.state.set(result.state);
      this.syncDisplay(result.state);
      this.animating.set(false);
      this.movingPieceId.set(null);
      this.diceUi.set('WAITING');
      this.lastEvent.set(summarize(result.events.map((event) => event.type)));
      this.flashCelebration(celebrationFromEvents(result.events, result.state.players));
      if (!this.aiBusy) {
        await this.maybePlayAi();
      }
    } catch (error) {
      this.animating.set(false);
      this.movingPieceId.set(null);
      this.diceUi.set('WAITING');
      this.errorMessage.set(toMessage(error));
    }
  }

  private buildMatch(): GameState {
    const players = this.toCreatePlayers();
    if (this.gameType() === GameType.SNAKES) {
      const state = createSnakesMatchState({
        matchId: 'local-snakes-hotseat',
        players,
        rules: this.snakesRules(),
      });
      // Local / AI play drives rolls from the UI or AI loop — no server auto-roll window.
      return { ...state, rollDeadlineAt: null };
    }
    const state = createMatchState({
      matchId: 'local-hotseat',
      players,
    });
    return { ...state, rollDeadlineAt: null };
  }

  private toCreatePlayers(): CreateMatchPlayer[] {
    return this.playerSlots().map((slot, index) => {
      const isAi = this.playMode() === 'ai' && index === 1;
      const name = isAi ? AI_NAME : slot.name.trim() || `Player ${index + 1}`;
      const key = slot.color.toLowerCase();
      return {
        id: isAi ? AI_PLAYER_ID : `player-${key}`,
        userId: isAi ? AI_USER_ID : `user-${key}`,
        name,
        color: slot.color,
      };
    });
  }

  private async maybePlayAi(): Promise<void> {
    if (this.aiBusy || this.playMode() !== 'ai' || this.phase() !== 'playing') {
      return;
    }
    this.aiBusy = true;
    try {
      // Do not freeze actionGen across the whole loop: roll()/move() bump it, and
      // that used to exit after the first AI action (e.g. bonus turn on a six).
      while (this.playMode() === 'ai' && this.phase() === 'playing') {
        const match = this.state();
        if (!match || match.status === MatchStatus.COMPLETED) {
          break;
        }
        if (match.currentPlayerId !== AI_PLAYER_ID) {
          break;
        }

        // Prior action may still be releasing dice/anim flags — wait, don't abort the turn.
        await this.waitForActionIdle();
        if (this.phase() !== 'playing' || this.playMode() !== 'ai') {
          break;
        }
        if (this.state()?.currentPlayerId !== AI_PLAYER_ID) {
          break;
        }

        this.lastEvent.set('Arena AI is thinking…');
        const gen = this.actionGen;
        await delay(AI_THINK_MS);
        if (gen !== this.actionGen || this.phase() !== 'playing') {
          break;
        }
        const latest = this.state();
        if (!latest || latest.currentPlayerId !== AI_PLAYER_ID) {
          break;
        }
        if (latest.status === MatchStatus.COMPLETED) {
          break;
        }

        // Recover from an aborted roll that left the die stuck on ROLLING.
        if (this.diceUi() === 'ROLLING' && !this.animating()) {
          this.diceUi.set('WAITING');
        }
        await this.waitForActionIdle();

        if (latest.turnPhase === TurnPhase.WAITING_FOR_ROLL) {
          if (!this.canRoll()) {
            this.animating.set(false);
            if (this.diceUi() === 'ROLLING') {
              this.diceUi.set('WAITING');
            }
          }
          if (this.canRoll() && this.state()?.currentPlayerId === AI_PLAYER_ID) {
            await this.roll();
            continue;
          }
          break;
        }
        if (latest.turnPhase === TurnPhase.WAITING_FOR_MOVE) {
          const pieceId = chooseAiPiece(this.state() ?? latest);
          if (pieceId && this.canMove()) {
            await this.move(pieceId);
            continue;
          }
          break;
        }
        break;
      }
    } finally {
      this.aiBusy = false;
    }
  }

  /** Wait until dice tumble / piece hops finish so the AI can take the turn. */
  private async waitForActionIdle(timeoutMs = 6000): Promise<void> {
    const started = Date.now();
    while (
      this.phase() === 'playing' &&
      Date.now() - started < timeoutMs &&
      (this.animating() || this.diceUi() === 'ROLLING')
    ) {
      await delay(40);
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
    } else if (isLudoState(state)) {
      for (const player of state.players) {
        for (const piece of player.pieces) {
          coords[piece.id] = getPieceCoordinate(player.color, piece.state, piece.position);
        }
      }
    }
    this.displayCoords.set(coords);
  }

  private snakesRules() {
    const levelId = this.snakesLevelId();
    const winnerCap = this.winnerCap();
    if (levelId === SnakesLevelId.CUSTOM) {
      return { levelId, layout: this.customLayout(), winnerCap };
    }
    return { levelId, winnerCap };
  }

  private flashCelebration(value: PlaceCelebration | null): void {
    if (!value) {
      return;
    }
    this.celebration.set(value);
    if (this.celebrationTimer) {
      clearTimeout(this.celebrationTimer);
    }
    this.celebrationTimer = setTimeout(() => {
      this.celebration.set(null);
      this.celebrationTimer = null;
    }, 3200);
  }
}

function defaultSlots(count: number): HotSeatPlayerSlot[] {
  return defaultSeatColors(count).map((color) => ({
    color,
    name: '',
  }));
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
  return formatGameEvents(types);
}

function chooseAiPiece(state: GameState): string | null {
  if (state.validPieceIds.length === 0) {
    return null;
  }
  if (isSnakesState(state)) {
    return state.validPieceIds[0] ?? null;
  }
  if (!isLudoState(state)) {
    return state.validPieceIds[0] ?? null;
  }
  const moves = getValidMoves(state, state.currentPlayerId);
  if (moves.length === 0) {
    return state.validPieceIds[0] ?? null;
  }
  return moves.slice().sort((left, right) => scoreLudoMove(right) - scoreLudoMove(left))[0]?.pieceId
    ?? state.validPieceIds[0]
    ?? null;
}

function scoreLudoMove(move: ValidMove): number {
  let score = move.toPosition;
  if (move.reachesHome) {
    score += 400;
  }
  if (move.captures.length) {
    score += 280 + move.captures.length * 40;
  }
  if (move.entersBoard) {
    score += 160;
  }
  if (move.entersHomePath) {
    score += 120;
  }
  return score;
}
