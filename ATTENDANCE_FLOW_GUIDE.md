# 📸 Attendance System - Visual Flow Guide

## 🎯 What You Should See

This guide shows exactly what you should see at each step when using the attendance system.

---

## 🔐 Step 0: Login

**URL:** http://localhost:5173

**What to do:**
- Enter email: `teacher@school.com`
- Enter password: `teacher123`
- Click "Login"

**What you should see:**
- Dashboard page loads
- Sidebar shows: Dashboard, Students, Courses, Attendance, etc.
- User info in top right corner

---

## 📍 Step 1: Navigate to Attendance

**What to do:**
- Click "Attendance" in the left sidebar

**What you should see:**
- Page title: "Attendance Management"
- Subtitle: "Mark and track student attendance by department and course"
- Two tabs: "Mark Attendance" (active) and "View Records"
- Four-step form below

---

## 🏢 Step 2: Select Department

**What you should see:**

```
Step 1: Select Department *
┌─────────────────────────────────────┐
│ -- Select Department --         ▼  │
├─────────────────────────────────────┤
│ Computer Science (CS)               │
│ Mathematics (MATH)                  │
│ Physics (PHYS)                      │
│ Chemistry (CHEM)                    │
│ English (ENG)                       │
└─────────────────────────────────────┘
```

**What to do:**
- Click the dropdown
- Select "Computer Science"

**What happens:**
- Dropdown closes
- "Step 2: Select Course" section appears below
- Loading spinner shows briefly

---

## 📚 Step 3: Select Course (Teacher View)

**What you should see:**

```
Step 2: Select Course *
┌─────────────────────────────────────────────────────────┐
│ -- Select Course --                                  ▼  │
├─────────────────────────────────────────────────────────┤
│ Introduction to Programming (CS101) - 4 credits         │
│ Data Structures (CS201) - 4 credits                     │
└─────────────────────────────────────────────────────────┘
```

