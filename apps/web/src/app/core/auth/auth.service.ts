import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthResponseDto, UserDto } from '@ludo-game/shared-types';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly user = signal<UserDto | null>(null);
  readonly ready = signal(false);

  async restore(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<AuthResponseDto>('/api/auth/me'));
      this.user.set(response.user);
    } catch {
      this.user.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async login(email: string, password: string): Promise<UserDto> {
    const response = await firstValueFrom(
      this.http.post<AuthResponseDto>('/api/auth/login', { email, password })
    );
    this.user.set(response.user);
    return response.user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.user.set(null);
    await this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.user()?.role === 'ADMIN';
  }
}
