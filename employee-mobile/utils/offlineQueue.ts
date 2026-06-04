import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('demoz_offline.db');

export interface AttendanceEvent {
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  lat: number;
  lng: number;
  accuracy: number;
  branchId: string;
  deviceId?: string;
  clientTime: string;
  method?: string;
}

export interface QueuedEvent extends AttendanceEvent {
  id: number; // SQLite uses integer ID
  queuedAt: string;
  synced: boolean;
}

// Initialize tables on first load
export function initOfflineDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS attendance_cache (
      employee_id TEXT PRIMARY KEY,
      last_clock_in TEXT,
      last_clock_out TEXT,
      status TEXT,
      updated_at TEXT
    );
  `);
}

// Enqueue an action (clock-in, clock-out) for later sync
export async function enqueueAttendanceEvent(event: AttendanceEvent): Promise<{ queued: boolean, eventId: number | null }> {
  try {
    const result = db.runSync(
      `INSERT INTO sync_queue (action_type, payload, created_at) VALUES (?, ?, ?)`,
      [event.type, JSON.stringify(event), new Date().toISOString()]
    );
    return { queued: true, eventId: result.lastInsertRowId };
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
    return { queued: false, eventId: null };
  }
}

// Get all pending items
export async function getUnSyncedEvents(): Promise<QueuedEvent[]> {
  try {
    const rows = db.getAllSync(`SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`);
    return rows.map((row: any) => {
      const payload = JSON.parse(row.payload);
      return {
        ...payload,
        id: row.id,
        queuedAt: row.created_at,
        synced: row.status === 'synced',
      };
    });
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
    return [];
  }
}

// Mark item as synced
export async function markEventSynced(id: number): Promise<boolean> {
  try {
    db.runSync(`UPDATE sync_queue SET status = 'synced' WHERE id = ?`, [id]);
    return true;
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
    return false;
  }
}

// Mark item as failed with error
export async function markFailed(id: number, error: string): Promise<void> {
  try {
    db.runSync(
      `UPDATE sync_queue SET status = 'failed', error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [error, id]
    );
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
  }
}

// Clear old queue
export async function clearQueue() {
  try {
    db.runSync(`DELETE FROM sync_queue WHERE status = 'synced' OR retry_count >= 10`);
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
  }
}

export async function getQueueSize(): Promise<number> {
  try {
    const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`);
    return row?.count || 0;
  } catch (err) {
    console.warn('[OfflineQueue] SQLite error: ', err);
    return 0;
  }
}
