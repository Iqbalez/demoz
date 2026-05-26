import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getUnSyncedEvents, markEventSynced } from '../utils/offlineQueue';
import apiClient from '../utils/api';
import * as SecureStore from 'expo-secure-store';

const TASK_NAME = 'DEMOZ_ATTENDANCE_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const unsyncedEvents = await getUnSyncedEvents();

    if (unsyncedEvents.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let syncedCount = 0;
    
    // We get the token manually to ensure the task has access if the app is in the background
    const token = await SecureStore.getItemAsync('user_token');
    
    for (const event of unsyncedEvents) {
      try {
        const payload = {
          type: event.type,
          lat: event.lat,
          lng: event.lng,
          accuracy: event.accuracy,
          branchId: event.branchId,
          deviceId: event.deviceId,
          clientTime: event.clientTime,
          method: event.method,
        };

        const response = await apiClient.post('/api/v1/attendance/sync', payload, {
          timeout: 10000,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.status === 200 || response.status === 201) {
          const marked = await markEventSynced(event.id);
          if (marked) {
            syncedCount++;
          }
        }
      } catch (err: any) {
        // Timeout or network error, skip to next
        console.warn(`[AttendanceSyncTask] Failed to sync event ${event.id}:`, err.message);
      }
    }

    if (syncedCount > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;

  } catch (error: any) {
    console.warn('[AttendanceSyncTask] error: ' + error.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerAttendanceSyncTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      return;
    }
    
    const intervalStr = process.env.EXPO_PUBLIC_OFFLINE_SYNC_INTERVAL;
    const intervalMs = intervalStr ? parseInt(intervalStr, 10) : 300000;
    const minimumInterval = Math.floor(intervalMs / 1000); // converting to seconds

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval, // minimumInterval is in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[AttendanceSyncTask] registered successfully');
  } catch (error: any) {
    console.warn('[AttendanceSyncTask] Registration error:', error.message);
  }
};
