"use client";

import React, { useState, useEffect, useRef } from "react";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  type: "info" | "success" | "warning" | "error";
}

export interface AIComplianceTerminalProps {
  auditLogs: AuditLog[];
  activeEmployeesCount: number;
  onSimulateLog: (log: {
    employeeName: string;
    phoneNumber: string;
    type: "CLOCK_IN" | "CLOCK_OUT";
    source: "USSD" | "WEB_PWA" | "MOBILE_APP";
    latitude: number | null;
    longitude: number | null;
    isAnomaly: boolean;
    anomalyReason: string | null;
  }) => void;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  isTable?: boolean;
  tableData?: Array<[string, string]>;
}

export default function AIComplianceTerminal({ auditLogs, activeEmployeesCount, onSimulateLog }: AIComplianceTerminalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ai_chat" | "simulators">("ai_chat");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Greetings! I am the Demoz AI Compliance Assistant. Ask me anything regarding Ethiopian federal tax calculations, geofence radius configurations, or active payroll audit statuses!"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // -------------------- USSD TELEPHONY SIMULATOR STATES --------------------
  const [ussdDisplay, setUssdDisplay] = useState("Dial *999# to start");
  const [ussdDialString, setUssdDialString] = useState("");
  const [ussdStep, setUssdStep] = useState<"DIAL" | "MENU" | "ACTION_CHOICE" | "PHONE_INPUT" | "PIN_INPUT" | "COMPLETE">("DIAL");
  const [ussdChoice, setUssdChoice] = useState("");
  const [ussdPhone, setUssdPhone] = useState("");
  
  // -------------------- WEB PWA SIMULATOR STATES --------------------
  const [webLat, setWebLat] = useState("9.0300");
  const [webLng, setWebLng] = useState("38.7400");
  const [webStatus, setWebStatus] = useState<"OUT" | "IN">("OUT");

  // -------------------- MOBILE APP WIDGET STATES --------------------
  const [mobStatus, setMobStatus] = useState<"OUT" | "IN">("OUT");
  const [mobTimer, setMobTimer] = useState("00:00:00");
  const mobIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Mobile Mock Stopwatch timer
  useEffect(() => {
    if (mobStatus === "IN") {
      const start = Date.now();
      mobIntervalRef.current = setInterval(() => {
        const diff = Date.now() - start;
        const secs = Math.floor((diff / 1000) % 60).toString().padStart(2, "0");
        const mins = Math.floor((diff / 60000) % 60).toString().padStart(2, "0");
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, "0");
        setMobTimer(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      if (mobIntervalRef.current) clearInterval(mobIntervalRef.current);
      setMobTimer("00:00:00");
    }
    return () => {
      if (mobIntervalRef.current) clearInterval(mobIntervalRef.current);
    };
  }, [mobStatus]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { sender: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse: Message = { sender: "ai", text: "" };
      const normalizedText = text.toLowerCase();

      if (normalizedText.includes("tax") || normalizedText.includes("bracket")) {
        aiResponse = {
          sender: "ai",
          text: "Here is the active compliant scale for **Ethiopian Federal Income Tax (Proclamation No. 979/2016)** applicable to monthly employment income:",
          isTable: true,
          tableData: [
            ["Monthly Income (ETB)", "Income Tax Rate (%)"],
            ["0 - 600 ETB", "0% (Exempt)"],
            ["601 - 1,650 ETB", "10% (Minus 60 ETB)"],
            ["1,651 - 3,200 ETB", "15% (Minus 142.50 ETB)"],
            ["3,201 - 5,250 ETB", "20% (Minus 302.50 ETB)"],
            ["5,251 - 7,800 ETB", "25% (Minus 565 ETB)"],
            ["7,801 - 10,900 ETB", "30% (Minus 955 ETB)"],
            ["Over 10,900 ETB", "35% (Minus 1,500 ETB)"]
          ]
        };
      } else if (normalizedText.includes("anomaly") || normalizedText.includes("infraction")) {
        aiResponse = {
          sender: "ai",
          text: "I analyzed today's telemetry logs. **1 warning** is active:\n\n⚠️ **Device Proximity Alert**: Employees Almaz & Yosef registered USSD logins from identical cell-towers within 1.5 seconds, which may indicate device-sharing or proximity logging. All geofence nodes are 100% compliant."
        };
      } else if (normalizedText.includes("audit") || normalizedText.includes("payroll")) {
        aiResponse = {
          sender: "ai",
          text: `Current payroll consists of **${activeEmployeesCount} active employees**. Based on our cross-checks, all base rates align with Fayda ID listings. Current estimated fraud risk index is **8% (Very Low)**.`
        };
      } else {
        aiResponse = {
          sender: "ai",
          text: "I understand. To ensure complete compliance alignment on the Demoz portal, you can run payroll audits, register branches with custom geofences, or disburse payments via our secure Chapa node."
        };
      }

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);

    setChatInput("");
  };

  // -------------------- USSD ACTIONS DIALER --------------------
  const handleUssdKeyPress = (char: string) => {
    if (ussdStep !== "DIAL") return;
    setUssdDialString(prev => prev + char);
  };

  const handleUssdClear = () => {
    setUssdDialString("");
    setUssdStep("DIAL");
    setUssdDisplay("Dial *999# to start");
  };

  const handleUssdCall = () => {
    if (ussdDialString === "*999#") {
      setUssdStep("MENU");
      setUssdDisplay(
        "Demoz Attendance System\n1. Clock In\n2. Clock Out\n3. Check Status\n\nEnter option (1-3):"
      );
    } else {
      setUssdDisplay("Connection error\nInvalid MMI Code.");
    }
  };

  const handleUssdChoiceSend = (choice: string) => {
    if (ussdStep === "MENU") {
      if (choice === "1" || choice === "2") {
        setUssdChoice(choice === "1" ? "CLOCK_IN" : "CLOCK_OUT");
        setUssdStep("PHONE_INPUT");
        setUssdDisplay("Enter Employee Phone Number:\n(e.g. 0911000003)");
      } else if (choice === "3") {
        setUssdDisplay("Your USSD gateway is Online.\nStatus: Compliant\n\nDial *999# to reconnect.");
        setUssdStep("DIAL");
        setUssdDialString("");
      } else {
        setUssdDisplay("Invalid selection.\nChoose 1, 2, or 3:");
      }
    } else if (ussdStep === "PHONE_INPUT") {
      if (choice.length >= 9) {
        setUssdPhone(choice);
        setUssdStep("PIN_INPUT");
        setUssdDisplay("Enter 4-digit security PIN:");
      } else {
        setUssdDisplay("Invalid phone number.\nEnter 10 digits:");
      }
    } else if (ussdStep === "PIN_INPUT") {
      if (choice.length === 4) {
        setUssdStep("COMPLETE");
        const actionType = ussdChoice as "CLOCK_IN" | "CLOCK_OUT";
        const empName = ussdPhone === "0911000003" ? "Almaz Bekele" : "Abebe Kebede";
        
        // Fire live log integration to dashboard state
        onSimulateLog({
          employeeName: empName,
          phoneNumber: ussdPhone,
          type: actionType,
          source: "USSD",
          latitude: null, // USSD doesn't have exact GPS bounds (Cell tower)
          longitude: null,
          isAnomaly: false,
          anomalyReason: null
        });

        setUssdDisplay(`USSD Request completed!\n${actionType} recorded at Piazza Branch.\n\nDial *999# to restart.`);
        setTimeout(() => {
          handleUssdClear();
        }, 3000);
      } else {
        setUssdDisplay("PIN must be 4 digits.\nEnter PIN:");
      }
    }
  };

  // -------------------- WEB PWA ACTIONS SIMULATOR --------------------
  const handleWebCheckIn = () => {
    const lat = parseFloat(webLat);
    const lng = parseFloat(webLng);
    
    // Geofencing Haversine calculation relative to Head Office (9.0300, 38.7400, Radius 100m)
    const HEAD_LAT = 9.0300;
    const HEAD_LNG = 38.7400;
    const R = 6371000; // meters
    const dLat = (lat - HEAD_LAT) * Math.PI / 180;
    const dLng = (lng - HEAD_LNG) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(HEAD_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const outOfBounds = distance > 100;
    const action = webStatus === "OUT" ? "CLOCK_IN" : "CLOCK_OUT";
    
    onSimulateLog({
      employeeName: "Selam Tesfaye",
      phoneNumber: "0911000002",
      type: action,
      source: "WEB_PWA",
      latitude: lat,
      longitude: lng,
      isAnomaly: outOfBounds,
      anomalyReason: outOfBounds ? `Geofence Violation: ${Math.round(distance)}m outside Piazza geofence.` : null
    });

    setWebStatus(prev => prev === "OUT" ? "IN" : "OUT");
  };

  // -------------------- MOBILE APP ACTIONS SIMULATOR --------------------
  const handleMobileCheckIn = () => {
    // Geofencing Haversine relative to Bole Branch (9.0010, 38.7830, Radius 150m)
    // Tapping Clock In/Out on this device simulator replicates the Expo experience
    const action = mobStatus === "OUT" ? "CLOCK_IN" : "CLOCK_OUT";
    
    onSimulateLog({
      employeeName: "Yosef Girma",
      phoneNumber: "0911000004",
      type: action,
      source: "MOBILE_APP",
      latitude: 9.0012, // Inside Bole Bounds
      longitude: 38.7831,
      isAnomaly: false,
      anomalyReason: null
    });

    setMobStatus(prev => prev === "OUT" ? "IN" : "OUT");
  };

  return (
    <div className="w-full flex flex-col h-[75vh] max-h-[800px] min-h-[500px] rounded-3xl glass-panel border-emerald-500/10 shadow-2xl overflow-hidden animate-fade-in relative">
      
      {/* Visual glowing highlight */}
      <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Terminal Title & Health Sync Header */}
      <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold tracking-widest text-[#0e8a60] dark:text-[#10b981] uppercase font-outfit">
            Demoz Telemetry Center
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold animate-pulse-slow">
            Active Security Node
          </span>
        </div>

        {/* Tab Headers */}
        <div className="flex bg-slate-100 dark:bg-zinc-900/60 p-1 rounded-xl gap-1 mt-1 border border-slate-200/40 dark:border-zinc-800/30">
          <button 
            onClick={() => setActiveSubTab("ai_chat")}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === "ai_chat" 
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            AI Compliance Chat
          </button>
          <button 
            onClick={() => setActiveSubTab("simulators")}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              activeSubTab === "simulators" 
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Telemetry Link (3-Channels)
          </button>
        </div>
      </div>

      {/* -------------------- TAB 1: AI COMPLIANCE CHAT & LEDGER -------------------- */}
      {activeSubTab === "ai_chat" && (
        <div className="flex-1 flex flex-col overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/80 animate-fade-in">
          
          {/* PANEL 1: COMPLIANCE CHAT */}
          <div className="flex-[3] flex flex-col overflow-hidden bg-slate-50/30 dark:bg-zinc-950/10">
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 scrollbar-thin">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] rounded-2xl p-2.5 text-[11px] leading-relaxed animate-fade-in ${
                    msg.sender === "user" 
                      ? "self-end bg-[#0b5c46] text-white border border-[#0d6e54]" 
                      : "self-start bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200/50 dark:border-zinc-800/50"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                  
                  {/* Render compliant tables in chat */}
                  {msg.isTable && msg.tableData && (
                    <div className="mt-2 border border-slate-200 dark:border-zinc-800/80 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold">
                            <th className="p-1">{msg.tableData[0][0]}</th>
                            <th className="p-1 text-right">{msg.tableData[0][1]}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 text-slate-600 dark:text-zinc-300">
                          {msg.tableData.slice(1).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-900/30">
                              <td className="p-1 font-medium">{row[0]}</td>
                              <td className="p-1 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{row[1]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="self-start bg-slate-100 dark:bg-zinc-900 border border-slate-200/30 dark:border-zinc-800/50 rounded-2xl p-2 px-3 text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                  <span>AI analyzing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="p-2 border-t border-slate-100 dark:border-zinc-800/50 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-100/30 dark:bg-zinc-950/20">
              {[
                { label: "Tax Scales", text: "What are Ethiopian income tax brackets?" },
                { label: "Check Risk", text: "Check today's attendance anomalies" },
                { label: "Audit Payroll", text: "Audit current payroll period" }
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(btn.text)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-[9px] font-semibold rounded-lg text-slate-600 dark:text-zinc-300 shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="p-2 bg-white dark:bg-zinc-950 flex gap-1.5 border-t border-slate-100 dark:border-zinc-800/60 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage(chatInput)}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[10px] focus:outline-none focus:border-emerald-500 dark:text-zinc-100"
                placeholder="Ask AI Compliance Agent..."
              />
              <button
                onClick={() => handleSendMessage(chatInput)}
                className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold active:scale-95 cursor-pointer shadow-sm"
              >
                Send
              </button>
            </div>
          </div>

          {/* PANEL 2: AUDIT TRAIL */}
          <div className="flex-[2] flex flex-col overflow-hidden p-3 bg-slate-50/10">
            <div className="flex justify-between items-center mb-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-outfit">
                Compliance Audit Trail
              </span>
              <span className="text-[9px] text-slate-400 font-semibold font-mono">APPEND-ONLY</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {auditLogs.map((log) => {
                const borderColors = {
                  info: "border-sky-500/20 text-sky-600 dark:text-sky-400 bg-sky-500/[0.02]",
                  success: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.02]",
                  warning: "border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/[0.02]",
                  error: "border-red-500/20 text-red-600 dark:text-red-400 bg-red-500/[0.02]"
                };

                return (
                  <div 
                    key={log.id} 
                    className={`p-2 rounded-xl border text-[10px] leading-normal flex items-start gap-2 ${borderColors[log.type]}`}
                  >
                    <span className="mt-0.5 text-xs select-none">
                      {log.type === "success" && "✓"}
                      {log.type === "info" && "ℹ"}
                      {log.type === "warning" && "⚠"}
                      {log.type === "error" && "⨯"}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-700 dark:text-zinc-300">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100">{log.user}</span> {log.action}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{log.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* -------------------- TAB 2: LIVE TELEMETRY SIMULATORS DECK -------------------- */}
      {activeSubTab === "simulators" && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4 bg-slate-50/20 dark:bg-zinc-950/10 animate-fade-in scrollbar-thin">
          
          {/* CHANNEL A: TELECOM USSD PHONE DIALER */}
          <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-extrabold text-[#0e8a60] dark:text-[#10b981] tracking-wider uppercase">
                Channel 1: USSD Mobile Gateway
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold">
                Online Sync
              </span>
            </div>

            {/* USSD screen display */}
            <div className="bg-[#020617] p-2.5 rounded-xl border border-zinc-800 text-center min-h-[64px] flex flex-col items-center justify-center font-mono">
              <p className="text-[9px] text-emerald-400 whitespace-pre-wrap leading-normal">{ussdDisplay}</p>
              {ussdStep === "DIAL" && ussdDialString && (
                <p className="text-xs font-bold text-white mt-1">{ussdDialString}</p>
              )}
            </div>

            {/* Interactive choices box */}
            {ussdStep !== "DIAL" && ussdStep !== "COMPLETE" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter input choice..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUssdChoiceSend(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="flex-1 px-3 py-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[10px] focus:outline-none"
                />
                <button
                  onClick={(e) => {
                    const inputEl = e.currentTarget.previousSibling as HTMLInputElement;
                    handleUssdChoiceSend(inputEl.value);
                    inputEl.value = "";
                  }}
                  className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                >
                  Send
                </button>
              </div>
            )}

            {/* Simulated Dialer Keypad */}
            {ussdStep === "DIAL" && (
              <div className="grid grid-cols-3 gap-1.5 max-w-[150px] mx-auto text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((char) => (
                  <button
                    key={char}
                    onClick={() => handleUssdKeyPress(char)}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg active:scale-95 cursor-pointer text-center"
                  >
                    {char}
                  </button>
                ))}
                <button
                  onClick={handleUssdClear}
                  className="py-1.5 bg-red-500/10 text-red-600 rounded-lg text-[8px] font-black cursor-pointer text-center"
                >
                  CLR
                </button>
                <button
                  onClick={handleUssdCall}
                  className="col-span-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[8px] font-black cursor-pointer text-center"
                >
                  CALL
                </button>
              </div>
            )}
          </div>

          {/* CHANNEL B: WEB PWA CHECK-IN GATEWAY */}
          <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-extrabold text-[#0e8a60] dark:text-[#10b981] tracking-wider uppercase">
                Channel 2: Web App PWA Check-In
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold">
                Geofenced Check
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">Latitude</label>
                <input 
                  type="text" 
                  value={webLat} 
                  onChange={(e) => setWebLat(e.target.value)} 
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg font-mono focus:outline-none" 
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">Longitude</label>
                <input 
                  type="text" 
                  value={webLng} 
                  onChange={(e) => setWebLng(e.target.value)} 
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg font-mono focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setWebLat("9.0300"); // Piazza Head Office coordinates (Inside)
                  setWebLng("38.7400");
                }}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-[9px] font-semibold rounded-lg text-center"
              >
                📍 Inside Piazza
              </button>
              <button
                onClick={() => {
                  setWebLat("9.0450"); // Piazza Out-of-bounds coordinates
                  setWebLng("38.7550");
                }}
                className="flex-1 py-1.5 bg-red-500/10 text-red-600 text-[9px] font-semibold rounded-lg text-center"
              >
                ⚠️ Out of bounds
              </button>
            </div>

            <button
              onClick={handleWebCheckIn}
              className={`w-full py-2 font-bold text-white rounded-xl text-[10px] active:scale-95 transition-all shadow-md cursor-pointer ${
                webStatus === "OUT" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {webStatus === "OUT" ? "WEB PWA: CLOCK IN" : "WEB PWA: CLOCK OUT"}
            </button>
          </div>

          {/* CHANNEL C: NATIVE MOBILE APP WIDGET MOCK */}
          <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-extrabold text-[#0e8a60] dark:text-[#10b981] tracking-wider uppercase">
                Channel 3: Expo Mobile Simulator
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[8px] font-bold font-mono">
                Zustand Store
              </span>
            </div>

            {/* Simulating Phone Container */}
            <div className="bg-[#070b13] p-4 rounded-2xl border border-zinc-800 text-center flex flex-col items-center gap-3">
              <div className="text-left w-full text-zinc-400 text-[8px] font-mono leading-none">
                <div>Emp: <span className="font-bold text-zinc-100">Yosef Girma</span></div>
                <div className="mt-1">Loc: <span className="text-emerald-500">Hawassa Factory</span></div>
              </div>

              {/* The Big Circular Clock Button Mockup */}
              <button
                onClick={handleMobileCheckIn}
                className={`w-28 h-28 rounded-full border-4 border-zinc-800 flex flex-col items-center justify-center font-bold text-white active:scale-95 transition-all cursor-pointer shadow-lg ${
                  mobStatus === "OUT" 
                    ? "bg-emerald-600 border-emerald-500/20 shadow-emerald-500/10" 
                    : "bg-red-600 border-red-500/20 shadow-red-500/10"
                }`}
              >
                <span className="text-[10px] tracking-widest">{mobStatus === "OUT" ? "CLOCK IN" : "CLOCK OUT"}</span>
                {mobStatus === "IN" && (
                  <span className="text-[9px] font-mono text-zinc-100 mt-1 font-semibold">{mobTimer}</span>
                )}
              </button>

              <span className="text-[8px] text-zinc-500 font-mono">GPS Lock: Haversine Compliant</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
