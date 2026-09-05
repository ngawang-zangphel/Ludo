import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BulkUserCreateResultDto, BulkUserRowDto, UserDto, UserRole } from '@ludo-game/shared-types';
import { ArenaApiService } from '../../../core/api/arena-api.service';
import { AdminRealtimeService } from '../../../core/socket/admin-realtime.service';
import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../shared/format';
import { downloadUserSheetTemplate, parseUserSheet } from '../bulk-users-sheet';

type UserFilter = 'ALL' | 'ONLINE' | 'PLAYER' | 'ADMIN';

@Component({
  selector: 'ludo-admin-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8">
      <a routerLink="/admin" class="text-xs uppercase tracking-[0.3em] text-arena-gold hover:underline">Dashboard</a>
      <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-bold text-white">User management</h1>
          <p class="mt-1 text-sm text-arena-mist/70">
            {{ onlineCount() }} online · {{ users().length }} accounts
          </p>
        </div>
      </div>

      @if (error()) {
        <p class="mt-4 text-piece-red">{{ error() }}</p>
      }

      <form class="mt-6 rounded-3xl border border-arena-line bg-arena-navy/80 p-5" (ngSubmit)="create()">
        <h2 class="font-display text-lg">Create user</h2>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input class="field" name="createName" placeholder="Name" [(ngModel)]="createName" required />
          <input class="field" name="createEmail" type="email" placeholder="Email" [(ngModel)]="createEmail" required />
          <input class="field" name="createPassword" placeholder="Password" [(ngModel)]="createPassword" required />
          <select class="field" name="createRole" [(ngModel)]="createRole">
            <option [ngValue]="UserRole.PLAYER">Player</option>
            <option [ngValue]="UserRole.ADMIN">Admin</option>
          </select>
          <button class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink" type="submit">
            Create
          </button>
        </div>
      </form>

      <form class="mt-4 rounded-3xl border border-arena-line bg-arena-navy/80 p-5" (ngSubmit)="createBulk()">
        <div>
          <h2 class="font-display text-lg">Bulk create from Excel</h2>
          <p class="mt-1 text-sm text-arena-mist/70">
            Download the template, fill <span class="text-white">name</span> and
            <span class="text-white">email</span>, then upload it. Every new account gets the same password.
          </p>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border border-arena-gold px-4 py-2 text-sm font-semibold text-arena-gold hover:bg-arena-gold/10"
            (click)="downloadTemplate()"
          >
            Download template
          </button>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            class="field"
            name="bulkPassword"
            placeholder="Shared password"
            [(ngModel)]="bulkPassword"
            required
            minlength="6"
          />
          <select class="field" name="bulkRole" [(ngModel)]="bulkRole">
            <option [ngValue]="UserRole.PLAYER">Player</option>
            <option [ngValue]="UserRole.ADMIN">Admin</option>
          </select>
          <input
            class="field"
            name="bulkFile"
            type="file"
            accept=".xlsx,.xls,.csv"
            (change)="onSheetSelected($event)"
          />
          <button
            class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink disabled:opacity-40"
            type="submit"
            [disabled]="bulkBusy() || !bulkRows().length"
          >
            {{ bulkBusy() ? 'Creating…' : 'Create accounts' }}
          </button>
        </div>
        @if (bulkFileName()) {
          <p class="mt-3 text-sm text-arena-mist/70">
            {{ bulkFileName() }} · {{ bulkRows().length }} row{{ bulkRows().length === 1 ? '' : 's' }} ready
          </p>
        }
        @if (bulkResult(); as result) {
          <p class="mt-3 text-sm text-piece-green">Created {{ result.created.length }} account{{ result.created.length === 1 ? '' : 's' }}.</p>
          @if (result.failed.length) {
            <div class="mt-2 max-h-40 overflow-auto rounded-xl border border-arena-line/80 p-3 text-sm">
              <p class="text-piece-red">{{ result.failed.length }} skipped</p>
              @for (row of result.failed; track row.row + row.email) {
                <p class="mt-1 text-arena-mist/70">Row {{ row.row }} · {{ row.email || row.name }} · {{ row.reason }}</p>
              }
            </div>
          }
        }
      </form>

      <div class="mt-6 flex flex-wrap gap-2">
        @for (item of filters; track item) {
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-sm"
            [class.bg-arena-gold]="filter() === item"
            [class.text-arena-ink]="filter() === item"
            [class.border]="filter() !== item"
            [class.border-arena-line]="filter() !== item"
            (click)="filter.set(item)"
          >
            {{ item }}
          </button>
        }
      </div>

      <div class="mt-4 overflow-x-auto rounded-3xl border border-arena-line">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="bg-arena-navy/90 text-xs uppercase tracking-wider text-arena-mist/50">
            <tr>
              <th class="px-4 py-3">User</th>
              <th class="px-4 py-3">Role</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of visible(); track user.id) {
              <tr class="border-t border-arena-line/80 bg-arena-navy/60">
                <td class="px-4 py-3">
                  @if (editingId() === user.id) {
                    <div class="grid gap-2 sm:grid-cols-2">
                      <input class="field" name="editName" [(ngModel)]="editName" />
                      <input class="field" name="editEmail" type="email" [(ngModel)]="editEmail" />
                      <input class="field sm:col-span-2" name="editPassword" placeholder="New password (optional)" [(ngModel)]="editPassword" />
                    </div>
                  } @else {
                    <p class="font-semibold text-white">{{ user.name }}</p>
                    <p class="text-arena-mist/60">{{ user.email }}</p>
                  }
                </td>
                <td class="px-4 py-3">
                  @if (editingId() === user.id) {
                    <select class="field" name="editRole" [(ngModel)]="editRole">
                      <option [ngValue]="UserRole.PLAYER">Player</option>
                      <option [ngValue]="UserRole.ADMIN">Admin</option>
                    </select>
                  } @else {
                    {{ user.role }}
                  }
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                    [class.bg-piece-green/20]="isOnline(user.id)"
                    [class.text-piece-green]="isOnline(user.id)"
                    [class.bg-white/10]="!isOnline(user.id)"
                    [class.text-arena-mist/60]="!isOnline(user.id)"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      [class.bg-piece-green]="isOnline(user.id)"
                      [class.bg-arena-mist/40]="!isOnline(user.id)"
                    ></span>
                    {{ isOnline(user.id) ? 'Online' : 'Offline' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  @if (editingId() === user.id) {
                    <button type="button" class="mr-3 text-arena-gold" (click)="save(user.id)">Save</button>
                    <button type="button" class="text-arena-mist/70" (click)="cancelEdit()">Cancel</button>
                  } @else {
                    <button type="button" class="mr-3 text-arena-gold" (click)="startEdit(user)">Edit</button>
                    <button
                      type="button"
                      class="text-piece-red disabled:opacity-40"
                      [disabled]="user.id === me()?.id"
                      (click)="remove(user)"
                    >
                      Delete
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td class="px-4 py-8 text-arena-mist/60" colspan="4">No users in this filter.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .field {
      border-radius: 0.75rem;
      border: 1px solid var(--color-arena-line);
      background: var(--color-arena-ink);
      padding: 0.5rem 0.75rem;
      width: 100%;
    }
  `,
})
export class AdminUsersPage implements OnInit, OnDestroy {
  private readonly api = inject(ArenaApiService);
  private readonly realtime = inject(AdminRealtimeService);
  private readonly auth = inject(AuthService);

  readonly UserRole = UserRole;
  readonly filters: UserFilter[] = ['ALL', 'ONLINE', 'PLAYER', 'ADMIN'];
  readonly users = signal<UserDto[]>([]);
  readonly filter = signal<UserFilter>('ALL');
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly me = this.auth.user;

  createName = '';
  createEmail = '';
  createPassword = 'Player123!';
  createRole = UserRole.PLAYER;
  bulkPassword = 'Player123!';
  bulkRole = UserRole.PLAYER;
  readonly bulkRows = signal<BulkUserRowDto[]>([]);
  readonly bulkFileName = signal<string | null>(null);
  readonly bulkBusy = signal(false);
  readonly bulkResult = signal<BulkUserCreateResultDto | null>(null);
  editName = '';
  editEmail = '';
  editPassword = '';
  editRole = UserRole.PLAYER;

  readonly onlineCount = computed(() => this.realtime.onlineUserIds().length);

  readonly visible = computed(() => {
    const filter = this.filter();
    const online = new Set(this.realtime.onlineUserIds());
    return this.users().filter((user) => {
      if (filter === 'ONLINE') {
        return online.has(user.id);
      }
      if (filter === 'PLAYER') {
        return user.role === UserRole.PLAYER;
      }
      if (filter === 'ADMIN') {
        return user.role === UserRole.ADMIN;
      }
      return true;
    });
  });

  async ngOnInit(): Promise<void> {
    this.realtime.subscribePresence();
    await this.refresh();
  }

  ngOnDestroy(): void {
    this.realtime.unsubscribePresence();
  }

  isOnline(userId: string): boolean {
    return this.realtime.onlineUserIds().includes(userId);
  }

  startEdit(user: UserDto): void {
    this.editingId.set(user.id);
    this.editName = user.name;
    this.editEmail = user.email;
    this.editPassword = '';
    this.editRole = user.role;
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editPassword = '';
  }

  downloadTemplate(): void {
    downloadUserSheetTemplate();
  }

  async onSheetSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.bulkResult.set(null);
    this.bulkRows.set([]);
    this.bulkFileName.set(null);
    if (!file) {
      return;
    }
    await this.guard(async () => {
      const rows = await parseUserSheet(file);
      if (!rows.length) {
        throw new Error('No name/email rows found. Use the template or add those column headers.');
      }
      this.bulkFileName.set(file.name);
      this.bulkRows.set(rows);
    });
    input.value = '';
  }

  async createBulk(): Promise<void> {
    const users = this.bulkRows();
    if (!users.length) {
      return;
    }
    this.bulkBusy.set(true);
    try {
      await this.guard(async () => {
        const result = await this.api.createUsersBulk({
          password: this.bulkPassword,
          role: this.bulkRole,
          users,
        });
        this.bulkResult.set(result);
        this.bulkRows.set([]);
        this.bulkFileName.set(null);
        await this.refresh();
      });
    } finally {
      this.bulkBusy.set(false);
    }
  }

  async create(): Promise<void> {
    await this.guard(async () => {
      await this.api.createUser({
        name: this.createName,
        email: this.createEmail,
        password: this.createPassword,
        role: this.createRole,
      });
      this.createName = '';
      this.createEmail = '';
      this.createPassword = 'Player123!';
      this.createRole = UserRole.PLAYER;
      await this.refresh();
    });
  }

  async save(id: string): Promise<void> {
    await this.guard(async () => {
      await this.api.updateUser(id, {
        name: this.editName,
        email: this.editEmail,
        role: this.editRole,
        ...(this.editPassword ? { password: this.editPassword } : {}),
      });
      this.cancelEdit();
      await this.refresh();
    });
  }

  async remove(user: UserDto): Promise<void> {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) {
      return;
    }
    await this.guard(async () => {
      await this.api.deleteUser(user.id);
      await this.refresh();
    });
  }

  private async refresh(): Promise<void> {
    const users = await this.api.users();
    this.users.set(users);
    if (!this.realtime.onlineUserIds().length) {
      this.realtime.onlineUserIds.set(users.filter((user) => user.online).map((user) => user.id));
    }
  }

  private async guard(task: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await task();
    } catch (error) {
      this.error.set(httpErrorMessage(error));
    }
  }
}
