import {
  CLASSIC_SNAKES_LAYOUT,
  cloneSnakesLayout,
  emptySnakesLayout,
  SnakesBoardLayout,
  SnakesLevelId,
  SNAKES_LEVEL_LAYOUTS,
} from './snakes-layout';

export {
  SnakesLevelId,
  SNAKES_LEVEL_LABEL,
  SNAKES_LEVELS,
  SNAKES_PRESETS,
  SNAKES_LEVEL_LAYOUTS,
  CLASSIC_SNAKES_LAYOUT,
  CLASSIC_SNAKES_TELEPORTS,
  EASY_SNAKES_LAYOUT,
  HARD_SNAKES_LAYOUT,
  EMPTY_SNAKES_LAYOUT,
  cloneSnakesLayout,
  emptySnakesLayout,
  layoutFromTeleports,
  teleportsFromLayout,
  validateSnakesLayout,
  applySnakesBoardClick,
} from './snakes-layout';
export type { SnakesBoardLayout, SnakesTeleport, SnakesEditorTool, SnakesBoardClickResult } from './snakes-layout';

export interface LudoRules {
  extraTurnOnSix: boolean;
  extraTurnOnCapture: boolean;
  maxConsecutiveSixes: number;
  exactRollRequiredForHome: boolean;
}

export const DEFAULT_LUDO_RULES: LudoRules = {
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  maxConsecutiveSixes: 3,
  exactRollRequiredForHome: true,
};

export interface DisconnectRules {
  reconnectGracePeriodSeconds: number;
  autoRollAfterTimeout: boolean;
  autoMoveAfterTimeout: boolean;
}

export const DEFAULT_DISCONNECT_RULES: DisconnectRules = {
  reconnectGracePeriodSeconds: 30,
  autoRollAfterTimeout: false,
  autoMoveAfterTimeout: false,
};

export interface SnakesRules {
  extraTurnOnSix: boolean;
  exactRollRequiredForFinish: boolean;
  levelId: SnakesLevelId;
  layout: SnakesBoardLayout;
}

export const DEFAULT_SNAKES_RULES: SnakesRules = {
  extraTurnOnSix: true,
  exactRollRequiredForFinish: true,
  levelId: SnakesLevelId.CLASSIC,
  layout: cloneSnakesLayout(CLASSIC_SNAKES_LAYOUT),
};

export function resolveSnakesRules(partial?: Partial<SnakesRules> | null): SnakesRules {
  const extraTurnOnSix = partial?.extraTurnOnSix ?? DEFAULT_SNAKES_RULES.extraTurnOnSix;
  const exactRollRequiredForFinish =
    partial?.exactRollRequiredForFinish ?? DEFAULT_SNAKES_RULES.exactRollRequiredForFinish;
  const levelId = partial?.levelId ?? (partial?.layout ? SnakesLevelId.CUSTOM : SnakesLevelId.CLASSIC);

  if (levelId !== SnakesLevelId.CUSTOM) {
    const preset = SNAKES_LEVEL_LAYOUTS[levelId] ?? CLASSIC_SNAKES_LAYOUT;
    return {
      extraTurnOnSix,
      exactRollRequiredForFinish,
      levelId,
      layout: cloneSnakesLayout(preset),
    };
  }

  return {
    extraTurnOnSix,
    exactRollRequiredForFinish,
    levelId: SnakesLevelId.CUSTOM,
    layout: cloneSnakesLayout(partial?.layout ?? emptySnakesLayout()),
  };
}

export type GameRules = LudoRules | SnakesRules;

export function isSnakesRules(rules: GameRules): rules is SnakesRules {
  return 'levelId' in rules || 'layout' in rules;
}
