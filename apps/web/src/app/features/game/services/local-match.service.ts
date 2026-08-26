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
  PLAYER_COLOR_ORDER,
  PLAYER_COLOR_OPPOSITE,
  PlayerColor,
  defaultSeatColors,
  resolveSnakesRules,
  SnakesBoardLayout,
  SnakesLevelId,
  TurnPhase,
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
} from '@ludo-game/game-engine';
import { DiceUiState } from '../models/dice';
import { DICE_REVEAL_MS, DICE_TUMBLE_MS, PIECE_STEP_MS } from '../models/motion';
import { formatGameEvents } from '../../../shared/format';

export interface HotSeatPlayerSlot {
  name: string;
  color: PlayerColor;
}

export type HotSeatCustomSource = 'library' | 'create';

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
  readonly playerCount = signal(4);
  readonly playerSlots = signal<HotSeatPlayerSlot[]>(defaultSlots(4));
  readonly state = signal<GameState | null>(null);
  readonly diceUi = signal<DiceUiState>('WAITING');
  readonly animating = signal(false);
  readonly movingPieceId = signal<string | null>(null);
  readonly hopTick = signal(0);
  readonly displayCoords = signal<Record<string, BoardCoordinate>>({});
  readonly errorMessage = signal<string | null>(null);
  readonly lastEvent = signal<string | null>(null);
  private actionGen = 0;

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

  readonly colors = computed(() => [...PLAYER_COLOR_ORDER]);

  readonly allowedPlayerCounts = computed(() => [2, 3, 4]);

  readonly setupReady = computed(() => {
    if (!this.playerSlots().every((slot) => slot.name.trim().length > 0)) {
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

  setGameType(type: GameType): void {
    if (type === GameType.MARRIAGE) {
      return;
    }
    this.gameType.set(type);
    const nextCount = Math.min(this.playerCount(), 4);
    this.playerCount.set(nextCount);
    this.playerSlots.set(defaultSlots(nextCount));
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

  setPlayerCount(count: number): void {
    const next = Math.min(4, Math.max(2, Math.floor(count)));
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
    if (this.phase() === 'playing') {
      this.backToSetup();
    }
  }

  setPlayerName(index: number, name: string): void {
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
      this.lastEvent.set('Hot-seat match started. Pass the device each turn.');
      this.syncDisplay(next);
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
    const startedAt = Date.now();

    try {
      const current = this.state();
      if (!current) {
        return;
      }
      const result = isSnakesState(current)
        ? applySnakesDiceRoll(current, current.currentPlayerId)
        : isLudoState(current)
          ? applyDiceRoll(current, current.currentPlayerId)
          : null;
      if (!result) {
        return;
      }
      const tumbleWait = Math.max(0, DICE_TUMBLE_MS - (Date.now() - startedAt));
      await delay(tumbleWait);
      if (gen !== this.actionGen) {
        return;
      }

      const value = result.state.dice.value;
      this.animating.set(true);
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
      this.animating.set(false);

      const tokenId = result.validPieceIds[0];
      if (isSnakesState(result.state) && tokenId) {
        await this.move(tokenId);
      } else if (result.state.turnPhase === TurnPhase.WAITING_FOR_ROLL) {
        this.diceUi.set('WAITING');
      }
    } catch (error) {
      if (gen !== this.actionGen) {
        return;
      }
      this.animating.set(false);
      this.diceUi.set('WAITING');
      this.errorMessage.set(toMessage(error));
    }
  }

  async move(pieceId: string): Promise<void> {
    const current = this.state();
    if (!this.canMove() || !current || !current.validPieceIds.includes(pieceId)) {
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
        return;
      }

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

  private buildMatch(): GameState {
    const players = this.toCreatePlayers();
    if (this.gameType() === GameType.SNAKES) {
      return createSnakesMatchState({
        matchId: 'local-snakes-hotseat',
        players,
        rules: this.snakesRules(),
      });
    }
    return createMatchState({
      matchId: 'local-hotseat',
      players,
    });
  }

  private toCreatePlayers(): CreateMatchPlayer[] {
    return this.playerSlots().map((slot, index) => {
      const name = slot.name.trim() || `Player ${index + 1}`;
      const key = slot.color.toLowerCase();
      return {
        id: `player-${key}`,
        userId: `user-${key}`,
        name,
        color: slot.color,
      };
    });
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
    if (levelId === SnakesLevelId.CUSTOM) {
      return { levelId, layout: this.customLayout() };
    }
    return { levelId };
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
