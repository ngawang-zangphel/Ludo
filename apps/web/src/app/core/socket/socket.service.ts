import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private origin: string | null = null;

  connect(): Socket {
    if (this.socket && this.origin !== window.location.origin) {
      this.disconnect();
    }
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }
    this.origin = window.location.origin;
    this.socket = io(this.origin, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['polling'],
      upgrade: false,
      rememberUpgrade: false,
    });
    return this.socket;
  }

  get client(): Socket {
    return this.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.origin = null;
  }
}
