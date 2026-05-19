# 2026 Ethiopian Public Holidays Report

This document lists the public holidays in Ethiopia for the year 2026. This data is critical for the "Demoz" system's overtime calculation engine, as hours worked on these days must be compensated at a rate of **2.5x the basic hourly rate**.

## 1. Fixed Public Holidays (2026)

These holidays occur on the same day every year in the Ethiopian (Ethiopic) calendar.

- **January 7** (Wednesday): Ethiopian Christmas (Genna) - *29 Tahsas 2018*
- **January 19** (Monday): Orthodox Epiphany (Timkat) - *11 Tir 2018*
- **March 2** (Monday): Victory of Adwa Day - *23 Yekatit 2018*
- **May 1** (Friday): International Workers' Day (Labour Day) - *23 Miazia 2018*
- **May 5** (Tuesday): Ethiopian Patriots' Victory Day - *27 Miazia 2018*
- **May 28** (Thursday): Downfall of the Derg (Ginbot 20) - *20 Ginbot 2018*
- **September 11** (Friday): Ethiopian New Year (Enkutatash) - *1 Meskerem 2019*
- **September 27** (Sunday): Meskel (Finding of the True Cross) - *17 Meskerem 2019*

## 2. Moveable Public Holidays (Religious) - 2026

The dates for these holidays vary each year based on the lunar calendar (Islamic) or the Orthodox liturgical calendar.

- **March 20** (Friday): **Eid al-Fitr** (End of Ramadan) - *11 Megabit 2018*
- **April 10** (Friday): **Ethiopian Good Friday** (Siklet) - *02 Miazia 2018*
- **April 12** (Sunday): **Ethiopian Easter** (Fasika) - *04 Miazia 2018*
- **May 28** (Thursday): **Eid al-Adha** (Feast of the Sacrifice) - *20 Ginbot 2018*
  *   *Note: In 2026, this coincides with Downfall of the Derg Day.*
- **August 25** (Tuesday): **Mawlid** (Birthday of Prophet Muhammad) - *19 Nehasse 2018*

## 3. 2026 Holiday Summary Table

| Date (Gregorian) | Ethiopic Date | Holiday Name | Multiplier |
| :--- | :--- | :--- | :--- |
| Jan 07, 2026 | 29 Tahsas 2018 | Ethiopian Christmas (Genna) | 2.5x |
| Jan 19, 2026 | 11 Tir 2018 | Orthodox Epiphany (Timkat) | 2.5x |
| Mar 02, 2026 | 23 Yekatit 2018 | Adwa Victory Day | 2.5x |
| Mar 20, 2026 | 11 Megabit 2018 | Eid al-Fitr | 2.5x |
| Apr 10, 2026 | 02 Miazia 2018 | Ethiopian Good Friday (Siklet) | 2.5x |
| Apr 12, 2026 | 04 Miazia 2018 | Ethiopian Easter (Fasika) | 2.5x |
| May 01, 2026 | 23 Miazia 2018 | International Workers' Day | 2.5x |
| May 05, 2026 | 27 Miazia 2018 | Ethiopian Patriots' Victory Day | 2.5x |
| May 28, 2026 | 20 Ginbot 2018 | Downfall of the Derg / Eid al-Adha | 2.5x |
| Aug 25, 2026 | 19 Nehasse 2018 | Mawlid | 2.5x |
| Sep 11, 2026 | 01 Meskerem 2019 | Ethiopian New Year (Enkutatash) | 2.5x |
| Sep 27, 2026 | 17 Meskerem 2019 | Meskel (Finding of the True Cross) | 2.5x |

## 4. Implementation Guidelines for the Engine
*   **Holiday Multiplier:** As per the Ethiopian Labor Proclamation, work performed on a public holiday must be paid at **2.5x** the normal rate.
*   **Holiday Overlap:** On **May 28, 2026**, two holidays occur simultaneously (Downfall of the Derg and Eid al-Adha). The system should only apply the holiday multiplier once for this 24-hour period.
*   **Weekend Holidays:** If a holiday falls on a weekend (e.g., Easter Sunday, Meskel Sunday), the holiday multiplier takes precedence over the standard weekend rest multiplier (2.0x).

---
*Created by: agent-researcher*
*Date: May 8, 2026*
