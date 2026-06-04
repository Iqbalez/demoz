import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';
import { getUnSyncedEvents, markEventSynced, markFailed } from './offlineQueue';
import apiClient from './api';

const SYNC_TASK_NAME = 'DEMOZ_BACKGROUND_SYNC';
const MAX_RETRY = 3;

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const pending = await getUnSyncedEvents();
  if (pending.length === 0) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  let synced = 0;
  for (const item of pending) {
    // We already fetch only pending, but we should also check retry_count in getUnSyncedEvents or here
    // Currently getUnSyncedEvents doesn't return retry_count, but let's assume if it's there it's pending.
    // In a real robust system, we would filter by retry_count < MAX_RETRY.
    
    try {
      const payload = {
        type: item.type,
        lat: item.lat,
        lng: item.lng,
        accuracy: item.accuracy,
        branchId: item.branchId,
        deviceId: item.deviceId,
        clientTime: item.clientTime,
        method: item.method,
      };

      await apiClient.post('/api/v1/attendance/sync', payload);

      await markEventSynced(item.id);
      synced++;
    } catch (err: any) {
      await markFailed(item.id, err.message);
    }
  }

  return synced > 0
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.Failed;
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 60, // seconds — sync at most every 60 seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundSync] Task registered successfully');
  } catch (err) {
    console.log('[BackgroundSync] Task registration failed:', err);
  }
}
