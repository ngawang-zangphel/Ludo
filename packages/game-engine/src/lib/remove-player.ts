import { EngineResult, GameState, isSnakesState } from '@ludo-game/shared-types';
import { removeLudoPlayer } from './apply-move';
import { removeSnakesPlayer } from './snakes/apply-move';

export function removePlayerFromMatch(
  state: GameState,
  playerId: string,
  now?: string
): EngineResult {
  return isSnakesState(state)
    ? removeSnakesPlayer(state, playerId, now)
    : removeLudoPlayer(state, playerId, now);
}