**Note:** You only see 2 courses because:
- You are logged in as teacher@school.com
- You are only assigned to CS101 and CS201
- CS301 (Database Systems) is NOT shown (you're not assigned)

**What to do:**
- Click the dropdown
- Select "Introduction to Programming (CS101) - 4 credits"

**What happens:**
- "Step 3: Select Date" appears
- "Step 4: Mark Attendance" appears
- Loading spinner shows
- Students table loads

---

## 📚 Step 3: Select Course (Admin View)

**If you were logged in as admin@school.com, you would see:**

```
Step 2: Select Course *
┌─────────────────────────────────────────────────────────┐
│ -- Select Course --                                  ▼  │
├─────────────────────────────────────────────────────────┤
│ Introduction to Programming (CS101) - 4 credits         │
│ Data Structures (CS201) - 4 credits                     │
│ Database Systems (CS301) - 3 credits                    │
└─────────────────────────────────────────────────────────┘
```

**Note:** Admin sees ALL 3 courses (no restrictions)

---

## 📅 Step 4: Select Date

**What you should see:**

```
Step 3: Select Date *
┌─────────────────────────────────────┐
│ 2026-02-24                      📅  │
└─────────────────────────────────────┘
```

**What to do:**
- Date is pre-filled with today
- You can change it if needed
- Click the date picker to select a different date

---

## 👥 Step 5: Students Auto-Load

**What you should see:**

```
Step 4: Mark Attendance for Enrolled Students

[Mark All Present]  [Mark All Absent]

┌─────────────┬──────────────┬─────────────────────────┬──────────┐
│ Student ID  │ Name         │ Email                   │ Status   │
├─────────────┼──────────────┼─────────────────────────┼──────────┤
│ CS2024001   │ John Doe     │ john.doe@school.com     │ Present ▼│
│ CS2024002   │ Jane Smith   │ jane.smith@school.com   │ Present ▼│
│ CS2024003   │ Mike Johnson │ mike.johnson@school.com │ Present ▼│
└─────────────┴──────────────┴─────────────────────────┴──────────┘
```

**Key points:**
- ✅ 3 students appear automatically
- ✅ No search box (not needed!)
- ✅ All students are enrolled in CS101
- ✅ Status defaults to "Present"
- ✅ Each status is a dropdown with options

**Status dropdown options:**
- Present (green)
- Absent (red)
- Late (yellow)
- Excused (blue)

---

## ✏️ Step 6: Mark Attendance

**What to do:**

**Option A: Individual marking**
- Click each student's status dropdown
- Select: Present, Absent, Late, or Excused

**Option B: Bulk marking**
- Click "Mark All Present" button (top right)
- OR click "Mark All Absent" button

**Example after marking:**

```
┌─────────────┬──────────────┬─────────────────────────┬──────────┐
│ Student ID  │ Name         │ Email                   │ Status   │
├─────────────┼──────────────┼─────────────────────────┼──────────┤
│ CS2024001   │ John Doe     │ john.doe@school.com     │ Present ▼│
│ CS2024002   │ Jane Smith   │ jane.smith@school.com   │ Absent  ▼│
│ CS2024003   │ Mike Johnson │ mike.johnson@school.com │ Late    ▼│
└─────────────┴──────────────┴─────────────────────────┴──────────┘
```

---

## 💾 Step 7: Submit Attendance

**What you should see:**

```
┌─────────────────────────────────────────────────────────┐
│        Submit Attendance for 3 Students                 │
└─────────────────────────────────────────────────────────┘
```

**What to do:**
- Click the blue "Submit Attendance for 3 Students" button

**What happens:**
- Button shows loading spinner
- Text changes to "Submitting Attendance..."
- After 1-2 seconds, success message appears

---

## ✅ Step 8: Success Message

**What you should see:**

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Attendance marked successfully for 3 students!       │
└─────────────────────────────────────────────────────────┘
```

**What happens:**
- Green success banner appears at top
- Message auto-disappears after 3 seconds
- Attendance is saved to database
- Status dropdowns reset to "Present"

---

## 📊 Step 9: View Records

**What to do:**
- Click "View Records" tab at the top

**What you should see:**

```
[Mark Attendance]  [View Records] ← Active

Filter Section:
┌──────────────┬──────────────┬──────────────┬──────────┐
│ Student ID   │ Course       │ Date         │ [Apply]  │
│ CS2024001    │              │              │          │
└──────────────┴──────────────┴──────────────┴──────────┘

Records Table:
┌─────────────┬─────────────────────────────┬────────────┬─────────┬──────────────────┬─────────┐
│ Student ID  │ Course                      │ Date       │ Status  │ Recorded At      │ Actions │
├─────────────┼─────────────────────────────┼────────────┼─────────┼──────────────────┼─────────┤
│ CS2024001   │ Introduction to Programming │ 2026-02-24 │ Present │ 2/24/2026 8:30AM │ P A L   │
│ CS2024002   │ Introduction to Programming │ 2026-02-24 │ Absent  │ 2/24/2026 8:30AM │ P A L   │
│ CS2024003   │ Introduction to Programming │ 2026-02-24 │ Late    │ 2/24/2026 8:30AM │ P A L   │
└─────────────┴─────────────────────────────┴────────────┴─────────┴──────────────────┴─────────┘
```

**Actions buttons:**
- P = Mark Present
- A = Mark Absent
- L = Mark Late

**What you can do:**
- Filter by Student ID, Course, or Date
- Click "Apply Filters" to search
- Click P/A/L buttons to update status
- View all attendance history

---

## 🚫 What You Should NOT See

### ❌ Manual Student Search Box
**You should NOT see:**
- Search box to find students
- "Add Student" button in attendance
- Manual student selection

**Why:** Students auto-load from enrollments!

### ❌ All Courses (Teacher View)
**You should NOT see:**
- Database Systems (CS301) when logged in as teacher@school.com
- Physics courses
- Chemistry courses

**Why:** Teachers only see assigned courses!

### ❌ Empty Student List
**You should NOT see:**
- "No students found" message
- Empty table after selecting course

**Why:** Students are enrolled and should appear!

**If you see this:** Run `node backend/seedEnrollmentData.js`

---

## 🎨 Color Coding

### Status Colors:
- **Present**: Green background, green text
- **Absent**: Red background, red text
- **Late**: Yellow background, yellow text
- **Excused**: Blue background, blue text

### Messages:
- **Success**: Green banner with checkmark
- **Error**: Red banner with X
- **Warning**: Yellow banner with !

---

## 🔄 Complete Flow Summary

```
1. Login (teacher@school.com)
   ↓
2. Click "Attendance" in sidebar
   ↓
3. Select "Computer Science" department
   ↓
4. Select "Introduction to Programming" course
   ↓
5. See 3 students auto-load (John, Jane, Mike)
   ↓
6. Mark attendance (Present/Absent/Late/Excused)
   ↓
7. Click "Submit Attendance for 3 Students"
   ↓
8. See success message
   ↓
9. Click "View Records" to see history
   ↓
10. Done! ✅
```

**Time:** 30 seconds  
**Clicks:** 6-7 clicks  
**Typing:** 0 (no manual search!)

---

## 🧪 Test Different Scenarios

### Scenario 1: Different Department
```
1. Select "Mathematics" department
2. See only "Calculus I" (your assigned course)
3. Select "Calculus I"
4. See 2 students (Sarah Williams, David Brown)
5. Mark and submit
```

### Scenario 2: Unauthorized Department
```
1. Select "Physics" department
2. See message: "No courses available in this department"
3. See note: "You may not be assigned to any courses in this department"
4. Cannot proceed (correct behavior!)
```

### Scenario 3: Admin Access
```
1. Logout
2. Login as admin@school.com / admin123
3. Select "Physics" department
4. See ALL 2 Physics courses (no restrictions)
5. Select any course
6. See all enrolled students
```

---

## 📞 Quick Troubleshooting

### Problem: Department dropdown is empty
**Check:**
- Backend running? (http://localhost:3001)
- Browser console for errors (F12)

### Problem: No courses appear
**Check:**
- Did you select a department?
- Are you a teacher? (only see assigned courses)
- Run seeding script if needed

### Problem: No students appear
**Check:**
- Did you select a course?
- Run: `node backend/seedEnrollmentData.js`
- Check browser console

### Problem: Submit button doesn't work
**Check:**
- Did you select department, course, and date?
- Are there students in the list?
- Check browser console for errors

---

## ✅ Success Checklist

After following this guide, you should have:
- [x] Logged in successfully
- [x] Navigated to Attendance page
- [x] Seen department dropdown with 5 departments
- [x] Selected Computer Science department
- [x] Seen 2-3 courses (depending on teacher)
- [x] Selected a course
- [x] Seen 3 students auto-load
- [x] Marked attendance for students
- [x] Submitted successfully
- [x] Seen success message
- [x] Viewed records in Records tab

---

## 🎉 You're Done!

The enrollment system is working perfectly if you saw all the above screens and behaviors.

**Key Takeaways:**
- ✅ No manual student searching
- ✅ Structured flow: Department → Course → Students
- ✅ Teachers see only assigned courses
- ✅ Students auto-load from enrollments
- ✅ Fast and intuitive

**Enjoy using the system!** 🚀

---

**Document Version:** 1.0  
**Date:** February 24, 2026  
**Status:** Complete and Verified
