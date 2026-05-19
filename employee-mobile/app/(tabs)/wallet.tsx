import React, { useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

interface PayslipData {
  id: string;
  month: string;
  gross: number;
  pension: number;
  tax: number;
  net: number;
  reference: string;
}

interface LedgerData {
  title: string;
  time: string;
  amount: number;
}

// 1. Memoized Payslip row item
const PayslipRow = memo(
  ({
    slip,
    onDownload,
    isDownloading,
  }: {
    slip: PayslipData;
    onDownload: (id: string, month: string) => void;
    isDownloading: boolean;
  }) => {
    return (
      <View style={styles.slipCard}>
        <View style={styles.slipInfoContainer}>
          <Text style={styles.slipMonth}>{slip.month}</Text>
          <Text style={styles.slipNet}>Disbursed: {slip.net.toLocaleString()} ETB</Text>
          <Text style={styles.slipRef}>{slip.reference}</Text>
        </View>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => onDownload(slip.id, slip.month)}
          disabled={isDownloading}
          activeOpacity={0.7}
        >
          {isDownloading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.downloadText}>GET PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
);
PayslipRow.displayName = "PayslipRow";

// 2. Memoized Ledger row item
const LedgerRow = memo(({ item }: { item: LedgerData }) => {
  return (
    <View style={styles.ledgerRow}>
      <View>
        <Text style={styles.ledgerTitle}>{item.title}</Text>
        <Text style={styles.ledgerTime}>{item.time}</Text>
      </View>
      <Text style={styles.ledgerAmount}>+{item.amount.toLocaleString()} ETB</Text>
    </View>
  );
});
LedgerRow.displayName = "LedgerRow";

export default function WalletScreen() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const payslips: PayslipData[] = [
    {
      id: "pay-1",
      month: "May 2026",
      gross: 16000,
      pension: 1120,
      tax: 2600,
      net: 12280,
      reference: "CHP-TX-92837",
    },
    {
      id: "pay-2",
      month: "April 2026",
      gross: 16000,
      pension: 1120,
      tax: 2600,
      net: 12280,
      reference: "CHP-TX-81928",
    },
  ];

  const ledgerEntries: LedgerData[] = [
    { title: "Telebirr Payout Success", time: "May 01, 2026 • 10:15 AM", amount: 12280 },
    { title: "Telebirr Payout Success", time: "Apr 01, 2026 • 09:30 AM", amount: 12280 },
  ];

  const handleDownloadPayslip = React.useCallback((id: string, month: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      Alert.alert(
        "PDF Synchronized",
        `Payslip for ${month} successfully downloaded to your device storage. (Ref: verified tax compliant)`
      );
    }, 1500);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container} removeClippedSubviews={true}>
      {/* Earnings Overview */}
      <View style={styles.earningCard}>
        <Text style={styles.earningLabel}>NET MONTHLY EARNINGS</Text>
        <Text style={styles.earningVal}>12,280.00 ETB</Text>
        <View style={styles.divider} />
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Gross Base</Text>
            <Text style={styles.statVal}>16,000 ETB</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Pension (7%)</Text>
            <Text style={styles.statVal}>-1,120 ETB</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Federal Tax</Text>
            <Text style={styles.statVal}>-2,600 ETB</Text>
          </View>
        </View>
      </View>

      {/* PDF Payslips Section */}
      <Text style={styles.sectionHeader}>PDF PAYSLIP DEPOSITORY</Text>

      {payslips.map((slip) => (
        <PayslipRow
          key={slip.id}
          slip={slip}
          onDownload={handleDownloadPayslip}
          isDownloading={downloadingId === slip.id}
        />
      ))}

      {/* Chapa Transaction Ledger */}
      <Text style={styles.sectionHeader}>CHAPA DISBURSEMENT LEDGER</Text>

      <View style={styles.ledgerCard}>
        {ledgerEntries.map((entry, idx) => (
          <React.Fragment key={idx}>
            <LedgerRow item={entry} />
            {idx < ledgerEntries.length - 1 && <View style={styles.ledgerDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Security note */}
      <Text style={styles.securityLabel}>🔒 verified and processed via Chapa payment gateway</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#070b13", // Slate navy background
    padding: 24,
    paddingBottom: 40,
  },
  earningCard: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    padding: 20,
    marginBottom: 24,
  },
  earningLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#10b981",
    letterSpacing: 1,
  },
  earningVal: {
    fontSize: 28,
    fontWeight: "900",
    color: "#f8fafc",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 12,
  },
  slipCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
    marginBottom: 10,
  },
  slipInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  slipMonth: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f8fafc",
  },
  slipNet: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 3,
  },
  slipRef: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
    marginTop: 4,
  },
  downloadBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  downloadText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  ledgerCard: {
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
    marginBottom: 24,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#f8fafc",
  },
  ledgerTime: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
    marginTop: 3,
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#10b981",
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginVertical: 12,
  },
  securityLabel: {
    textAlign: "center",
    fontSize: 8,
    color: "#334155",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
