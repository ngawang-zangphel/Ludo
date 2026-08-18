import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }
    this.socket = io({
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    return this.socket;
  }

  get client(): Socket {
    return this.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
