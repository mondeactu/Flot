import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const DB_NAME = 'flot_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        local_photo_uri TEXT,
        storage_bucket TEXT,
        storage_path TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

export interface QueueItem {
  id: number;
  type: 'fuel_fill' | 'cleaning' | 'incident';
  payload: string;
  local_photo_uri: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  created_at: string;
}

export async function addToQueue(
  type: 'fuel_fill' | 'cleaning' | 'incident',
  payload: Record<string, unknown>,
  localPhotoUri?: string,
  storageBucket?: string,
  storagePath?: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO offline_queue (type, payload, local_photo_uri, storage_bucket, storage_path) VALUES (?, ?, ?, ?, ?)',
    [
      type,
      JSON.stringify(payload),
      localPhotoUri ?? null,
      storageBucket ?? null,
      storagePath ?? null,
    ]
  );
}

export async function getQueueCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_queue'
  );
  return result?.count ?? 0;
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<QueueItem>(
    'SELECT * FROM offline_queue ORDER BY created_at ASC'
  );
  return rows;
}

async function uploadPhoto(
  localUri: string,
  bucket: string,
  path: string
): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    throw new Error(`Fichier local introuvable : ${localUri}`);
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, byteArray, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  // Delete local file after successful upload
  await FileSystem.deleteAsync(localUri, { idempotent: true });

  return path;
}

async function processItem(item: QueueItem): Promise<void> {
  const payload = JSON.parse(item.payload);

  // Upload photo if exists
  if (item.local_photo_uri && item.storage_bucket && item.storage_path) {
    const storagePath = await uploadPhoto(
      item.local_photo_uri,
      item.storage_bucket,
      item.storage_path
    );

    // Update payload with storage URL
    if (item.type === 'fuel_fill') {
      payload.receipt_photo_url = storagePath;
    } else if (item.type === 'cleaning') {
      // Cleaning can have multiple photo fields; the path prefix tells us which one
      if (item.storage_path.includes('receipt')) {
        payload.receipt_photo_url = storagePath;
      }
    } else if (item.type === 'incident') {
      payload.photo_url = storagePath;
    }
  }

  // Submit record to Supabase
  const tableName =
    item.type === 'fuel_fill'
      ? 'fuel_fills'
      : item.type === 'cleaning'
        ? 'cleanings'
        : 'incidents';

  const { error } = await supabase.from(tableName).insert(payload);
  if (error) throw error;

  // Remove from queue
  const database = await getDb();
  await database.runAsync('DELETE FROM offline_queue WHERE id = ?', [item.id]);
}

export async function processQueue(): Promise<number> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return 0;

  const items = await getQueueItems();
  let processed = 0;

  for (const item of items) {
    try {
      await processItem(item);
      processed++;
    } catch (err) {
      console.error(`Erreur lors du traitement de l'élément ${item.id} :`, err);
      break; // Stop processing on first error to maintain order
    }
  }

  return processed;
}

// NetInfo listener to auto-process queue when reconnecting
let unsubscribeNetInfo: (() => void) | null = null;

export function startQueueListener(
  onSynced?: (count: number) => void
): void {
  if (unsubscribeNetInfo) return;

  unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const count = await processQueue();
      if (count > 0 && onSynced) {
        onSynced(count);
      }
    }
  });
}

export function stopQueueListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

export async function savePhotoLocally(
  uri: string,
  filename: string
): Promise<string> {
  const dir = `${FileSystem.documentDirectory}flot_offline_photos/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const destUri = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: destUri });
  return destUri;
}
