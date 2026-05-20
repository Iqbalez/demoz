"use client";

import React, { useState, useEffect, Suspense } from "react";
import LeaveDashboard, { LeaveRequest, LeaveType } from "../../../features/leave/LeaveDashboard";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";

function LeavePageContent() {
  const { employees, backendStatus } = useDashboard();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Local state mock data in Simulation Mode
  const [mockRequests, setMockRequests] = useState<LeaveRequest[]>([
    {
      id: "req-1",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      totalDays: 5,
      reason: "Family wedding event in Bahir Dar",
      status: "PENDING",
      rejectionReason: null,
      createdAt: "2026-05-19",
      employee: {
        firstName: "Ramzi",
        lastName: "Amin",
        employeeIdNumber: "EMP-4820",
      },
      leaveType: {
        name: "Annual Leave",
        code: "AL",
      },
    },
    {
      id: "req-2",
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      totalDays: 3,
      reason: "Influenza infection, resting per doctor prescriptions",
      status: "APPROVED",
      rejectionReason: null,
      createdAt: "2026-05-09",
      employee: {
        firstName: "Selam",
        lastName: "Tesfaye",
        employeeIdNumber: "EMP-9281",
      },
      leaveType: {
        name: "Sick Leave",
        code: "SL",
      },
      approvedBy: {
        email: "hr@demoz.et",
      },
    },
  ]);

  const [mockLeaveTypes, setMockLeaveTypes] = useState<LeaveType[]>([
    { id: "type-1", name: "Annual Leave", code: "AL", maxDaysPerYear: 16, requiresApproval: true, isPaid: true },
    { id: "type-2", name: "Sick Leave", code: "SL", maxDaysPerYear: 180, requiresApproval: true, isPaid: true },
    { id: "type-3", name: "Maternity Leave", code: "ML", maxDaysPerYear: 120, requiresApproval: true, isPaid: true },
    { id: "type-4", name: "Paternity Leave", code: "PL", maxDaysPerYear: 3, requiresApproval: true, isPaid: true },
  ]);

  // Sync to database if connected
  useEffect(() => {
    if (backendStatus === "CONNECTED") {
      fetchTypes();
      fetchRequests();
    } else {
      setLeaveTypes(mockLeaveTypes);
      setRequests(mockRequests);
    }
  }, [backendStatus, mockLeaveTypes, mockRequests]);

  const fetchTypes = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/leave/types`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data);
      }
    } catch (err) {
      console.error("Failed to fetch leave types:", err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/leave/requests`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
    }
  };

  const handleApprove = async (id: string) => {
    if (backendStatus === "CONNECTED") {
      try {
        const res = await fetch(`http://localhost:3001/leave/requests/${id}/approve`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          fetchRequests();
          return { success: true, message: "Leave approved successfully." };
        }
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to approve request." };
      }
    }

    // Mock implementation
    setMockRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "APPROVED" as const, approvedBy: { email: "owner@demoz.et" } }
          : r
      )
    );
    return { success: true, message: "Simulation: Approved leave request." };
  };

  const handleReject = async (id: string, reason: string) => {
    if (backendStatus === "CONNECTED") {
      try {
        const res = await fetch(`http://localhost:3001/leave/requests/${id}/reject`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          fetchRequests();
          return { success: true, message: "Leave rejected." };
        }
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to reject." };
      }
    }

    // Mock implementation
    setMockRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "REJECTED" as const, rejectionReason: reason }
          : r
      )
    );
    return { success: true, message: "Simulation: Rejected leave request." };
  };

  const handleRequestLeave = async (dto: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    if (backendStatus === "CONNECTED") {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/leave/requests`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dto),
        });
        if (res.ok) {
          fetchRequests();
          return { success: true, message: "Leave request submitted successfully." };
        } else {
          const errData = await res.json();
          return { success: false, message: errData.message || "Overlap or validation error." };
        }
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to submit leave request." };
      }
    }

    // Mock implementation
    const targetEmployee = employees.find((e) => e.id === dto.employeeId) || employees[0];
    const targetType = leaveTypes.find((t) => t.id === dto.leaveTypeId) || leaveTypes[0];

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0) totalDays++;
      current.setDate(current.getDate() + 1);
    }

    const newReq: LeaveRequest = {
      id: `req-${Date.now()}`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalDays,
      reason: dto.reason,
      status: "PENDING",
      rejectionReason: null,
      createdAt: new Date().toISOString().split("T")[0],
      employee: {
        firstName: targetEmployee.firstName,
        lastName: targetEmployee.lastName,
        employeeIdNumber: targetEmployee.employeeIdNumber,
      },
      leaveType: {
        name: targetType.name,
        code: targetType.code,
      },
    };

    setMockRequests((prev) => [newReq, ...prev]);
    return { success: true, message: "Simulation: Submitted new leave request." };
  };

  const handleSeedTypes = async () => {
    if (backendStatus === "CONNECTED") {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/leave/types/seed`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          fetchTypes();
          return { success: true, message: "Ethiopian labor law leave categories seeded!" };
        }
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to seed." };
      }
    }

    // Mock seeding
    setMockLeaveTypes([
      { id: "type-1", name: "Annual Leave", code: "AL", maxDaysPerYear: 16, requiresApproval: true, isPaid: true },
      { id: "type-2", name: "Sick Leave", code: "SL", maxDaysPerYear: 180, requiresApproval: true, isPaid: true },
      { id: "type-3", name: "Maternity Leave", code: "ML", maxDaysPerYear: 120, requiresApproval: true, isPaid: true },
      { id: "type-4", name: "Paternity Leave", code: "PL", maxDaysPerYear: 3, requiresApproval: true, isPaid: true },
      { id: "type-5", name: "Bereavement Leave", code: "BL", maxDaysPerYear: 7, requiresApproval: true, isPaid: true },
      { id: "type-6", name: "Marriage Leave", code: "MRGL", maxDaysPerYear: 5, requiresApproval: true, isPaid: true },
    ]);
    return { success: true, message: "Simulation: Seeded 6 Ethiopian labor law categories." };
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
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
        <div className="h-60 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
      </div>
    }>
      <LeavePageContent />
    </Suspense>
  );
}
