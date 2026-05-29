"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import LeaveDashboard, { LeaveRequest, LeaveType } from "../../../features/leave/LeaveDashboard";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";
import { apiRequest } from "@/lib/api";

function LeavePageContent() {
  const { employees } = useDashboard();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await apiRequest<LeaveType[]>("/leave/types");
      setLeaveTypes(data);
    } catch {
      setLeaveTypes([]);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await apiRequest<LeaveRequest[]>("/leave/requests");
      setRequests(data);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
    fetchRequests();
    const poll = setInterval(fetchRequests, 20000);
    return () => clearInterval(poll);
  }, [fetchTypes, fetchRequests]);

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/leave/requests/${id}/approve`, { method: "PUT" });
      await fetchRequests();
      return { success: true, message: "Leave approved successfully." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to approve request." };
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await apiRequest(`/leave/requests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
      await fetchRequests();
      return { success: true, message: "Leave rejected." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to reject." };
    }
  };

  const handleRequestLeave = async (dto: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    try {
      await apiRequest("/leave/requests", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      await fetchRequests();
      return { success: true, message: "Leave request submitted successfully." };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to submit leave request." };
    }
  };

  const handleSeedTypes = async () => {
    try {
      await apiRequest("/leave/types/seed", { method: "POST" });
      await fetchTypes();
      return { success: true, message: "Ethiopian labor law leave categories seeded!" };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : "Failed to seed." };
    }
  };

  return (
    <LeaveDashboard
      requests={requests}
      leaveTypes={leaveTypes}
      employees={employees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        employeeIdNumber: e.employeeIdNumber,
      }))}
      onApprove={handleApprove}
      onReject={handleReject}
      onRequestLeave={handleRequestLeave}
      onSeedTypes={handleSeedTypes}
    />
  );
}

export default function LeavePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
          <div className="h-60 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <LeavePageContent />
    </Suspense>
  );
}
