import { useState, useEffect } from 'react';
import { enqueueAttendanceEvent, getQueueSize, getUnSyncedEvents, markEventSynced } from '../utils/offlineQueue';
import apiClient from '../utils/api';
import * as SecureStore from 'expo-secure-store';

export const useAttendance = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [unSyncedCount, setUnSyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Fallback: Assume online. If NetInfo is installed, update this to track connectivity.
    setIsOnline(true);
  }, []);

  const refreshUnSyncedCount = async () => {
    const count = await getQueueSize();
    setUnSyncedCount(count);
  };

  useEffect(() => {
    refreshUnSyncedCount();
    const interval = setInterval(refreshUnSyncedCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const clockIn = async (branchId: string, lat: number, lng: number, accuracy: number): Promise<{ success: boolean, message: string }> => {
    if (accuracy > 120) {
      return Promise.reject({ success: false, message: 'GPS accuracy too low. Please try again outdoors.' });
    }

    const payload = {
      type: 'CLOCK_IN' as const,
      lat,
      lng,
      accuracy,
      branchId,
      clientTime: new Date().toISOString(),
      method: 'GPS',
    };

    if (!isOnline) {
      await enqueueAttendanceEvent(payload);
      refreshUnSyncedCount();
      return { success: true, message: 'Saved offline. Will sync when online.' };
    }

    try {
      const res = await apiClient.post('/api/v1/attendance/sync', payload);
      return { success: true, message: res.data?.message || 'Clocked in successfully.' };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, message: msg || 'Session expired. Please log in again.' };
      }
      await enqueueAttendanceEvent(payload);
      refreshUnSyncedCount();
      return { success: true, message: 'Saved offline. Will sync when online.' };
    }
  };

  const clockOut = async (branchId: string, lat: number = 0, lng: number = 0, accuracy: number = 999): Promise<{ success: boolean, message: string }> => {
    const payload = {
      type: 'CLOCK_OUT' as const,
      lat,
      lng,
      accuracy,
      branchId,
      clientTime: new Date().toISOString(),
      method: 'GPS',
    };

    if (!isOnline) {
      await enqueueAttendanceEvent(payload);
      refreshUnSyncedCount();
      return { success: true, message: 'Saved offline. Will sync when online.' };
    }

    try {
      const res = await apiClient.post('/api/v1/attendance/sync', payload);
      return { success: true, message: res.data?.message || 'Clocked out successfully.' };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, message: msg || 'Session expired. Please log in again.' };
      }
      await enqueueAttendanceEvent(payload);
      refreshUnSyncedCount();
      return { success: true, message: 'Saved offline. Will sync when online.' };
    }
  };

  const manualClockIn = async (branchId: string): Promise<{ success: boolean, message: string }> => {
    const payload = {
      type: 'CLOCK_IN' as const,
      lat: 0,
      lng: 0,
      accuracy: 999,
      branchId,
      clientTime: new Date().toISOString(),
      method: 'MANUAL_OVERRIDE',
    };

    await enqueueAttendanceEvent(payload);
    refreshUnSyncedCount();
    return { success: true, message: 'Manual clock-in recorded. Waiting to sync.' };
  };

  const syncNow = async (): Promise<{ synced: number, failed: number }> => {
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const events = await getUnSyncedEvents();
      if (events.length === 0) {
        setIsSyncing(false);
        return { synced: 0, failed: 0 };
      }

      for (const event of events) {
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
          });

          if (response.status === 200 || response.status === 201) {
            const marked = await markEventSynced(event.id);
            if (marked) {
              synced++;
            }
          } else {
            failed++;
          }
        } catch (err: any) {
          failed++;
        }
      }
    } finally {
      setIsSyncing(false);
      refreshUnSyncedCount();
    }

    return { synced, failed };
  };

  return {
    isOnline,
    unSyncedCount,
    isSyncing,
    clockIn,
    clockOut,
    manualClockIn,
    syncNow,
  };
};
