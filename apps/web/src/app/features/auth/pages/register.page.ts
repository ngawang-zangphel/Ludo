import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../shared/format';

@Component({
  selector: 'ludo-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-md rounded-3xl border border-arena-line bg-arena-navy/80 p-8 shadow-2xl">
        <p class="text-xs uppercase tracking-[0.3em] text-arena-gold">Ludo Arena</p>
        <h1 class="mt-2 font-display text-3xl font-bold text-white">Create your account</h1>
        <p class="mt-2 text-sm text-arena-mist/70">Join as a player. Admins are created separately.</p>

        <form class="mt-8 space-y-4" (ngSubmit)="submit()">
          <label class="block text-sm">
            Name
            <input
              class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
              name="name"
              [(ngModel)]="name"
              minlength="2"
              required
              autocomplete="name"
            />
          </label>
          <label class="block text-sm">
            Email
            <input
              class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              autocomplete="email"
            />
          </label>
          <label class="block text-sm">
            Password
            <span class="relative mt-1 block">
              <input
                class="w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 pr-11 outline-none focus:border-arena-gold"
                name="password"
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                minlength="6"
                required
                autocomplete="new-password"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-arena-mist/70 hover:text-arena-gold"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                @if (showPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                }
              </button>
            </span>
          </label>
          <label class="block text-sm">
            Confirm password
            <input
              class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
              name="confirmPassword"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="confirmPassword"
              minlength="6"
              required
              autocomplete="new-password"
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
            {{ busy() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-arena-mist/70">
          Already have an account?
          <a routerLink="/login" class="text-arena-gold hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.register(this.name.trim(), this.email.trim(), this.password);
      await this.router.navigate(['/']);
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
