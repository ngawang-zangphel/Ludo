import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../shared/format';

@Component({
  selector: 'ludo-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-md rounded-3xl border border-arena-line bg-arena-navy/80 p-8 shadow-2xl">
        <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Ludo Arena</p>
        <h1 class="mt-2 font-display text-3xl font-bold text-white">Enter the arena</h1>
        <p class="mt-2 text-sm text-arena-mist/70">HTTP-only session. Server-authoritative matches.</p>

        <form class="mt-8 space-y-4" (ngSubmit)="submit()">
          <label class="block text-sm">
            Email
            <input
              class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
            />
          </label>
          <label class="block text-sm">
            Password
            <input
              class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
            />
          </label>
          @if (error()) {
            <p class="text-sm text-piece-red">{{ error() }}</p>
          }
          <button
            type="submit"
            class="w-full rounded-full bg-arena-gold py-2.5 font-display font-semibold text-arena-ink disabled:opacity-50"
            [disabled]="busy()"
          >
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="mt-6 rounded-2xl border border-arena-line/80 bg-black/20 p-4 text-xs text-arena-mist/70">
          <p>Admin: <code>admin@ludo.arena</code> / <code>Admin123!</code></p>
          <p class="mt-1">Players: <code>karma@ludo.arena</code> … <code>kinley@ludo.arena</code> / <code>Player123!</code></p>
        </div>
        <p class="mt-4 text-center text-sm">
          <a routerLink="/local" class="text-arena-gold hover:underline">Play a local hot-seat match</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = 'karma@ludo.arena';
  password = 'Player123!';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.login(this.email, this.password);
      await this.router.navigate([user.role === 'ADMIN' ? '/admin' : '/']);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
