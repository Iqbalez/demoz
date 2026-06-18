import { useState, useEffect } from "react";
import { env } from "../lib/env";

export type PayrollStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "IDLE";

export interface PayrollJobState {
  status: PayrollStatus;
  progress: number;
  errorMessage: string | null;
  payrollRun: any | null;
  isLoading: boolean;
}

export function usePayrollJobStatus(runId: string | null) {
  const [jobState, setJobState] = useState<PayrollJobState>({
    status: "IDLE",
    progress: 0,
    errorMessage: null,
    payrollRun: null,
    isLoading: false,
  });

  useEffect(() => {
    if (!runId) {
      setJobState({
        status: "IDLE",
        progress: 0,
        errorMessage: null,
        payrollRun: null,
        isLoading: false,
      });
      return;
    }

    let intervalId: any = null;
    let simulatedProgress = 10;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/payroll/status/${runId}`);
        if (!res.ok) {
          throw new Error("Unable to synchronize with payroll calculation registry.");
        }

        const data = await res.json();
        const serverStatus: PayrollStatus = data.status;

        let calculatedProgress = 0;
        if (serverStatus === "PENDING") {
          calculatedProgress = 15;
        } else if (serverStatus === "PROCESSING") {
          // Dynamically animate processing step up to 90%
          simulatedProgress = Math.min(simulatedProgress + 20, 90);
          calculatedProgress = simulatedProgress;
        } else if (serverStatus === "COMPLETED") {
          calculatedProgress = 100;
        } else if (serverStatus === "FAILED") {
          calculatedProgress = 0;
        }

        setJobState({
          status: serverStatus,
          progress: calculatedProgress,
          errorMessage: data.errorMessage || null,
          payrollRun: data,
          isLoading: false,
        });

        // Kill interval if we have reached terminal states
        if (serverStatus === "COMPLETED" || serverStatus === "FAILED") {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        setJobState((prev) => ({
          ...prev,
          status: "FAILED",
          errorMessage: err.message || "Failed to establish active polling connection.",
          isLoading: false,
        }));
        clearInterval(intervalId);
      }
    };

    // Initialize state to pending and fire immediate call
    setJobState({
      status: "PENDING",
      progress: 10,
      errorMessage: null,
      payrollRun: null,
      isLoading: true,
    });
    
    fetchStatus();
    intervalId = setInterval(fetchStatus, 1500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [runId]);

  return {
    ...jobState,
    isProcessing: jobState.status === "PENDING" || jobState.status === "PROCESSING",
  };
}
