const STORAGE_KEY = 'arena.snakes.view3d';

export function readSnakesView3d(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeSnakesView3d(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Private mode or blocked storage should not break the table.
  }
}
