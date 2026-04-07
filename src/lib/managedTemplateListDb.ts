import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TemplateListItem } from '../types/managedTemplate';

const DB_NAME = 'contractos-managed-templates-v1';
const STORE = 'templateList';
const ROW_KEY = 'default';
const DB_VERSION = 1;

interface ManagedListDB extends DBSchema {
  templateList: {
    key: string;
    value: { key: string; items: TemplateListItem[] };
  };
}

let dbPromise: Promise<IDBPDatabase<ManagedListDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ManagedListDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ManagedListDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadManagedTemplateListFromDb(): Promise<
  TemplateListItem[] | undefined
> {
  const db = await getDb();
  const row = await db.get(STORE, ROW_KEY);
  return row?.items;
}

export async function saveManagedTemplateListToDb(
  items: TemplateListItem[],
): Promise<void> {
  const db = await getDb();
  await db.put(STORE, { key: ROW_KEY, items });
}
