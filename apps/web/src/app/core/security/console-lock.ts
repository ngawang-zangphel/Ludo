/**
 * Best-effort lock against casual browser-console / DevTools use in production.
 * Determined users can still bypass this; treat it as a deterrent, not hard security.
 */
export function lockBrowserConsole(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const noop = (): undefined => undefined;
  const methods = [
    'log',
    'debug',
    'info',
    'warn',
    'error',
    'table',
    'dir',
    'dirxml',
    'trace',
    'group',
    'groupCollapsed',
    'groupEnd',
    'clear',
    'count',
    'countReset',
    'assert',
    'profile',
    'profileEnd',
    'time',
    'timeLog',
    'timeEnd',
  ] as const;

  for (const method of methods) {
    try {
      Object.defineProperty(console, method, {
        value: noop,
        writable: false,
        configurable: false,
      });
    } catch {
      try {
        console[method] = noop;
      } catch {
        // Ignore environments that freeze console.
      }
    }
  }

  const blockShortcut = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const withCtrl = event.ctrlKey || event.metaKey;
    const openTools =
      event.key === 'F12' ||
      (withCtrl && event.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) ||
      (event.metaKey && event.altKey && (key === 'i' || key === 'j' || key === 'c'));
    if (openTools) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  document.addEventListener('keydown', blockShortcut, true);
}
