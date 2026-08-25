import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ServerToClientEvents, UserRole } from '@ludo-game/shared-types';
import { ADMIN_ROOM, BROADCAST_ROOM, matchRoom } from '../common/rooms';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToMatch(matchId: string, event: keyof ServerToClientEvents, payload: unknown): void {
    this.server?.to(matchRoom(matchId)).emit(event, payload);
  }

  /**
   * Emit a personalized payload to each socket in the match room (and optionally broadcast).
   */
  async emitToMatchViewers(
    matchId: string,
    event: keyof ServerToClientEvents,
    buildPayload: (viewer: { userId: string | null; isAdmin: boolean }) => unknown,
    options?: { includeBroadcast?: boolean }
  ): Promise<void> {
    if (!this.server) {
      return;
    }
    const sockets = await this.server.in(matchRoom(matchId)).fetchSockets();
    for (const socket of sockets) {
      const user = (socket.data as { user?: { id?: string; role?: string } } | undefined)?.user;
      socket.emit(
        event,
        buildPayload({
          userId: user?.id ?? null,
          isAdmin: user?.role === UserRole.ADMIN,
        })
      );
    }
    if (options?.includeBroadcast && this.server) {
      this.server.to(BROADCAST_ROOM).emit(
        event,
        buildPayload({ userId: null, isAdmin: true })
      );
    }
  }

  emitToAdmin(event: keyof ServerToClientEvents, payload: unknown): void {
    this.server?.to(ADMIN_ROOM).emit(event, payload);
  }

  emitToBroadcast(event: keyof ServerToClientEvents, payload: unknown): void {
    this.server?.to(BROADCAST_ROOM).emit(event, payload);
  }
}
