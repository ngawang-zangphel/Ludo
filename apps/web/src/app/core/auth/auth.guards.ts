import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.restore();
  }
  if (!auth.user()) {
    await router.navigate(['/login']);
    return false;
  }
  return true;
};

export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!(await authGuard(route, state))) {
    return false;
  }
  if (!auth.isAdmin()) {
    await router.navigate(['/']);
    return false;
  }
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.ready()) {
    await auth.restore();
  }
  if (auth.user()) {
    await router.navigate([auth.isAdmin() ? '/admin' : '/']);
    return false;
  }
  return true;
};
