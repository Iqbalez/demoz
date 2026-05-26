"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";

export interface AttendanceLog {
  id: string;
  employeeName: string;
  phoneNumber: string;
  timestamp: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  source: "USSD" | "WEB_PWA" | "MOBILE_APP";
  latitude: number | null;
  longitude: number | null;
  isAnomaly: boolean;
  anomalyReason: string | null;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
}



export interface AttendanceTrackerProps {
  logs: AttendanceLog[];
  branches: Branch[];
  onAddBranch: (branch: Omit<Branch, "id">) => Promise<{ success: boolean; message: string }>;
}

export default function AttendanceTracker({
  logs,
  branches,
  onAddBranch,
}: AttendanceTrackerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("100");

  // Selected anomaly log for the Map Visualizer widget
  const [selectedAnomalyLog, setSelectedAnomalyLog] = useState<AttendanceLog | null>(
    logs.find((l) => l.isAnomaly) || null
  );

  // Search parameters
  const currentSearch = searchParams.get("search") || "";
  const currentCompliance = searchParams.get("compliance") || "ALL"; // ALL | COMPLIANT | ANOMALY
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const itemsPerPage = 3;

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Sync state parameters to the router URL
  const updateUrlParams = (newParams: Record<string, string | number>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === "" || val === "ALL") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Debounce search inputs
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlParams({ search: searchInput, page: 1 });
      }
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Filtering logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.employeeName.toLowerCase().includes(currentSearch.toLowerCase()) ||
      log.phoneNumber.includes(currentSearch) ||
      (log.anomalyReason && log.anomalyReason.toLowerCase().includes(currentSearch.toLowerCase()));

    let matchesCompliance = true;
    if (currentCompliance === "COMPLIANT") matchesCompliance = !log.isAnomaly;
    if (currentCompliance === "ANOMALY") matchesCompliance = log.isAnomaly;

    return matchesSearch && matchesCompliance;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!name || !location || !lat || !lng || !radius) {
        toast.warning("Incomplete Form", "All geofence configuration fields are required.");
        return;
      }

      const result = await onAddBranch({
        name,
        location,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        geofenceRadiusMeters: parseInt(radius, 10),
      });

      if (result.success) {
        toast.success("Geofence Synced", `Branch ${name} has been mapped successfully!`);
        setName("");
        setLocation("");
        setLat("");
        setLng("");
        setShowAddForm(false);
      } else {
        toast.error("Geofence Mapped Failed", result.message);
      }
    } catch (err: any) {
      toast.error("Internal Form Error", err.message || "An exception occurred.");
    }
  };

  // Vector map parameters calculations
  const defaultBranch = branches[0] || { latitude: 9.03, longitude: 38.74, name: "Head Office" };
  const targetBranch = branches.find((b) => b.name === "Head Office") || defaultBranch;

  const logLat = selectedAnomalyLog?.latitude ?? 9.0322;
  const logLng = selectedAnomalyLog?.longitude ?? 38.7431;

  // Render SVG points (relative translation for display)
  const cx = 150; // Center coordinate X (Head Office)
  const cy = 150; // Center coordinate Y (Head Office)
  const radiusPx = 60; // Geofence circle radius on UI

  const diffLat = logLat - targetBranch.latitude;
  const diffLng = logLng - targetBranch.longitude;

  // Vector translation multipliers
  const dx = cx + diffLng * 6000;
  const dy = cy - diffLat * 6000;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Geofence Registry Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0c1424] p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Geofence Registry</h2>
          <p className="text-xs text-slate-400">
            Control GPS branch nodes, set dynamic geofence boundaries, and examine spatial check-in telemetry.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setLocation("");
            setLat("9.0305");
            setLng("38.7405");
            setShowAddForm((prev) => !prev);
          }}
          className="px-4.5 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl shadow-xl shadow-emerald-950/20 font-bold text-xs transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Geofenced Branch
        </button>
      </div>

      {/* Dynamic Geofence node onboarding Form */}
      {showAddForm && (
        <form onSubmit={handleBranchSubmit} className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-4 animate-slide-up">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-50 font-outfit">Onboard New Geofence Node</h3>
            <span className="text-[9px] text-slate-400 font-mono">Biometric GPS Gateway</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Office Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                placeholder="Merkato Office"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Location / City</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                placeholder="Addis Ababa"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Radius Limit</label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="50">50 meters</option>
                <option value="100">100 meters</option>
                <option value="200">200 meters</option>
                <option value="500">500 meters</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md active:scale-95"
            >
              Save Registry Node
            </button>
          </div>
        </form>
      )}

      {/* DUAL COLUMN WORKSPACE: Exception Visualizer Map Widget & Log Records Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Geographic Exception Visualizer (SVG-based mapping tool) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-[9px] font-extrabold uppercase tracking-wider select-none">
              Spatial Anomaly Visualizer
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit mt-2">Geofence Out-Of-Bounds Radar</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Real-time exception tracing. Glowing red lines isolate off-boundary check-in telemetry nodes.
            </p>
          </div>

          {/* Dynamic Map Visualizer */}
          <div className="my-5 aspect-square max-w-[280px] w-full mx-auto bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 relative overflow-hidden flex items-center justify-center shadow-inner">
            {/* Compass Grid Indicators */}
            <div className="absolute inset-0 border border-dashed border-slate-200/50 dark:border-zinc-800/30 rounded-full scale-75 select-none pointer-events-none" />
            <div className="absolute inset-0 border border-dashed border-slate-200/50 dark:border-zinc-800/30 rounded-full scale-50 select-none pointer-events-none" />

            <svg viewBox="0 0 300 300" className="w-full h-full">
              {/* Radial Geofence boundary Ring */}
              <circle
                cx={cx}
                cy={cy}
                r={radiusPx}
                className="stroke-emerald-500/40 dark:stroke-emerald-500/30 fill-emerald-500/5"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={cx}
                cy={cy}
                r={radiusPx + 1}
                className="stroke-emerald-500/20 fill-none"
                strokeWidth="1"
              />

              {/* Glowing corporate center node */}
              <circle cx={cx} cy={cy} r="4" className="fill-emerald-500 shadow-lg" />
              <circle cx={cx} cy={cy} r="10" className="stroke-emerald-500/40 fill-none animate-ping" />

              {selectedAnomalyLog?.isAnomaly && (
                <>
                  {/* Connect Line */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={dx}
                    y2={dy}
                    className="stroke-red-500 dark:stroke-red-400"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Out of bounds point */}
                  <circle cx={dx} cy={dy} r="4" className="fill-red-500" />
                  <circle cx={dx} cy={dy} r="8" className="stroke-red-500/40 fill-none animate-pulse" />

                  {/* Coordinate tag popup label */}
                  <foreignObject x={dx - 45} y={dy - 35} width="95" height="30">
                    <div className="px-2 py-0.5 rounded bg-slate-900 border border-red-500/30 text-white font-mono text-[7px] text-center uppercase tracking-tighter">
                      Infraction Node
                    </div>
                  </foreignObject>
                </>
              )}
            </svg>

            {/* Scale Label */}
            <div className="absolute bottom-2 left-3 text-[8px] font-mono text-slate-400 select-none bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-zinc-800">
              Grid Ratio: 1px = 10m
            </div>
          </div>

          {/* Anomaly Description detail panel */}
          {selectedAnomalyLog ? (
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/80 rounded-2xl space-y-2 select-none">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-800 dark:text-zinc-200 font-outfit">{selectedAnomalyLog.employeeName}</span>
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded ${
                    selectedAnomalyLog.isAnomaly
                      ? "bg-red-500/10 text-red-600 border border-red-500/20 font-extrabold"
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-extrabold"
                  }`}
                >
                  {selectedAnomalyLog.isAnomaly ? "OUT OF BOUNDS" : "COMPLIANT"}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-semibold space-y-0.5">
                <div>
                  GPS: <span className="font-mono text-slate-700 dark:text-zinc-300">{selectedAnomalyLog.latitude?.toFixed(6) ?? "N/A"}, {selectedAnomalyLog.longitude?.toFixed(6) ?? "N/A"}</span>
                </div>
                {selectedAnomalyLog.isAnomaly && (
                  <div className="text-red-500 dark:text-red-400">Infraction: {selectedAnomalyLog.anomalyReason || "Geofence Violation."}</div>
                )}
                <div>Timestamp: <span className="font-mono text-slate-700 dark:text-zinc-300">{selectedAnomalyLog.timestamp}</span></div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-[10px] text-slate-400 border border-dashed rounded-2xl italic select-none">
              Click any log registry on the table to inspect telemetry coordinates.
            </div>
          )}
        </div>

        {/* Dynamic logs table workspace */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#0c1424] p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/80 shadow-lg select-none">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search logs by employee name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100 focus:border-emerald-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Compliance:</span>
              <select
                value={currentCompliance}
                onChange={(e) => updateUrlParams({ compliance: e.target.value, page: 1 })}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Entries</option>
                <option value="COMPLIANT">Compliant Only</option>
                <option value="ANOMALY">Anomalies Only</option>
              </select>
            </div>
          </div>

          <div className="mt-2 rounded-3xl bg-white dark:bg-[#0c1424] overflow-hidden border border-slate-100 dark:border-zinc-800/80 shadow-2xl relative">
            {/* Dynamic Pending Loader Overlay */}
            {isPending && (
              <div className="absolute inset-0 bg-slate-100/20 dark:bg-black/10 backdrop-blur-[1px] z-10 flex items-center justify-center animate-fade-in" />
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-zinc-900/10 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                    <th className="py-4 px-5">Timestamp</th>
                    <th className="py-4 px-5">Employee</th>
                    <th className="py-4 px-5">Channel</th>
                    <th className="py-4 px-5">Compliance Node</th>
                    <th className="py-4 px-5 text-right">Radar Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs">
                  {isPending ? (
                    Array.from({ length: itemsPerPage }).map((_, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-4 px-5"><Skeleton className="h-3 w-14" /></td>
                        <td className="py-4 px-5 flex items-center gap-3">
                          <Skeleton className="w-7 h-7 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-2 w-14" />
                          </div>
                        </td>
                        <td className="py-4 px-5"><Skeleton className="h-3.5 w-16" /></td>
                        <td className="py-4 px-5"><Skeleton className="h-4 w-20 rounded-full" /></td>
                        <td className="py-4 px-5 text-right"><Skeleton className="h-7 w-12 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : totalPages > 0 && paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold italic">
                        No active attendance log files found.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/40 dark:hover:bg-zinc-900/5 transition-all text-slate-700 dark:text-zinc-200 cursor-pointer ${selectedAnomalyLog?.id === log.id ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""}`}
                        onClick={() => setSelectedAnomalyLog(log)}
                      >
                        <td className="py-4 px-5 font-mono text-[10px] text-slate-500 dark:text-zinc-400">{log.timestamp}</td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">{log.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.phoneNumber}</div>
                        </td>
                        <td className="py-4 px-5 font-bold text-[10px]">
                          <span className={`inline-flex items-center gap-1 ${log.source === "USSD" ? "text-purple-600 dark:text-purple-400" : "text-sky-600 dark:text-sky-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${log.source === "USSD" ? "bg-purple-500 animate-pulse" : "bg-sky-500"}`} />
                            {log.source === "USSD" ? "USSD Mobile" : "Web PWA"}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          {log.isAnomaly ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">âš ï¸ ANOMALY</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">âœ“ COMPLIANT</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm ${selectedAnomalyLog?.id === log.id ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/40 dark:border-zinc-800/40"}`}
                          >
                            Radar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-5 py-4 bg-slate-50/50 dark:bg-zinc-900/10 border-t border-slate-100 dark:border-zinc-800/80 text-xs select-none">
                <span className="text-slate-400 font-semibold">
                  Showing page {currentPage} of {totalPages} ({filteredLogs.length} results)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1 || isPending}
                    onClick={() => updateUrlParams({ page: currentPage - 1 })}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-bold cursor-pointer hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages || isPending}
                    onClick={() => updateUrlParams({ page: currentPage + 1 })}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-bold cursor-pointer hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
