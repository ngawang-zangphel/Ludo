import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

const REMOTE_API = 'https://zludo.apps.selise.dev';

function shutdown(socket: Socket | null): void {
  if (!socket) {
    return;
  }
  socket.io.reconnection(false);
  socket.removeAllListeners();
  socket.disconnect();
}

/** Drop the Manager cached when we briefly pointed sockets at the hosted API. */
function dropRemoteManager(): void {
  shutdown(io(REMOTE_API, { autoConnect: false, reconnection: false }));
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    dropRemoteManager();
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }
    this.socket = io({
      path: '/socket.io',
      withCredentials: true,
      transports: ['polling'],
      upgrade: false,
      rememberUpgrade: false,
      forceNew: true,
      reconnection: true,
    });
    return this.socket;
  }

  get client(): Socket {
    return this.connect();
  }

  disconnect(): void {
    shutdown(this.socket);
    this.socket = null;
  }
}
