import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  BroadcastStateDto,
  MatchDetailDto,
  MatchResultDto,
  MatchStatus,
  MatchSummaryDto,
  ParticipantDto,
  SnakesBoardLayout,
  SnakesCustomBoardDto,
  TournamentDto,
  TournamentStatus,
  UserDto,
} from '@ludo-game/shared-types';
import { firstValueFrom } from 'rxjs';

export interface MatchNeighbors {
  previousId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ArenaApiService {
  private readonly http = inject(HttpClient);

  myMatches(): Promise<MatchSummaryDto[]> {
    return firstValueFrom(this.http.get<MatchSummaryDto[]>('/api/matches/mine'));
  }

  matches(filters: { tournamentId?: string; status?: MatchStatus } = {}): Promise<MatchSummaryDto[]> {
    let params = new HttpParams();
    if (filters.tournamentId) {
      params = params.set('tournamentId', filters.tournamentId);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return firstValueFrom(this.http.get<MatchSummaryDto[]>('/api/matches', { params }));
  }

  match(id: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.get<MatchDetailDto>(`/api/matches/${id}`));
  }

  neighbors(id: string): Promise<MatchNeighbors> {
    return firstValueFrom(this.http.get<MatchNeighbors>(`/api/matches/${id}/neighbors`));
  }

  result(id: string): Promise<MatchResultDto> {
    return firstValueFrom(this.http.get<MatchResultDto>(`/api/matches/${id}/result`));
  }

  createMatch(body: {
    tournamentId: string;
    round?: string;
    roundNumber?: number;
    matchNumber?: number;
    playerUserIds?: string[];
    random?: boolean;
  }): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>('/api/matches', body));
  }

  createMatchGroups(body: {
    tournamentId: string;
    round?: string;
    roundNumber?: number;
  }): Promise<MatchDetailDto[]> {
    return firstValueFrom(this.http.post<MatchDetailDto[]>('/api/matches/groups', body));
  }

  assignPlayers(matchId: string, playerUserIds: string[]): Promise<MatchDetailDto> {
    return firstValueFrom(
      this.http.post<MatchDetailDto>(`/api/matches/${matchId}/assign`, { playerUserIds })
    );
  }

  assignRandom(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/assign-random`, {}));
  }

  start(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/start`, {}));
  }

  removePlayer(matchId: string, userId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.delete<MatchDetailDto>(`/api/matches/${matchId}/players/${userId}`));
  }

  pause(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/pause`, {}));
  }

  resume(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/resume`, {}));
  }

  restart(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/restart`, {}));
  }

  cancel(matchId: string): Promise<MatchDetailDto> {
    return firstValueFrom(this.http.post<MatchDetailDto>(`/api/matches/${matchId}/cancel`, {}));
  }

  deleteMatch(matchId: string): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`/api/matches/${matchId}`));
  }

  broadcast(matchId: string): Promise<{ matchId: string | null }> {
    return firstValueFrom(
      this.http.post<{ matchId: string | null }>(`/api/matches/${matchId}/broadcast`, {})
    );
  }

  stopBroadcast(): Promise<{ matchId: null }> {
    return firstValueFrom(this.http.delete<{ matchId: null }>('/api/broadcast'));
  }

  currentBroadcast(): Promise<BroadcastStateDto> {
    return firstValueFrom(this.http.get<BroadcastStateDto>('/api/broadcast'));
  }

  tournaments(): Promise<TournamentDto[]> {
    return firstValueFrom(this.http.get<TournamentDto[]>('/api/tournaments'));
  }

  tournament(id: string): Promise<TournamentDto> {
    return firstValueFrom(this.http.get<TournamentDto>(`/api/tournaments/${id}`));
  }

  createTournament(
    name: string,
    rounds?: Array<{ name: string; number: number }>,
    gameType?: string,
    snakesLevelId?: string,
    snakesLayout?: { snakes: Array<{ from: number; to: number }>; ladders: Array<{ from: number; to: number }> },
    marriageDeckCount?: number
  ): Promise<TournamentDto> {
    return firstValueFrom(
      this.http.post<TournamentDto>('/api/tournaments', {
        name,
        rounds,
        gameType,
        snakesLevelId,
        snakesLayout,
        marriageDeckCount,
      })
    );
  }

  setTournamentStatus(id: string, status: TournamentStatus): Promise<TournamentDto> {
    return firstValueFrom(
      this.http.patch<TournamentDto>(`/api/tournaments/${id}/status`, { status })
    );
  }

  deleteTournament(id: string): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`/api/tournaments/${id}`));
  }

  snakesBoards(): Promise<SnakesCustomBoardDto[]> {
    return firstValueFrom(this.http.get<SnakesCustomBoardDto[]>('/api/snakes-boards'));
  }

  createSnakesBoard(name: string, layout: SnakesBoardLayout): Promise<SnakesCustomBoardDto> {
    return firstValueFrom(
      this.http.post<SnakesCustomBoardDto>('/api/snakes-boards', { name, layout })
    );
  }

  updateSnakesBoard(
    id: string,
    name: string,
    layout: SnakesBoardLayout
  ): Promise<SnakesCustomBoardDto> {
    return firstValueFrom(
      this.http.patch<SnakesCustomBoardDto>(`/api/snakes-boards/${id}`, { name, layout })
    );
  }

  deleteSnakesBoard(id: string): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`/api/snakes-boards/${id}`));
  }

  participants(tournamentId: string): Promise<ParticipantDto[]> {
    return firstValueFrom(
      this.http.get<ParticipantDto[]>(`/api/tournaments/${tournamentId}/participants`)
    );
  }

  register(tournamentId: string, userId: string): Promise<ParticipantDto> {
    return firstValueFrom(
      this.http.post<ParticipantDto>(`/api/tournaments/${tournamentId}/participants`, { userId })
    );
  }

  advance(tournamentId: string, roundNumber: number): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.post<{ ok: true }>(`/api/tournaments/${tournamentId}/rounds/${roundNumber}/advance`, {})
    );
  }

  users(): Promise<UserDto[]> {
    return firstValueFrom(this.http.get<UserDto[]>('/api/users'));
  }

  createUser(body: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }): Promise<UserDto> {
    return firstValueFrom(this.http.post<UserDto>('/api/users', body));
  }

  updateUser(
    id: string,
    body: { email?: string; name?: string; password?: string; role?: string }
  ): Promise<UserDto> {
    return firstValueFrom(this.http.patch<UserDto>(`/api/users/${id}`, body));
  }

  deleteUser(id: string): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`/api/users/${id}`));
  }
}
