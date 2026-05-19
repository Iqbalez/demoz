import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import apiClient from "../utils/api";
import { useAuthStore } from "./authStore";

export interface MobileAttendanceLog {
  id: string;
  timestamp: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  latitude: number;
  longitude: number;
  isOffline: boolean;
  isSynced: boolean;
  status: "COMPLIANT" | "INFRACTION" | "PENDING_SYNC";
}

interface AttendanceState {
  isClockedIn: boolean;
  activeSessionStart: string | null;
  historyLogs: MobileAttendanceLog[];
  offlineQueue: Omit<MobileAttendanceLog, "id" | "status" | "isSynced">[];
  isLoading: boolean;
  geofenceStatus: string;

  loadInitialState: () => Promise<void>;
  clockAction: (
    type: "CLOCK_IN" | "CLOCK_OUT",
    lat: number,
    lng: number,
    token: string | null
  ) => Promise<{ success: boolean; isOffline: boolean; message: string }>;
  syncOfflineQueue: (token: string | null) => Promise<{ success: boolean; count: number }>;
  clearHistory: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => {
  // Set up periodic SRE Background Sync heartbeat loop (every 10 seconds)
  let syncInterval: any = null;

  const startBackgroundSyncLoop = () => {
    if (syncInterval) return;
    syncInterval = setInterval(() => {
      const activeToken = useAuthStore.getState().token;
      const currentQueue = get().offlineQueue;
      if (currentQueue.length > 0 && activeToken) {
        get().syncOfflineQueue(activeToken).catch(() => {
          // Silent catch to prevent background thread crashing
        });
      }
    }, 10000);
  };

  return {
    isClockedIn: false,
    activeSessionStart: null,
    historyLogs: [],
    offlineQueue: [],
    isLoading: false,
    geofenceStatus: "Status: Standby GPS Lock",

    loadInitialState: async () => {
      set({ isLoading: true });
      try {
        const savedClockState = await AsyncStorage.getItem("clock_in_state");
        const savedStart = await AsyncStorage.getItem("clock_session_start");
        const savedHistory = await AsyncStorage.getItem("attendance_history");

        // Load cryptographic offline queue safely
        let secureQueue: any[] = [];
        try {
          const rawQueue = await SecureStore.getItemAsync("secure_offline_queue");
          if (rawQueue) secureQueue = JSON.parse(rawQueue);
        } catch (e) {
          // Fallback if secure store is uninitialized
          const fallback = await AsyncStorage.getItem("secure_offline_queue_fallback");
          if (fallback) secureQueue = JSON.parse(fallback);
        }

        set({
          isClockedIn: savedClockState === "true",
          activeSessionStart: savedStart,
          historyLogs: savedHistory ? JSON.parse(savedHistory) : [],
          offlineQueue: secureQueue,
          isLoading: false,
        });

        // Trigger background sync heartbeat loop
        startBackgroundSyncLoop();
      } catch (err) {
        set({ isLoading: false });
      }
    },

    clockAction: async (
      type: "CLOCK_IN" | "CLOCK_OUT",
      lat: number,
      lng: number,
      token: string | null
    ) => {
      // 1. Instantly perform Haversine local calculations to provide premium UX feedback
      const timestampStr = new Date().toISOString();
      const HAWASSA_LAT = 7.0292;
      const HAWASSA_LNG = 38.4721;
      const R = 6371000;
      const dLat = ((lat - HAWASSA_LAT) * Math.PI) / 180;
      const dLng = ((lng - HAWASSA_LNG) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((HAWASSA_LAT * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = R * c;

      const insideGeofence = distanceMeters <= 500;
      const statusText = insideGeofence
        ? "Status: Inside Hawassa Factory Geofence."
        : `Status: Geofence violation! ${Math.round(distanceMeters)}m outside Hawassa bound.`;

      set({ geofenceStatus: statusText });

      // 2. Perform Optimistic Local Mutation (0ms UI latency)
      const optimisticLog: MobileAttendanceLog = {
        id: `l-${Math.floor(10000 + Math.random() * 90000)}`,
        timestamp: timestampStr,
        type,
        latitude: lat,
        longitude: lng,
        isOffline: true,
        isSynced: false,
        status: "PENDING_SYNC",
      };

      const updatedHistory = [optimisticLog, ...get().historyLogs];
      const newQueueItem = {
        timestamp: timestampStr,
        type,
        latitude: lat,
        longitude: lng,
        isOffline: true,
      };

      const updatedQueue = [...get().offlineQueue, newQueueItem];

      // Commit to local disk state immediately
      await AsyncStorage.setItem("attendance_history", JSON.stringify(updatedHistory));
      
      if (type === "CLOCK_IN") {
        await AsyncStorage.setItem("clock_in_state", "true");
        await AsyncStorage.setItem("clock_session_start", timestampStr);
        set({
          isClockedIn: true,
          activeSessionStart: timestampStr,
          historyLogs: updatedHistory,
          offlineQueue: updatedQueue,
        });
      } else {
        await AsyncStorage.setItem("clock_in_state", "false");
        await AsyncStorage.removeItem("clock_session_start");
        set({
          isClockedIn: false,
          activeSessionStart: null,
          historyLogs: updatedHistory,
          offlineQueue: updatedQueue,
        });
      }

      try {
        await SecureStore.setItemAsync("secure_offline_queue", JSON.stringify(updatedQueue));
      } catch (e) {
        await AsyncStorage.setItem("secure_offline_queue_fallback", JSON.stringify(updatedQueue));
      }

      // 3. Fire-and-Forget Asynchronous Background Upload
      if (token) {
        get().syncOfflineQueue(token).catch(() => {
          // Swallow silent retry fallbacks for subsequent loops
        });
      }

      return {
        success: true,
        isOffline: true,
        message: "Attendance recorded locally! Syncing in progress in the background.",
      };
    },

    syncOfflineQueue: async (token: string | null) => {
      const queue = get().offlineQueue;
      if (queue.length === 0) return { success: true, count: 0 };

      try {
        // Enforce Background Sync Batching to safeguard NestJS thread pools
        const response = await apiClient.post(
          "/api/v1/attendance/batch",
          { logs: queue },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 200 || response.status === 201) {
          // Sync succeeded: Purge secure queue cache
          await SecureStore.deleteItemAsync("secure_offline_queue");
          await AsyncStorage.removeItem("secure_offline_queue_fallback");

          // Update local history elements to represents synced states
          const syncedHistory = get().historyLogs.map((log) => {
            if (log.status === "PENDING_SYNC") {
              return {
                ...log,
                isOffline: false,
                isSynced: true,
                status: "COMPLIANT" as const,
              };
            }
            return log;
          });

          await AsyncStorage.setItem("attendance_history", JSON.stringify(syncedHistory));

          set({
            offlineQueue: [],
            historyLogs: syncedHistory,
          });

          return { success: true, count: queue.length };
        }
      } catch (err: any) {
        // Silent recovery - keep logs in queue and wait for next background loop
      }

      return { success: false, count: 0 };
    },

    clearHistory: async () => {
      await AsyncStorage.removeItem("attendance_history");
      set({ historyLogs: [] });
    },
  };
});
