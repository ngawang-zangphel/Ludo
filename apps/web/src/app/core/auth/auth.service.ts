import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthResponseDto, UserDto } from '@ludo-game/shared-types';
import { firstValueFrom } from 'rxjs';

import { SocketService } from '../socket/socket.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sockets = inject(SocketService);
  readonly user = signal<UserDto | null>(null);
  readonly ready = signal(false);

  async restore(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<AuthResponseDto>('/api/auth/me'));
      this.user.set(response.user);
      this.sockets.connect();
    } catch {
      this.user.set(null);
      this.sockets.disconnect();
    } finally {
      this.ready.set(true);
    }
  }

  async login(email: string, password: string): Promise<UserDto> {
    const response = await firstValueFrom(
      this.http.post<AuthResponseDto>('/api/auth/login', { email, password })
    );
    this.user.set(response.user);
    this.sockets.connect();
    return response.user;
  }

  async register(name: string, email: string, password: string): Promise<UserDto> {
    const response = await firstValueFrom(
      this.http.post<AuthResponseDto>('/api/auth/register', { name, email, password })
    );
    this.user.set(response.user);
    this.sockets.connect();
    return response.user;
  }

  async updateProfile(body: { name?: string; email?: string; password?: string }): Promise<UserDto> {
    const response = await firstValueFrom(
      this.http.patch<AuthResponseDto>('/api/auth/me', body)
    );
    this.user.set(response.user);
    return response.user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.user.set(null);
    this.sockets.disconnect();
    await this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.user()?.role === 'ADMIN';
  }
}
