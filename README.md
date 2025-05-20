# 📘 Server

Node.js + TypeScript backend for managing educational institutions, activity schedules, and Google Sheets integration.  
Designed for operational efficiency across hundreds of kindergartens and schools.

---

## 🌟 Project Highlights

This system powers a real-world municipal program managing:

- groups (kindergartens + classes)
- Weekly activity schedules
- Operator coordination
- Financial reports
- Google Sheets + PDF report generation

---

## 🧠 Core Logic and Design Principles

- **Smart Calendar Engine**  
  Automatically filters out national holidays and vacation weeks using a **Jewish holiday calendar** (`holidays.ts`).

- **Weekly Aggregation Logic**  
  Groups activity data by custom week spans (Sunday–Saturday), aligning with school calendars.

- **Soft Deletion with `isActive`**  
  All entities support logical deletion to maintain audit history.

- **Conflict Prevention**  
  Ensures operators aren’t scheduled for overlapping activities.

---

## 🔧 Tech Stack

- **Express** (Node.js)
- **MongoDB + Mongoose**
- **TypeScript**
- **Google Sheets API v4**
- **NodeMailer** (for PDF delivery)

---

## 📑 Automatic PDF Reports

Monthly PDF reports are generated per operator:

- Includes full weekly schedule
- Organized by Hebrew day names and dates
- Highlights total activity count
- Designed for printing + signature

📬 Delivered via **email** with styled PDF attachment per operator.

---

## 📊 Excel / Google Sheets Reports

- **Monthly Sheets:**  
  Each month has its own sheet showing weekly activity status per class.

- **Yearly Sheet:**  
  Comprehensive table of all classes by week across the year.

- **Holiday Logic:**  
  Weeks where **Sunday–Thursday** are all holidays are marked with **non-operational**, including:
  - Gray cell formatting (optional)
  - Auto-detection based on `holidays.ts`

- **Live Sync:**  
  Sheets are synced to Google Sheets using the API v4.  
  A dedicated **"Export" button** in the admin triggers the export.  
  The system shows the **last export time** to prevent redundant runs.

---

## 🔄 Query System

All data fetching uses filters and optimization:

- `isActive: true` by default
- Filter activities:
  - By operator
  - By class
  - By institution

---


## ⚠️ License Notice

**This project is proprietary and all rights are reserved.**  
You may **not copy, use, modify, or distribute** any part of this code without **explicit written permission** from the author.

📩 For inquiries, please contact: [amtamar747@gmail.com](mailto:amtamar747@gmail.com)