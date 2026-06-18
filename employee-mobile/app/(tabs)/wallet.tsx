import React, { useState, useEffect, memo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";
import { env } from "../../config/env";

interface PayslipData {
  id: string;
  payrollRunId: string;
  month: string;
  monthEC: string;
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
    onDownload: (slip: PayslipData) => void;
    isDownloading: boolean;
  }) => {
    return (
      <View style={styles.slipCard}>
        <View style={styles.slipInfoContainer}>
          <Text style={styles.slipMonth}>{slip.monthEC || slip.month}</Text>
          <Text style={styles.slipMonthGC}>{slip.month}</Text>
          <Text style={styles.slipNet}>Disbursed: {slip.net.toLocaleString()} ETB</Text>
          <Text style={styles.slipRef}>{slip.reference}</Text>
        </View>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => onDownload(slip)}
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
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const { t } = useTranslation();

  // Fetch payroll history from backend
  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        const baseUrl = env.EXPO_PUBLIC_API_URL;
        const res = await fetch(`${baseUrl}/api/v1/payroll/runs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const runs = await res.json();
          const slips: PayslipData[] = runs.flatMap((run: any) =>
            (run.payrollLineItems || []).map((item: any) => ({
              id: item.id,
              payrollRunId: run.id,
              month: `${new Date(run.periodStart).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
              monthEC: run.periodLabelEC || "",
              gross: Number(item.grossSalary),
              pension: Number(item.pensionDeduction),
              tax: Number(item.incomeTax),
              net: Number(item.netPay),
              reference: item.chapaReference || `REF-${item.id.slice(0, 8)}`,
            }))
          );
          setPayslips(slips);
        }
      } catch {
        // Fallback to empty state — offline
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [token]);

  const handleDownloadPayslip = useCallback(async (slip: PayslipData) => {
    setDownloadingId(slip.id);

    try {
      const baseUrl = env.EXPO_PUBLIC_API_URL;
      const url = `${baseUrl}/api/v1/payroll/runs/${slip.payrollRunId}/payslips/${slip.id}`;

      // Download to local filesystem
      const fileUri = `${FileSystem.documentDirectory}payslip-${slip.id}.pdf`;
      const download = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (download.status === 200) {
        // Share/open the PDF
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(download.uri, {
            mimeType: "application/pdf",
            dialogTitle: `Payslip - ${slip.monthEC || slip.month}`,
          });
        } else {
          Alert.alert(
            "PDF Downloaded",
            `Payslip for ${slip.monthEC || slip.month} saved to device.`
          );
        }
      } else {
        Alert.alert("Download Failed", "Could not download payslip. Please try again.");
      }
    } catch (err) {
      Alert.alert(
        "ኔትወርክ ሲኖር ያያሉ",
        "Payslip will be available when connected. / ኔትወርክ ሲኖር ያያሉ"
      );
    } finally {
      setDownloadingId(null);
    }
  }, [token]);

  // Compute latest payslip summary
  const latestSlip = payslips[0];

  const ledgerEntries: LedgerData[] = payslips.slice(0, 3).map((s) => ({
    title: "Chapa Payout Success",
    time: s.month,
    amount: s.net,
  }));

  return (
    <ScrollView contentContainerStyle={styles.container} removeClippedSubviews={true}>
      {/* Earnings Overview */}
      <View style={styles.earningCard}>
        <Text style={styles.earningLabel}>NET MONTHLY EARNINGS / ወርሃዊ ገቢ</Text>
        <Text style={styles.earningVal}>
          {latestSlip ? `${latestSlip.net.toLocaleString()} ETB` : "— ETB"}
        </Text>
        {latestSlip?.monthEC ? (
          <Text style={styles.ecPeriodLabel}>{latestSlip.monthEC}</Text>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>{t("grossSalary")}</Text>
            <Text style={styles.statVal}>
              {latestSlip ? `${latestSlip.gross.toLocaleString()} ETB` : "—"}
            </Text>
          </View>
          <View>
            <Text style={styles.statLabel}>{t("pension")} (7%)</Text>
            <Text style={styles.statVal}>
              {latestSlip ? `-${latestSlip.pension.toLocaleString()} ETB` : "—"}
            </Text>
          </View>
          <View>
            <Text style={styles.statLabel}>{t("incomeTax")}</Text>
            <Text style={styles.statVal}>
              {latestSlip ? `-${latestSlip.tax.toLocaleString()} ETB` : "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* PDF Payslips Section */}
      <Text style={styles.sectionHeader}>PDF PAYSLIP DEPOSITORY / የደሞዝ ሰነዶች</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#10b981" size="large" />
          <Text style={styles.loadingText}>Loading payslips...</Text>
        </View>
      ) : payslips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("noPayslips")}</Text>
          <Text style={styles.emptySubtext}>{t("payslipsAppear")}</Text>
        </View>
      ) : (
        payslips.map((slip) => (
          <PayslipRow
            key={slip.id}
            slip={slip}
            onDownload={handleDownloadPayslip}
            isDownloading={downloadingId === slip.id}
          />
        ))
      )}

      {/* Chapa Transaction Ledger */}
      {ledgerEntries.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>CHAPA DISBURSEMENT LEDGER</Text>
          <View style={styles.ledgerCard}>
            {ledgerEntries.map((entry, idx) => (
              <React.Fragment key={idx}>
                <LedgerRow item={entry} />
                {idx < ledgerEntries.length - 1 && <View style={styles.ledgerDivider} />}
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {/* Security note */}
      <Text style={styles.securityLabel}>🔒 verified and processed via Chapa payment gateway</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#070b13",
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
  ecPeriodLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
    marginTop: 4,
    opacity: 0.8,
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
  slipMonthGC: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
    marginTop: 1,
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
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  emptySubtext: {
    fontSize: 10,
    color: "#475569",
    marginTop: 6,
    textAlign: "center",
  },
});
