import {
  EngineResult,
  GameEngineError,
  GameState,
  isMarriageState,
  isSnakesState,
} from '@ludo-game/shared-types';
import { removeLudoPlayer } from './apply-move';
import { removeSnakesPlayer } from './snakes/apply-move';

export function removePlayerFromMatch(
  state: GameState,
  playerId: string,
  now?: string
): EngineResult {
  if (isSnakesState(state)) {
    return removeSnakesPlayer(state, playerId, now);
  }
  if (isMarriageState(state)) {
    throw new GameEngineError(
      'ILLEGAL_MOVE',
      'Removing a player mid-hand is not supported for Marriage yet'
    );
  }
  return removeLudoPlayer(state, playerId, now);
}
