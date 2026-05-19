import { useState, useEffect } from "react";
import * as Location from "expo-location";

export interface LocationResult {
  success: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isMocked: boolean;
  message: string;
}

export function useLocationTracker() {
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
      } catch (err) {
        setPermissionStatus(Location.PermissionStatus.UNDETERMINED);
      }
    })();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      return status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationResult> => {
    setLoading(true);
    try {
      // 1. Verify OS permissions
      let status = permissionStatus;
      if (status !== Location.PermissionStatus.GRANTED) {
        const hasGranted = await requestPermission();
        if (!hasGranted) {
          setLoading(false);
          return {
            success: false,
            latitude: null,
            longitude: null,
            accuracy: null,
            isMocked: false,
            message: "Location permission denied. Please grant device GPS permissions in system settings.",
          };
        }
        status = Location.PermissionStatus.GRANTED;
      }

      // 2. Fetch current hardware coordinates with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balanced/High is highly stable for battery & budget hardware
      });

      const { latitude, longitude, accuracy } = location.coords;

      // 3. Inspect Android/iOS OS mock provider flags (aggressively intercept spoofing apps)
      // coords.mocked is standard on Android, while mocked can also be set directly on the parent payload
      const isMocked = !!((location.coords as any).mocked || (location as any).mocked);

      if (isMocked) {
        setLoading(false);
        return {
          success: false,
          latitude: null,
          longitude: null,
          accuracy: accuracy || null,
          isMocked: true,
          message: "Access Blocked: GPS spoofing/mock location provider detected on your device.",
        };
      }

      // 4. Evaluate precision thresholds (reject signals > 30 meters)
      const accuracyLimit = accuracy || 0;
      if (accuracyLimit > 30) {
        setLoading(false);
        return {
          success: false,
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracyLimit,
          isMocked: false,
          message: `GPS accuracy too low (${Math.round(accuracyLimit)}m). Please Calibrate GPS by moving away from subterranean structures or metal roofs to get a clear coordinate lock.`,
        };
      }

      setLoading(false);
      return {
        success: true,
        latitude,
        longitude,
        accuracy: accuracyLimit,
        isMocked: false,
        message: "GPS telemetry successfully synchronized.",
      };
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        latitude: null,
        longitude: null,
        accuracy: null,
        isMocked: false,
        message: err.message || "Failed to establish a secure GPS coordinate lock.",
      };
    }
  };

  return {
    permissionStatus,
    loading,
    requestPermission,
    getCurrentLocation,
  };
}
