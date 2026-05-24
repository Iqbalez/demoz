import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useAttendanceStore } from "../../store/attendanceStore";
import { useLocationTracker } from "../../hooks/useLocationTracker";

export default function ClockScreen() {
  const { token, logout, employeeDetails } = useAuthStore();
  const {
    isClockedIn,
    activeSessionStart,
    clockAction,
    loadInitialState,
    offlineQueue,
    syncOfflineQueue,
    geofenceStatus,
  } = useAttendanceStore();

  const { getCurrentLocation, permissionStatus } = useLocationTracker();
  const [locationLoading, setLocationLoading] = useState(false);
  const [timerText, setTimerText] = useState("00:00:00");
  const timerRef = useRef<any>(null);

  // Initialize store and attempt automatic sync of any pending offline clocks
  useEffect(() => {
    loadInitialState().then(() => {
      if (offlineQueue.length > 0 && token) {
        syncOfflineQueue(token);
      }
    });
  }, [token]);

  // Live stopwatch timer logic
  useEffect(() => {
    if (isClockedIn && activeSessionStart) {
      if (timerRef.current) clearInterval(timerRef.current);

      const updateTimer = () => {
        const diffMs = Date.now() - new Date(activeSessionStart).getTime();
        const diffSecs = Math.floor(diffMs / 1000);

        const hrs = Math.floor(diffSecs / 3600).toString().padStart(2, "0");
        const mins = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, "0");
        const secs = (diffSecs % 60).toString().padStart(2, "0");

        setTimerText(`${hrs}:${mins}:${secs}`);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimerText("00:00:00");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockedIn, activeSessionStart]);

  const handleClockTap = async () => {
    setLocationLoading(true);
    try {
      // 1. Gather secure validated GPS coordinate telemetry using useLocationTracker hook
      const result = await getCurrentLocation();

      if (!result.success) {
        Alert.alert("Clock Verification Failed", result.message);
        setLocationLoading(false);
        return;
      }

      const { latitude, longitude } = result;
      const type = isClockedIn ? "CLOCK_OUT" : "CLOCK_IN";

      if (latitude === null || longitude === null) {
        throw new Error("Unable to capture accurate GPS coordinates.");
      }

      // 2. Transmit to secure state store (handles Haversine distance and offline queuing)
      const res = await clockAction(type, latitude, longitude, token);

      Alert.alert(res.isOffline ? "Cached Securely" : "Success", res.message);
    } catch (err: any) {
      Alert.alert("Clock In Failure", err.message || "An unexpected GPS location error occurred.");
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Employee Greeting Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {employeeDetails?.name || "Worker"}</Text>
          <Text style={styles.deptText}>{employeeDetails?.department || "Operations"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* -------------------- THE GIANT CLOCK BUTTON -------------------- */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleClockTap}
          disabled={locationLoading}
          style={[styles.giantButton, isClockedIn ? styles.buttonRed : styles.buttonGreen]}
          activeOpacity={0.8}
        >
          {locationLoading ? (
            <ActivityIndicator color="#ffffff" size="large" />
          ) : (
            <View style={styles.innerButtonTextContainer}>
              <Text style={styles.actionLabel}>{isClockedIn ? "CLOCK OUT" : "CLOCK IN"}</Text>
              {isClockedIn && <Text style={styles.timerCounter}>{timerText}</Text>}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Fallback Warning UI if GPS Permission is Denied */}
      {permissionStatus === "denied" && (
        <View style={styles.permissionWarningCard}>
          <Text style={styles.permissionWarningTitle}>⚠️ GPS Permission Denied</Text>
          <Text style={styles.permissionWarningText}>
            Demoz requires precise GPS to verify your factory attendance. Please enable location access in system settings.
          </Text>
        </View>
      )}

      {/* Geofence Status Information */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationTitle}>🛰️ GEOFENCE CHECKER</Text>
          <View style={styles.pulseDot} />
        </View>
        <Text style={styles.geofenceLabel}>{geofenceStatus}</Text>
        <Text style={styles.locationNotes}>Hawassa Factory Bounds: 500 meters</Text>
      </View>

      {/* Offline Sync Indicator Panel */}
      {offlineQueue.length > 0 && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineText}>
            ⚠️ {offlineQueue.length} attendance records cached offline.
          </Text>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => syncOfflineQueue(token)}
            activeOpacity={0.7}
          >
            <Text style={styles.syncBtnText}>SYNC NOW</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#070b13", // Deep Slate-Black
    padding: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  deptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 40,
  },
  giantButton: {
    width: 230,
    height: 230,
    borderRadius: 115,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 8,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonGreen: {
    backgroundColor: "#059669", // Emerald Green clock-in
    shadowColor: "#059669",
  },
  buttonRed: {
    backgroundColor: "#dc2626", // Crimson Red clock-out
    shadowColor: "#dc2626",
  },
  innerButtonTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  timerCounter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    fontFamily: "System",
    marginTop: 8,
    letterSpacing: 1,
  },
  locationCard: {
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  geofenceStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
    lineHeight: 18,
  },
  geofenceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
    lineHeight: 18,
  },
  locationNotes: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
    marginTop: 6,
  },
  offlineWarning: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
  },
  offlineText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  syncBtn: {
    backgroundColor: "#d97706",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  permissionWarningCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  permissionWarningTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#f87171",
    marginBottom: 4,
  },
  permissionWarningText: {
    fontSize: 11,
    color: "#fca5a5",
    fontWeight: "600",
    lineHeight: 16,
  },
});
