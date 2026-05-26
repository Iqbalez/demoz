import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuid } from 'uuid';

const QUEUE_KEY = 'DEMOZ_OFFLINE_QUEUE';

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
  id: string;
  queuedAt: string;
  synced: boolean;
}

export const enqueueAttendanceEvent = async (event: AttendanceEvent) => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: QueuedEvent[] = existing ? JSON.parse(existing) : [];
    const newEvent: QueuedEvent = {
      ...event,
      id: uuid(),
      queuedAt: new Date().toISOString(),
      synced: false,
    };
    queue.push(newEvent);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return { queued: true, eventId: newEvent.id };
  } catch (error: any) {
    console.warn('[OfflineQueue] AsyncStorage error: ' + error.message);
    return { queued: false, eventId: null };
  }
};

export const getUnSyncedEvents = async (): Promise<QueuedEvent[]> => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    if (!existing) return [];
    const queue: QueuedEvent[] = JSON.parse(existing);
    return queue.filter(e => e.synced === false);
  } catch (error: any) {
    console.warn('[OfflineQueue] AsyncStorage error: ' + error.message);
    return [];
  }
};

export const markEventSynced = async (eventId: string) => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    if (!existing) return false;
    const queue: QueuedEvent[] = JSON.parse(existing);
    const eventIndex = queue.findIndex(e => e.id === eventId);
    if (eventIndex > -1) {
      queue[eventIndex].synced = true;
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return true;
    }
    return false;
  } catch (error: any) {
    console.warn('[OfflineQueue] AsyncStorage error: ' + error.message);
    return false;
  }
};

export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (error: any) {
    console.warn('[OfflineQueue] AsyncStorage error: ' + error.message);
  }
};

export const getQueueSize = async () => {
  try {
    const events = await getUnSyncedEvents();
    return events.length;
  } catch (error: any) {
    console.warn('[OfflineQueue] AsyncStorage error: ' + error.message);
    return 0;
  }
};
