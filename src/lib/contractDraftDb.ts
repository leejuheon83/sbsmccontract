import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredContractDraft } from './contractDraftTypes';

const DB_NAME = 'contractos-drafts-v1';
const STORE = 'drafts';
const DB_VERSION = 1;

interface DraftDB extends DBSchema {
  drafts: {
    key: string;
    value: StoredContractDraft;
  };
}

let dbPromise: Promise<IDBPDatabase<DraftDB>> | null = null;

function getDb(): Promise<IDBPDatabase<DraftDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DraftDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function putDraft(draft: StoredContractDraft): Promise<void> {
  const db = await getDb();
  await db.put(STORE, draft);
}

export async function getDraft(id: string): Promise<StoredContractDraft | undefined> {
  const db = await getDb();
  return db.get(STORE, id);
}

export async function listDrafts(): Promise<StoredContractDraft[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function patchDraft(
  id: string,
  patch: Partial<StoredContractDraft>,
): Promise<boolean> {
  const existing = await getDraft(id);
  if (!existing) return false;
  await putDraft({ ...existing, ...patch });
  return true;
}
