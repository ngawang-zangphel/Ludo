export { rollDice, createDiceSequence } from './lib/rng';
export type { DiceRng } from './lib/rng';

export {
  getAbsoluteBoardPosition,
  getGlobalPosition,
  getPlayerPath,
  getPieceCoordinate,
  getYardSlot,
  getBoardLayout,
  isSafeSquare,
  relativeToGlobal,
  globalToRelative,
  checkHomeEntry,
  pieceStateForRelative,
} from './lib/board/coordinates';

export {
  COMMON_PATH,
  COLOR_START_INDEX,
  SAFE_INDICES,
  STAR_INDICES,
  START_INDICES,
  HOME_PATHS,
  HOME_TRIANGLES,
  YARD_SLOTS,
  YARD_BOUNDS,
} from './lib/board/path';

export { createMatchState, createLocalDemoMatch } from './lib/create-match';

export {
  getValidMoves,
  canMovePiece,
  getCapturedPieces,
  checkCapture,
  destinationFor,
} from './lib/valid-moves';

export {
  findPlayer,
  findPiece,
  getNextPlayer,
  checkPlayerFinished,
  checkMatchFinished,
  isPlayerFinished,
  getActivePlayers,
  openRollWindow,
  clearRollWindow,
} from './lib/queries';

export { applyDiceRoll } from './lib/apply-dice-roll';
export { applyMove, movePiece, removeLudoPlayer } from './lib/apply-move';
export { removePlayerFromMatch } from './lib/remove-player';

export { createSnakesMatchState, createLocalSnakesDemoMatch, snakesTokenId } from './lib/snakes/create-match';
export { applySnakesDiceRoll } from './lib/snakes/apply-dice-roll';
export { applySnakesMove, removeSnakesPlayer } from './lib/snakes/apply-move';
export {
  getSnakesSquareCoordinate,
  snakesSquareToCell,
  layoutForRules,
  teleportFrom,
  SNAKES_TELEPORTS,
  SNAKES_LADDERS,
  SNAKES_SNAKES,
} from './lib/snakes/board';

export { createMarriageMatchState, createLocalMarriageDemoMatch } from './lib/marriage/create-match';
export {
  drawMarriageCard,
  discardMarriageCard,
  openMarriage,
  showMarriage,
  marriageCanShow,
  marriageSuggestOpen,
  marriageReadyToSeeMaal,
  ensureMaalVisibleBeforeDraw,
  reorderMarriageHand,
  extendMarriageMeld,
  joinMarriageMelds,
  removeMarriageMeldCard,
} from './lib/marriage/actions';
export {
  buildMarriageDeck,
  shuffleCards,
  isWildCard,
  isPoplu,
  isJhiplu,
  cardLabel,
  parseMarriageCardId,
} from './lib/marriage/cards';
export {
  classifyMeld,
  classifyOpenSequence,
  canPartitionHand,
  findThreePureOpenMelds,
  handHasThreePureOpens,
  sortHand,
  validateOpenMelds,
} from './lib/marriage/melds';
export { sanitizeMarriageState, sanitizeGameStateForViewer } from './lib/marriage/sanitize';
