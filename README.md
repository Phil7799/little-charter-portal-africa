# Charter & HR Analytics Portal - Version 4.0
## Separated Dashboards with Specific Filters

---

## 🎯 MAJOR CHANGES IN VERSION 4.0

### Separated Analytics Dashboards ✅
**Previous Structure:**
- Single combined dashboard with all filters

**New Structure:**
- **Charter Dashboard** (`charter-dashboard.html`) - Charter-specific analytics
  - Filters: Associate, Month, Year
  - Shows: Charter revenue, new vs existing business, associate performance
  
- **HR Dashboard** (`hr-dashboard.html`) - HR-specific analytics
  - Filters: Business Unit, Month
  - Shows: HR revenue by business, target achievement, business trends

---

## 📊 DASHBOARD DETAILS

### Charter Dashboard
**URL:** `charter-dashboard.html`

**Filters:**
- Associate (philip, carol, wambui, or All)
- Month (January-December or All)
- Year (2025/2026)

**KPIs:** Total Revenue, New Business, Existing Business, YoY Growth

**Charts:** Revenue Trend, Revenue Breakdown, Monthly Target, Associate Performance

### HR Dashboard
**URL:** `hr-dashboard.html`

**Filters:**
- Business Unit (Overall, Payroll, School, TELESALES, or All)
- Month (January-December or All)

**KPIs:** Total Revenue, Payroll System, School Attendance, TELESALES

**Charts:** Revenue Trend, Business Distribution, Achievement, Business Trend

---

## 📁 FILE STRUCTURE

**New Files:**
- charter-dashboard.html
- charter-dashboard.js
- hr-dashboard.html
- hr-dashboard.js

**Updated Files:**
- index.html (new navigation)
- upload.html (links to both dashboards)

**Removed Files:**
- dashboard.html (replaced)
- script.js (replaced)

---

## 🚀 QUICK START

1. Upload data via Upload page
2. Choose Charter or HR dashboard
3. Use relevant filters
4. Switch between dashboards with button

**Version 4.0** - Separated, focused analytics for better UX!