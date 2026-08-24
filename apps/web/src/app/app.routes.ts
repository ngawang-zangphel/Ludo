import { Route } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register.page').then((module) => module.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lobby/pages/lobby.page').then((module) => module.LobbyPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile.page').then((module) => module.ProfilePage),
  },
  {
    path: 'play/:matchId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/game/pages/play/play.page').then((module) => module.PlayPage),
  },
  {
    path: 'local',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/game/pages/local-match/local-match.page').then(
        (module) => module.LocalMatchPage
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-dashboard.page').then(
        (module) => module.AdminDashboardPage
      ),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-users.page').then((module) => module.AdminUsersPage),
  },
  {
    path: 'admin/tournaments',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/admin-tournaments.page').then(
        (module) => module.AdminTournamentsPage
      ),
  },
  {
    path: 'admin/matches/:matchId',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/game/pages/spectator/spectator.page').then(
        (module) => module.SpectatorPage
      ),
  },
  {
    path: 'broadcast',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/game/pages/broadcast/broadcast.page').then(
        (module) => module.BroadcastPage
      ),
  },
  { path: '**', redirectTo: '' },
];
