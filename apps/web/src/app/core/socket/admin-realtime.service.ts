import { Injectable, inject, signal } from '@angular/core';
import {
  MatchListPayload,
  MatchSummaryDto,
  PresenceUpdatedPayload,
  ServerToClientEvents,
} from '@ludo-game/shared-types';
import { SocketService } from '../socket/socket.service';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService {
  private readonly sockets = inject(SocketService);
  private matchesHandler: ServerToClientEvents['matches-updated'] | null = null;
  private presenceHandler: ServerToClientEvents['presence-updated'] | null = null;

  readonly matches = signal<MatchSummaryDto[]>([]);
  readonly broadcastMatchId = signal<string | null>(null);
  readonly onlineUserIds = signal<string[]>([]);

  subscribe(): void {
    this.subscribePresence();
    if (this.matchesHandler) {
      return;
    }
    const socket = this.sockets.connect();
    this.matchesHandler = (payload: MatchListPayload) => {
      this.matches.set(payload.matches);
      this.broadcastMatchId.set(payload.broadcastMatchId);
    };
    socket.on('matches-updated', this.matchesHandler);
    socket.emit('admin-subscribe');
  }

  subscribePresence(): void {
    const socket = this.sockets.connect();
    if (!this.presenceHandler) {
      this.presenceHandler = (payload: PresenceUpdatedPayload) => {
        this.onlineUserIds.set(payload.onlineUserIds);
      };
      socket.on('presence-updated', this.presenceHandler);
    }
    socket.emit('admin-subscribe');
  }

  unsubscribe(): void {
    if (this.matchesHandler) {
      this.sockets.client.off('matches-updated', this.matchesHandler);
      this.matchesHandler = null;
    }
  }

  unsubscribePresence(): void {
    if (this.presenceHandler) {
      this.sockets.client.off('presence-updated', this.presenceHandler);
      this.presenceHandler = null;
    }
  }
}
