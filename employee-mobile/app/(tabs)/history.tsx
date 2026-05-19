import React, { memo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useAttendanceStore, MobileAttendanceLog } from "../../store/attendanceStore";

// 1. Standalone memoized log item row to prevent unneeded item re-renders
const LogItemRow = memo(({ item }: { item: MobileAttendanceLog }) => {
  const isClockIn = item.type === "CLOCK_IN";

  // Status badge colors
  let statusText = "✓ COMPLIANT";
  let statusColor = "#10b981";
  let statusBg = "rgba(16, 185, 129, 0.08)";

  if (item.status === "INFRACTION") {
    statusText = "⚠️ INFRACTION";
    statusColor = "#ef4444";
    statusBg = "rgba(239, 68, 68, 0.08)";
  } else if (item.status === "PENDING_SYNC") {
    statusText = "⏳ PENDING SYNC";
    statusColor = "#fbbf24";
    statusBg = "rgba(245, 158, 11, 0.08)";
  }

  const dateObj = new Date(item.timestamp);
  const formattedTime = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = dateObj.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={styles.logCard}>
      <View style={styles.logMain}>
        {/* Action badge */}
        <View style={[styles.actionBadge, isClockIn ? styles.badgeGreen : styles.badgeAmber]}>
          <Text style={[styles.actionText, isClockIn ? styles.textGreen : styles.textAmber]}>
            {isClockIn ? "IN" : "OUT"}
          </Text>
        </View>

        <View style={styles.logMeta}>
          <Text style={styles.logTime}>{formattedTime}</Text>
          <Text style={styles.logDate}>{formattedDate}</Text>
        </View>
      </View>

      <View style={styles.logRight}>
        {/* Status chip */}
        <View
          style={[
            styles.statusChip,
            { backgroundColor: statusBg, borderColor: statusColor + "20" },
          ]}
        >
          <Text style={[styles.statusTextLabel, { color: statusColor }]}>{statusText}</Text>
        </View>
        {item.isOffline && <Text style={styles.offlineTag}>Offline Log</Text>}
      </View>
    </View>
  );
});

// Set display name for better debugging output
LogItemRow.displayName = "LogItemRow";

export default function HistoryScreen() {
  const { historyLogs, clearHistory } = useAttendanceStore();

  const handleClearConfirm = () => {
    Alert.alert("Reset Logs", "Are you sure you want to clear your local logs cache history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear Logs", style: "destructive", onPress: clearHistory },
    ]);
  };

  const renderItem = React.useCallback(({ item }: { item: MobileAttendanceLog }) => {
    return <LogItemRow item={item} />;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.headerLabel}>WEEKLY LEDGER RECORDINGS</Text>
        {historyLogs.length > 0 && (
          <TouchableOpacity onPress={handleClearConfirm} activeOpacity={0.7}>
            <Text style={styles.clearText}>RESET CACHE</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={historyLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        // CPU Optimization: Pre-configure batch render boundaries to match low-end phone frames
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        // Skip layout measurements by defining fixed row layouts (exactly 76px card + 10px margin)
        getItemLayout={(data, index) => ({
          length: 86,
          offset: 86 * index,
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No attendance entries recorded this week.</Text>
            <Text style={styles.emptySub}>
              Your clock-in telemetry logs will stream here automatically.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b13", // Slate navy background
    padding: 20,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
  },
  clearText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ef4444",
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  logCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 14,
    height: 76,
    marginBottom: 10,
  },
  logMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  badgeAmber: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  actionText: {
    fontSize: 10,
    fontWeight: "900",
  },
  textGreen: {
    color: "#10b981",
  },
  textAmber: {
    color: "#f59e0b",
  },
  logMeta: {
    justifyContent: "center",
  },
  logTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  logDate: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  logRight: {
    alignItems: "flex-end",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTextLabel: {
    fontSize: 9,
    fontWeight: "800",
  },
  offlineTag: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fbbf24",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "right",
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
    maxWidth: 240,
    lineHeight: 16,
  },
});
