import type { BulkUserRowDto } from '@ludo-game/shared-types';
import * as XLSX from 'xlsx';

const NAME_HEADERS = new Set(['name', 'full name', 'fullname', 'player', 'player name', 'username']);
const EMAIL_HEADERS = new Set(['email', 'e-mail', 'mail', 'email address']);

export async function parseUserSheet(file: File): Promise<BulkUserRowDto[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const first = workbook.SheetNames[0];
  if (!first) {
    throw new Error('The spreadsheet is empty.');
  }

  const sheet = workbook.Sheets[first];
  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (table.length) {
    const fromHeaders = table
      .map((row) => readNamedRow(row))
      .filter((row): row is BulkUserRowDto => !!row);
    if (fromHeaders.length) {
      return fromHeaders;
    }
  }

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  return grid
    .map((row) => {
      const cells = row.map((cell) => String(cell ?? '').trim());
      if (cells.every((cell) => !cell)) {
        return null;
      }
      if (isHeaderRow(cells)) {
        return null;
      }
      const name = cells[0] ?? '';
      const email = cells[1] ?? '';
      if (!name || !email) {
        return null;
      }
      return { name, email };
    })
    .filter((row): row is BulkUserRowDto => !!row);
}

export function downloadUserSheetTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['name', 'email'],
    ['Alice Example', 'alice@school.edu'],
    ['Bob Example', 'bob@school.edu'],
  ]);
  sheet['!cols'] = [{ wch: 22 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Users');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'users-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readNamedRow(row: Record<string, unknown>): BulkUserRowDto | null {
  const entries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()] as const);
  const name = entries.find(([key]) => NAME_HEADERS.has(key))?.[1] ?? '';
  const email = entries.find(([key]) => EMAIL_HEADERS.has(key))?.[1] ?? '';
  if (!name || !email) {
    return null;
  }
  return { name, email };
}

function isHeaderRow(cells: string[]): boolean {
  const first = normalizeHeader(cells[0] ?? '');
  const second = normalizeHeader(cells[1] ?? '');
  return NAME_HEADERS.has(first) || EMAIL_HEADERS.has(second);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}
