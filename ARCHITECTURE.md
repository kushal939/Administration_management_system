# System Architecture Design
## School Administration Management System

---

## Architecture Pattern: 3-Tier Architecture

```
┌──────────────────────────────┐
│      PRESENTATION LAYER      │
│    React.js + Tailwind CSS   │
│         (Port 5173)          │
└──────────────┬───────────────┘
               │ REST API (HTTP/JSON)
┌──────────────▼───────────────┐
│      APPLICATION LAYER       │
│     Node.js + Express.js     │
│         (Port 3001)          │
└──────────────┬───────────────┘
               │ SQL Queries
┌──────────────▼───────────────┐
│         DATA LAYER           │
│      SQLite Database         │
└──────────────────────────────┘
```

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js (Vite) |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | SQLite3 |
| Authentication | bcryptjs |
| Payment Gateway | eSewa API |
| OCR | Tesseract.js |
| File Upload | Multer |

---

## System Architecture Diagram

```
         [Browser - React.js Frontend]
                     │
              HTTP REST API
                     │
         [Express.js Backend Server]
          /      |       |       \
    [Auth]  [Routes]  [Middleware] [Utils]
                |
         [SQLite Database]
          /    |    |    \
      Users Students Fees Attendance ...
```

---

## Key Modules

**Frontend Modules:**
- Login / Authentication
- Student Management
- Attendance Management
- Fees & Payment (eSewa)
- Assignments
- Notices & Messages
- Batch Management

**Backend Modules:**
- REST API Routes
- Authentication Middleware
- Database Helpers
- Notification System
- Payment Verification

---

## Authentication Flow

```
User Login → bcryptjs password verify
           → role returned (admin/teacher/student/principal)
           → stored in localStorage
           → sent as header in every request
           → middleware checks role → grants/denies access
```

---

## Data Flow

```
React Component
    → Axios HTTP Request (with role headers)
    → Express Route Handler
    → SQLite Query
    → JSON Response
    → UI Update
```
