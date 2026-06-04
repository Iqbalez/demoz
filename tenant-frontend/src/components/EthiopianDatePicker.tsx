"use client";

import React, { useState, useMemo, useCallback } from "react";

// Ethiopian month names
const EC_MONTHS = [
  { am: "መስከረም", en: "Meskerem" },
  { am: "ጥቅምት", en: "Tikimt" },
  { am: "ኅዳር", en: "Hidar" },
  { am: "ታኅሣሥ", en: "Tahsas" },
  { am: "ጥር", en: "Tir" },
  { am: "የካቲት", en: "Yekatit" },
  { am: "መጋቢት", en: "Megabit" },
  { am: "ሚያዝያ", en: "Miazia" },
  { am: "ግንቦት", en: "Ginbot" },
  { am: "ሰኔ", en: "Sene" },
  { am: "ሐምሌ", en: "Hamle" },
  { am: "ነሐሴ", en: "Nehase" },
  { am: "ጳጉሜ", en: "Pagume" },
];

const EC_WEEKDAYS = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "አር", "ቅዳ"];
const GC_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Static public holiday dates (month-day) for highlighting
const HOLIDAY_DATES = [
  "9-11", "9-27", "1-7", "1-19", "3-2", "5-1", "5-5", "5-28",
];

interface EthiopianDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  id?: string;
}

/**
 * Ethiopian Calendar Date Picker.
 * Renders Ethiopian month grid with Amharic names, highlights public holidays.
 * Returns a standard Gregorian JS Date to the form for DB storage.
 */
export default function EthiopianDatePicker({
  value,
  onChange,
  label = "Select Date / ቀን ይምረጡ",
  id = "ethiopian-date-picker",
}: EthiopianDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());

  // Try loading ethiopian-date library
  let toEthiopian: (y: number, m: number, d: number) => number[];
  let toGregorian: (y: number, m: number, d: number) => number[];
  try {
    const ethLib = require("ethiopian-date");
    toEthiopian = ethLib.toEthiopian;
    toGregorian = ethLib.toGregorian;
  } catch {
    // Fallback — show Gregorian picker
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-bold text-slate-600 dark:text-zinc-400">
          {label}
        </label>
        <input
          id={id}
          type="date"
          value={value?.toISOString().slice(0, 10) || ""}
          onChange={(e) => onChange(new Date(e.target.value))}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm"
        />
        <p className="text-[9px] text-amber-500">Ethiopian calendar library unavailable. Using Gregorian fallback.</p>
      </div>
    );
  }

  const currentEth = useMemo(() => {
    const d = viewDate;
    return toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, [viewDate, toEthiopian]);

  const selectedEth = useMemo(() => {
    if (!value) return null;
    return toEthiopian(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }, [value, toEthiopian]);

  const ethYear = currentEth[0];
  const ethMonth = currentEth[1];
  const monthInfo = EC_MONTHS[ethMonth - 1];
  const daysInMonth = ethMonth <= 12 ? 30 : (ethYear % 4 === 3 ? 6 : 5);

  // Get the Gregorian weekday of the 1st of this Ethiopian month
  const firstDayGC = useMemo(() => {
    const [gy, gm, gd] = toGregorian(ethYear, ethMonth, 1);
    return new Date(gy, gm - 1, gd).getDay();
  }, [ethYear, ethMonth, toGregorian]);

  const isHoliday = useCallback(
    (ethDay: number) => {
      try {
        const [gy, gm, gd] = toGregorian(ethYear, ethMonth, ethDay);
        const key = `${gm}-${gd}`;
        return HOLIDAY_DATES.includes(key);
      } catch {
        return false;
      }
    },
    [ethYear, ethMonth, toGregorian]
  );

  const handleDayClick = useCallback(
    (day: number) => {
      try {
        const [gy, gm, gd] = toGregorian(ethYear, ethMonth, day);
        const date = new Date(gy, gm - 1, gd);
        onChange(date);
        setIsOpen(false);
      } catch {
        // Invalid date
      }
    },
    [ethYear, ethMonth, onChange, toGregorian]
  );

  const navigateMonth = useCallback(
    (delta: number) => {
      let newMonth = ethMonth + delta;
      let newYear = ethYear;
      if (newMonth < 1) { newMonth = 13; newYear--; }
      if (newMonth > 13) { newMonth = 1; newYear++; }
      try {
        const [gy, gm, gd] = toGregorian(newYear, newMonth, 1);
        setViewDate(new Date(gy, gm - 1, gd));
      } catch {
        // Invalid navigation
      }
    },
    [ethMonth, ethYear, toGregorian]
  );

  // Format the selected date display
  const displayValue = useMemo(() => {
    if (!value || !selectedEth) return "";
    const m = EC_MONTHS[selectedEth[1] - 1];
    return `${m.am} ${selectedEth[2]}, ${selectedEth[0]} (${m.en})`;
  }, [value, selectedEth]);

  return (
    <div className="space-y-1.5 relative" id={id}>
      <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">{label}</label>

      {/* Input display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm text-left flex justify-between items-center hover:border-emerald-500 transition-colors cursor-pointer"
      >
        <span className={displayValue ? "text-slate-800 dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500"}>
          {displayValue || "ቀን ይምረጡ / Select date"}
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 animate-slide-up">
          {/* Month navigation */}
          <div className="flex justify-between items-center mb-3">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">{monthInfo?.am}</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500">{monthInfo?.en} {ethYear} EC</div>
            </div>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {EC_WEEKDAYS.map((day, i) => (
              <div key={i} className="text-center text-[9px] font-bold text-slate-400 dark:text-zinc-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayGC }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const holiday = isHoliday(day);
              const isSelected = selectedEth && selectedEth[0] === ethYear && selectedEth[1] === ethMonth && selectedEth[2] === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                    ${isSelected
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : holiday
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }
                  `}
                  title={holiday ? "Public Holiday / የህዝብ በዓል" : ""}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-3 text-[9px] text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/20" />
              <span>Holiday / በዓል</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-600" />
              <span>Selected / የተመረጠ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
