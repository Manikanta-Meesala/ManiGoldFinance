# ManiGoldFinance

### Full-Stack Gold Loan & Finance Management System

ManiGoldFinance is a full-stack application designed to digitize real-world gold loan operations, including customer management, loan tracking, interest calculation, repayment, collateral verification, external pledges, reporting, and backups.

The project was rebuilt using **Java + Spring Boot** with a React frontend and SQLite database.

---

## 🚀 Tech Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=java,spring,react,vite,nodejs,express,sqlite,js,html,css,maven,git,github" />
</p>

---

## ✨ Key Features

- 👤 Customer and gold-loan management
- 💰 Configurable slab-based interest calculation
- 🔄 Active and returned loan tracking
- 🏪 External pledge management
- 📷 Gold item image capture
- 🎥 Return-verification video recording
- 🔐 Admin authentication with BCrypt
- 📊 Dashboard, search, analytics and reports
- 📑 Excel report generation using Apache POI
- 💾 Automated database backup support
- 📁 Year/Month based media organization
- 📴 Local-first operation using SQLite

---

## 🏗️ Architecture

```text
                    ┌─────────────────┐
                    │      React      │
                    │    Frontend     │
                    └────────┬────────┘
                             │ REST API
                             ▼
                  ┌─────────────────────┐
                  │    Spring Boot      │
                  │      Backend        │
                  ├─────────────────────┤
                  │ Controllers         │
                  │ Services            │
                  │ Business Logic      │
                  │ Data Access         │
                  └──────────┬──────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ┌──────────┐      ┌─────────────┐
              │  SQLite  │      │ File Storage│
              │ Database │      │ Images/Video│
              └──────────┘      └─────────────┘
```
💡 Core Workflow
```text
Customer
   ↓
Create Gold Loan
   ↓
Capture Gold Details & Images
   ↓
Interest Calculation
   ↓
Active Loan
   ↓
Repayment / Return
   ↓
Verification Video
   ↓
Returned Loan
```
🛠️ Running Locally
Requirements
Java 21+
Maven 3.9+
Node.js & npm
Git
Backend
```twxt
🛠️ Running Locally
Requirements
Java 21+
Maven 3.9+
Node.js & npm
Git
Backend
```
Frontend
```text
cd frontend
npm install
npm run dev
```
Open the frontend URL shown by Vite.
📂 Project Structure
```text
ManiGoldFinance/
├── backend/       # Spring Boot + Java
├── frontend/      # React + Vite
├── data/          # Local database & application data
└── README.md
```
👨‍💻 Author

Manikanta Meesala

GitHub •
Codolio
