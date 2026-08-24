import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly socketsByUser = new Map<string, Set<string>>();

  add(userId: string, socketId: string): void {
    const sockets = this.socketsByUser.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.socketsByUser.set(userId, sockets);
  }

  remove(userId: string, socketId: string): void {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return;
    }
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
    }
  }

  ids(): string[] {
    return [...this.socketsByUser.keys()];
  }

  isOnline(userId: string): boolean {
    return (this.socketsByUser.get(userId)?.size ?? 0) > 0;
  }
}
