import { Injectable, inject, signal } from '@angular/core';
import { MatchListPayload, MatchSummaryDto, ServerToClientEvents } from '@ludo-game/shared-types';
import { SocketService } from '../socket/socket.service';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService {
  private readonly sockets = inject(SocketService);
  private handler: ServerToClientEvents['matches-updated'] | null = null;

  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly broadcastMatchId = signal<string | null>(null);

  subscribe(): void {
    this.unsubscribe();
    const socket = this.sockets.connect();
    this.handler = (payload: MatchListPayload) => {
      this.matches.set(payload.matches);
      this.broadcastMatchId.set(payload.broadcastMatchId);
    };
    socket.on('matches-updated', this.handler);
    socket.emit('admin-subscribe');
  }

  unsubscribe(): void {
    if (this.handler) {
      this.sockets.client.off('matches-updated', this.handler);
      this.handler = null;
    }
  }
}
