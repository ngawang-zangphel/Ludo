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
} from './lib/queries';

export { applyDiceRoll } from './lib/apply-dice-roll';
export { applyMove, movePiece } from './lib/apply-move';
