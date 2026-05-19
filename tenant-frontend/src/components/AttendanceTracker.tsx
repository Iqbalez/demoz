"use client";

import React, { useState } from "react";

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
  onAddBranch: (branch: Omit<Branch, "id">) => { success: boolean; message: string };
}

export default function AttendanceTracker({ logs, branches, onAddBranch }: AttendanceTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("100");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !lat || !lng || !radius) {
      setErrorMsg("All branch geofence configuration fields are required.");
      return;
    }

    const result = onAddBranch({
      name,
      location,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      geofenceRadiusMeters: parseInt(radius),
    });

    if (result.success) {
      setSuccessMsg("Branch geofence boundary synchronized!");
      setName("");
      setLocation("");
      setLat("");
      setLng("");
      setTimeout(() => {
        setSuccessMsg("");
        setShowAddForm(false);
      }, 1000);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Geofence Registry</h2>
          <p className="text-sm text-slate-400">Manage your active GPS branch boundaries and monitor real-time tracking.</p>
        </div>
        
        <button
          onClick={() => {
            setErrorMsg("");
            setSuccessMsg("");
            setShowAddForm(prev => !prev);
          }}
          className="px-4 py-2.5 bg-[#0b5c46] hover:bg-[#094534] text-white rounded-xl shadow-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Geofenced Branch
        </button>
      </div>

      {/* -------------------- ADD GEOMAP BRANCH REGISTRY FORM -------------------- */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="p-5 rounded-2xl glass-card border-emerald-500/20 bg-emerald-950/[0.02] space-y-4 animate-slide-up">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Setup New Geofence Node</h3>
            <span className="text-[9px] text-slate-400 uppercase font-mono">biometric GPS link</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 rounded-xl text-xs">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 rounded-xl text-xs font-semibold">
              ✓ {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase">Office Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none dark:text-zinc-100" 
                placeholder="e.g. Merkato Office" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase">Location / City</label>
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none dark:text-zinc-100" 
                placeholder="Addis Ababa" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase">Latitude</label>
              <input 
                type="text" 
                value={lat} 
                onChange={(e) => setLat(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-mono focus:outline-none dark:text-zinc-100" 
                placeholder="9.0300" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase">Longitude</label>
              <input 
                type="text" 
                value={lng} 
                onChange={(e) => setLng(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-mono focus:outline-none dark:text-zinc-100" 
                placeholder="38.7400" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase">Radius Limit (m)</label>
              <select 
                value={radius} 
                onChange={(e) => setRadius(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-semibold focus:outline-none"
              >
                <option value="50">50 meters</option>
                <option value="100">100 meters</option>
                <option value="200">200 meters</option>
                <option value="500">500 meters</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md active:scale-95 hover:bg-emerald-500"
            >
              Save Registry Node
            </button>
          </div>
        </form>
      )}

      {/* Geofence Branches Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <div key={branch.id} className="p-5 rounded-2xl glass-card flex flex-col justify-between hover:scale-[1.01] transition-all border border-slate-100 dark:border-zinc-800/80">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">{branch.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{branch.location}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                GEOFENCE ACTIVE
              </span>
            </div>
            
            <div className="my-4 space-y-1.5 font-mono text-[10px] text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80">
              <div className="flex justify-between">
                <span>Latitude:</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">{branch.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Longitude:</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">{branch.longitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Radius Limit:</span>
                <span className="font-semibold text-[#0b5c46] dark:text-emerald-400">{branch.geofenceRadiusMeters} meters</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 select-none">
              <span>Biometric Gateway: Active</span>
              <span className="text-emerald-500">Live Sync ✓</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Chronological Log Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Live Attendance Records</h3>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Streaming live entries
          </span>
        </div>

        <div className="rounded-2xl glass-card overflow-hidden shadow-sm border border-slate-100 dark:border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5">Employee Name</th>
                  <th className="py-4 px-5">Action</th>
                  <th className="py-4 px-5">Channel</th>
                  <th className="py-4 px-5">GPS Coordinates</th>
                  <th className="py-4 px-5 text-right">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-zinc-500 italic">
                      No attendance entries logged yet. Dial USSD codes to log check-ins!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 text-slate-700 dark:text-zinc-200">
                      {/* Timestamp */}
                      <td className="py-4 px-5 text-[11px] font-mono text-slate-500 dark:text-zinc-400">{log.timestamp}</td>
                      {/* Employee Name */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{log.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.phoneNumber}</div>
                      </td>
                      {/* Action */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          log.type === "CLOCK_IN" 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}>
                          {log.type === "CLOCK_IN" ? "CLOCK IN" : "CLOCK OUT"}
                        </span>
                      </td>
                      {/* Channel */}
                      <td className="py-4 px-5 font-semibold text-[10px]">
                        <span className={`inline-flex items-center gap-1 ${
                          log.source === "USSD" ? "text-purple-600 dark:text-purple-400" : "text-sky-600 dark:text-sky-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            log.source === "USSD" ? "bg-purple-500" : "bg-sky-500"
                          }`}></span>
                          {log.source === "USSD" ? "USSD Mobile" : "Web PWA"}
                        </span>
                      </td>
                      {/* Coordinates */}
                      <td className="py-4 px-5 font-mono text-[10px] text-slate-400 dark:text-zinc-500">
                        {log.latitude !== null && log.longitude !== null 
                          ? `${log.latitude.toFixed(5)}, ${log.longitude.toFixed(5)}`
                          : "No GPS (USSD Cell-Tower)"
                        }
                      </td>
                      {/* Anomaly */}
                      <td className="py-4 px-5 text-right font-bold">
                        {log.isAnomaly ? (
                          <span 
                            className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 cursor-help"
                            title={log.anomalyReason || "Geofence Violation"}
                          >
                            ⚠️ INFRACTION
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ✓ COMPLIANT
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
