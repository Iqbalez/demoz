import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useAuthStore } from "../../store/authStore";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  leaveType: {
    name: string;
    code: string;
  };
}

interface LeaveBalance {
  code: string;
  name: string;
  allocated: number;
  used: number;
  color: string;
}

export default function LeaveScreen() {
  const { token, employeeDetails } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Leave Form States
  const [selectedType, setSelectedType] = useState("AL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Seed standard Ethiopian labor balances
  const [balances, setBalances] = useState<LeaveBalance[]>([
    { code: "AL", name: "Annual Leave", allocated: 16, used: 4, color: "#10b981" },
    { code: "SL", name: "Sick Leave", allocated: 180, used: 3, color: "#ef4444" },
    { code: "ML", name: "Maternity", allocated: 120, used: 0, color: "#ec4899" },
    { code: "PL", name: "Paternity", allocated: 3, used: 0, color: "#3b82f6" },
  ]);

  // Seed initial mock requests for Simulation Mode
  const [mockRequests, setMockRequests] = useState<LeaveRequest[]>([
    {
      id: "req-101",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      totalDays: 5,
      reason: "Family wedding event in Bahir Dar",
      status: "PENDING",
      createdAt: "2026-05-19",
      leaveType: { name: "Annual Leave", code: "AL" },
    },
    {
      id: "req-102",
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      totalDays: 3,
      reason: "Influenza prescription recovery",
      status: "APPROVED",
      createdAt: "2026-04-09",
      leaveType: { name: "Sick Leave", code: "SL" },
    },
  ]);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    if (!token) {
      setRequests(mockRequests);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/leave/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter requests for currently logged-in employee if backend is connected
        setRequests(data);
      } else {
        setRequests(mockRequests);
      }
    } catch (err) {
      // Fallback silently to mock data in demo/sandbox offline mode
      setRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLeave = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert("Missing Fields", "Please populate all request parameters.");
      return;
    }

    // Dynamic days calculator (excluding Sundays for Ethiopian Proclamation compliance)
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert("Invalid Dates", "Please use standard YYYY-MM-DD formatting.");
      return;
    }
    if (start > end) {
      Alert.alert("Validation Error", "Start date cannot exceed end date.");
      return;
    }

    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0) totalDays++; // Exclude Sundays per 1156/2019 limits
      current.setDate(current.getDate() + 1);
    }

    const payload = {
      employeeId: employeeDetails?.idNumber || "emp-mock",
      leaveTypeCode: selectedType,
      startDate,
      endDate,
      reason,
    };

    setLoading(true);

    if (token) {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/leave/requests`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          Alert.alert("Success", "Your leave request has been submitted for approval.");
          setModalVisible(false);
          fetchRequests();
          clearForm();
          return;
        } else {
          const errData = await res.json();
          Alert.alert("Submission Rejected", errData.message || "Overlap detected.");
        }
      } catch (err) {
        // Fallback below
      }
    }

    // Local simulation fallback
    const targetBalance = balances.find((b) => b.code === selectedType);
    const newReq: LeaveRequest = {
      id: `req-${Date.now()}`,
      startDate,
      endDate,
      totalDays,
      reason,
      status: "PENDING",
      createdAt: new Date().toISOString().split("T")[0],
      leaveType: {
        name: targetBalance?.name || "Leave Category",
        code: selectedType,
      },
    };

    setMockRequests((prev) => [newReq, ...prev]);
    setRequests((prev) => [newReq, ...prev]);
    Alert.alert("Cached Request", "Simulation: Leave request queued for HR evaluation.");
    setModalVisible(false);
    clearForm();
    setLoading(false);
  };

  const clearForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Balances Section Header */}
        <Text style={styles.sectionHeader}>LEAVE ENTITLEMENT BALANCES</Text>
        <View style={styles.balanceGrid}>
          {balances.map((b) => (
            <View key={b.code} style={styles.balanceCard}>
              <View style={[styles.colorBadge, { backgroundColor: b.color }]} />
              <Text style={styles.cardCode}>{b.code}</Text>
              <Text style={styles.cardName}>{b.name}</Text>
              <Text style={styles.cardDays}>
                {b.allocated - b.used} / {b.allocated} left
              </Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.requestBtnText}>➕ REQUEST NEW LEAVE</Text>
        </TouchableOpacity>

        {/* History Header */}
        <Text style={styles.sectionHeader}>MY ABSENCE JOURNAL</Text>

        {loading ? (
          <ActivityIndicator color="#10b981" size="large" style={{ marginTop: 24 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No registered leave history logs found.</Text>
          </View>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.journalCard}>
              <View style={styles.journalHeader}>
                <Text style={styles.journalCategory}>{item.leaveType.name} ({item.leaveType.code})</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "APPROVED"
                      ? styles.approvedBadge
                      : item.status === "REJECTED"
                      ? styles.rejectedBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.status === "APPROVED"
                        ? styles.approvedText
                        : item.status === "REJECTED"
                        ? styles.rejectedText
                        : styles.pendingText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.journalDates}>
                📅 {item.startDate} to {item.endDate} ({item.totalDays} working days)
              </Text>
              <Text style={styles.journalReason}>Reason: "{item.reason}"</Text>
              
              {item.rejectionReason && (
                <Text style={styles.rejectionLabel}>Rejection Reason: {item.rejectionReason}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Leave Request Form Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SUBMIT LEAVE PETITION</Text>

            {/* Category selection */}
            <Text style={styles.inputLabel}>CATEGORY CODE</Text>
            <View style={styles.categoryPickerRow}>
              {balances.map((b) => (
                <TouchableOpacity
                  key={b.code}
                  onPress={() => setSelectedType(b.code)}
                  style={[
                    styles.pickerBtn,
                    selectedType === b.code && { borderColor: b.color, backgroundColor: "rgba(255, 255, 255, 0.05)" },
                  ]}
                >
                  <Text style={[styles.pickerText, selectedType === b.code && { color: b.color }]}>
                    {b.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inputs */}
            <Text style={styles.inputLabel}>START DATE (YYYY-MM-DD)</Text>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="e.g. 2026-06-01"
              placeholderTextColor="#475569"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>END DATE (YYYY-MM-DD)</Text>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="e.g. 2026-06-05"
              placeholderTextColor="#475569"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>REASON / JUSTIFICATION</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Wedding, family medical recovery etc."
              placeholderTextColor="#475569"
              multiline={true}
              numberOfLines={3}
              style={[styles.textInput, styles.textArea]}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.submitBtn]}
                onPress={handleSubmitLeave}
              >
                <Text style={styles.submitBtnText}>SUBMIT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b13", // Slate navy matching app context
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 10,
  },
  balanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  balanceCard: {
    width: "48%",
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    position: "relative",
  },
  colorBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardCode: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f8fafc",
  },
  cardName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 2,
  },
  cardDays: {
    fontSize: 11,
    fontWeight: "800",
    color: "#e2e8f0",
    marginTop: 8,
  },
  requestBtn: {
    backgroundColor: "#10b981", // Emerald
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  requestBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 20, 38, 0.4)",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  journalCard: {
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  journalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  journalCategory: {
    fontSize: 12,
    fontWeight: "800",
    color: "#f8fafc",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  pendingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  pendingText: {
    color: "#f59e0b",
  },
  approvedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  approvedText: {
    color: "#10b981",
  },
  rejectedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  rejectedText: {
    color: "#ef4444",
  },
  journalDates: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
    marginTop: 8,
  },
  journalReason: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
    fontStyle: "italic",
  },
  rejectionLabel: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "700",
    marginTop: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#0d1426",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 24,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  categoryPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  pickerText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748b",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
  },
  submitBtn: {
    backgroundColor: "#10b981",
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
});
