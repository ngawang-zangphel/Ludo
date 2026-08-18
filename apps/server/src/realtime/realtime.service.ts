import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ServerToClientEvents } from '@ludo-game/shared-types';
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

  emitToAdmin(event: keyof ServerToClientEvents, payload: unknown): void {
    this.server?.to(ADMIN_ROOM).emit(event, payload);
  }

  emitToBroadcast(event: keyof ServerToClientEvents, payload: unknown): void {
    this.server?.to(BROADCAST_ROOM).emit(event, payload);
  }
}
