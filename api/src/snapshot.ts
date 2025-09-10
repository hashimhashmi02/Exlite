import { prisma } from './db.js';
import { dumpState, EngineState, restoreState } from './engine.js';

const KEY = 'engine_state';
let saveTimer: NodeJS.Timeout | null = null;

function debounceSave(delayMs = 1000) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persistNow().catch(console.error), delayMs);
}

export function scheduleSnapshotSave() {
  debounceSave(750); // write-burst ko smooth karo
}

export async function persistNow() {
  const data: EngineState = dumpState();
  await prisma.snapshot.upsert({
    where: { key: KEY },
    update: { data },
    create: { key: KEY, data }
  });
  // console.log('💾 snapshot saved');
}

export async function restoreFromDB() {
  const row = await prisma.snapshot.findUnique({ where: { key: KEY } });
  if (!row?.data) return false;
  // TS hint: data any hai — assume it matches EngineState shape
  restoreState(row.data as EngineState);
  return true;
}

export async function loadAndEnsure() {
  const ok = await restoreFromDB();
  if (!ok) {
    // No prior snapshot — create initial snapshot so next diff is small
    await persistNow();
  }
}
