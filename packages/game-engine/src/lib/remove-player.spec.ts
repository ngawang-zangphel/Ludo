import { GameEventType, MatchStatus, PlayerColor, TurnPhase } from '@ludo-game/shared-types';
import { createMatchState } from './create-match';
import { removePlayerFromMatch } from './remove-player';
import { createSnakesMatchState } from './snakes/create-match';
import { makeMatch } from './testing/harness';

describe('removePlayerFromMatch', () => {
  it('passes the turn when the current Ludo player is removed', () => {
    const result = removePlayerFromMatch(makeMatch(), 'red');
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.eliminated).toBe(true);
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.status).toBe(MatchStatus.LIVE);
    expect(result.events.some((event) => event.type === GameEventType.PLAYER_REMOVED)).toBe(true);
    expect(result.events.some((event) => event.type === GameEventType.TURN_CHANGED)).toBe(true);
  });

  it('keeps the current player when a waiting Ludo player is removed', () => {
    const result = removePlayerFromMatch(makeMatch(), 'blue');
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.state.players.find((player) => player.id === 'blue')?.eliminated).toBe(true);
    expect(result.state.status).toBe(MatchStatus.LIVE);
  });

  it('completes a two-player Ludo match when one racer is removed', () => {
    const state = createMatchState({
      matchId: 'duel',
      now: '2026-01-01T00:00:00.000Z',
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      ],
    });
    const result = removePlayerFromMatch(state, 'red');
    expect(result.state.status).toBe(MatchStatus.COMPLETED);
    expect(result.state.rankings).toEqual(['green', 'red']);
    expect(result.state.players.find((player) => player.id === 'green')?.finishedPosition).toBe(1);
    expect(result.state.players.find((player) => player.id === 'red')?.finishedPosition).toBe(2);
    expect(result.events.some((event) => event.type === GameEventType.MATCH_FINISHED)).toBe(true);
  });

  it('completes a two-player Snakes match when one racer is removed', () => {
    const state = createSnakesMatchState({
      matchId: 'snakes-duel',
      now: '2026-01-01T00:00:00.000Z',
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      ],
    });
    const result = removePlayerFromMatch(state, 'green');
    expect(result.state.status).toBe(MatchStatus.COMPLETED);
    expect(result.state.rankings).toEqual(['red', 'green']);
    expect(result.state.turnPhase).toBe(TurnPhase.MATCH_OVER);
  });

  it('keeps a paused match paused after removing a player who is not last', () => {
    const paused = { ...makeMatch(), status: MatchStatus.PAUSED };
    const result = removePlayerFromMatch(paused, 'yellow');
    expect(result.state.status).toBe(MatchStatus.PAUSED);
    expect(result.state.players.find((player) => player.id === 'yellow')?.eliminated).toBe(true);
  });
});
