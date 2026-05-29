import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useLocationTracker } from "../../hooks/useLocationTracker";
import { useAttendance } from "../../hooks/useAttendance";

export default function ClockScreen() {
  const { token, logout, employeeDetails } = useAuthStore();
  
  const {
    isOnline,
    unSyncedCount,
    isSyncing,
    clockIn,
    clockOut,
    manualClockIn,
    syncNow,
  } = useAttendance();

  const { getCurrentLocation, permissionStatus } = useLocationTracker();
  const [locationLoading, setLocationLoading] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false); // Using local state for UI demonstration
  const [timerText, setTimerText] = useState("00:00:00");
  const timerRef = useRef<any>(null);

  // Mock a branch ID for now - in production this would come from the employee details
  const branchId = employeeDetails?.branchId || undefined;

  const handleClockIn = async () => {
    setLocationLoading(true);
    try {
      const result = await getCurrentLocation();
      if (!result.success) {
        Alert.alert("Clock Verification Failed", result.message);
        setLocationLoading(false);
        return;
      }

      const res = await clockIn(branchId, result.latitude!, result.longitude!, result.accuracy || 10);
      if (res.success) {
        Alert.alert("Success", res.message);
        setIsClockedIn(true);
      } else {
        Alert.alert("Error", res.message);
      }
    } catch (err: any) {
      Alert.alert("Clock In Failure", err.message || "An unexpected GPS location error occurred.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLocationLoading(true);
    try {
      const result = await getCurrentLocation();
      if (!result.success) {
        Alert.alert("Clock Verification Failed", result.message);
        setLocationLoading(false);
        return;
      }

      const res = await clockOut(branchId, result.latitude!, result.longitude!, result.accuracy || 10);
      if (res.success) {
        Alert.alert("Success", res.message);
        setIsClockedIn(false);
      } else {
        Alert.alert("Error", res.message);
      }
    } catch (err: any) {
      Alert.alert("Clock Out Failure", err.message || "An unexpected GPS location error occurred.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleManualClockIn = async () => {
    Alert.alert(
      "Manual Clock In",
      "This will record a manual entry without GPS verification. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            const res = await manualClockIn(branchId);
            Alert.alert("Manual Entry", res.message);
            setIsClockedIn(true);
          }
        }
      ]
    );
  };

  const handleSyncNow = async () => {
    const res = await syncNow();
    Alert.alert("Sync Complete", `Synced: ${res.synced}, Failed: ${res.failed}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {employeeDetails?.name || "Worker"}</Text>
          <Text style={styles.deptText}>{employeeDetails?.department || "Operations"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={locationLoading}
          style={[styles.giantButton, isClockedIn ? styles.buttonRed : styles.buttonGreen]}
          activeOpacity={0.8}
        >
          {locationLoading ? (
            <ActivityIndicator color="#ffffff" size="large" />
          ) : (
            <View style={styles.innerButtonTextContainer}>
              <Text style={styles.actionLabel}>{isClockedIn ? "CLOCK OUT" : "CLOCK IN"}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {permissionStatus === "denied" && !isClockedIn && (
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualClockIn}>
            <Text style={styles.manualBtnText}>MANUAL CLOCK IN</Text>
          </TouchableOpacity>
        )}
      </View>

      {permissionStatus === "denied" && (
        <View style={styles.permissionWarningCard}>
          <Text style={styles.permissionWarningTitle}>⚠️ GPS Permission Denied</Text>
          <Text style={styles.permissionWarningText}>
            Demoz requires precise GPS to verify your factory attendance. Please enable location access in system settings.
          </Text>
        </View>
      )}

      {/* Sync Status Bar */}
      <View style={styles.statusBar}>
        <Text style={[styles.statusOnline, !isOnline && styles.statusOffline]}>
          {isOnline ? "🟢 Online" : "🔴 Offline"}
        </Text>
        
        {unSyncedCount > 0 && (
          <View style={styles.syncContainer}>
            <Text style={styles.unSyncedText}>{unSyncedCount} events waiting to sync</Text>
            {!isOnline && (
              <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={isSyncing}>
                <Text style={styles.syncBtnText}>{isSyncing ? "SYNCING..." : "SYNC NOW"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#070b13",
    padding: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 40,
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
    backgroundColor: "#059669",
    shadowColor: "#059669",
  },
  buttonRed: {
    backgroundColor: "#dc2626",
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
  manualBtn: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  manualBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
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
  statusBar: {
    backgroundColor: "rgba(13, 20, 38, 0.8)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 16,
  },
  statusOnline: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusOffline: {
    color: "#ef4444",
  },
  syncContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  unSyncedText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "600",
  },
  syncBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
