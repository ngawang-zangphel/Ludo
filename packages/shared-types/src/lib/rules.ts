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
}

export const DEFAULT_SNAKES_RULES: SnakesRules = {
  extraTurnOnSix: true,
  exactRollRequiredForFinish: true,
};

export type GameRules = LudoRules | SnakesRules;
