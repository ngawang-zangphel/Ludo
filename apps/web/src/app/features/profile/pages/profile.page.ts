import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../shared/format';

@Component({
  selector: 'ludo-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-lg px-4 py-8">
      <a routerLink="/" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">Invitations</a>
      <h1 class="mt-2 font-display text-3xl font-bold text-white">Your profile</h1>
      <p class="mt-2 text-sm text-arena-mist/70">This is the name other players see on the board.</p>

      @if (message()) {
        <p class="mt-4 text-piece-green">{{ message() }}</p>
      }
      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <form class="mt-6 space-y-4 rounded-3xl border border-arena-line bg-arena-navy/80 p-6" (ngSubmit)="save()">
        <label class="block text-sm">
          Name
          <input
            class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
            name="name"
            [(ngModel)]="name"
            minlength="2"
            required
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
          />
        </label>
        <label class="block text-sm">
          New password
          <input
            class="mt-1 w-full rounded-xl border border-arena-line bg-arena-ink px-3 py-2 outline-none focus:border-arena-gold"
            name="password"
            type="password"
            [(ngModel)]="password"
            minlength="6"
            placeholder="Leave blank to keep current password"
            autocomplete="new-password"
          />
        </label>
        <button
          type="submit"
          class="w-full rounded-full bg-arena-gold py-2.5 font-display font-semibold text-arena-ink disabled:opacity-50"
          [disabled]="busy()"
        >
          {{ busy() ? 'Saving…' : 'Save profile' }}
        </button>
      </form>
    </div>
  `,
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(AuthService);

  name = '';
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.auth.user();
    this.name = user?.name ?? '';
    this.email = user?.email ?? '';
  }

  async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    try {
      await this.auth.updateProfile({
        name: this.name.trim(),
        email: this.email.trim(),
        ...(this.password ? { password: this.password } : {}),
      });
      this.password = '';
      this.message.set('Profile updated.');
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
