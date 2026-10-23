# 🔔 NOTIFICATION SYSTEM DOCUMENTATION

## Overview
A comprehensive real-time notification system integrated across all 4 user roles (Admin, Principal, Teacher, Student) that automatically sends notifications for various actions throughout the system.

---

## Features

### ✅ Real-Time Notifications
- Automatic notifications for all major actions
- Role-based notification delivery
- Unread count badge with animation
- Auto-refresh every 30 seconds
- Mark as read/unread functionality
- Delete individual notifications
- Mark all as read option

### ✅ Notification Types
1. **Attendance** 📅 - When attendance is marked
2. **Marks** 📝 - When marks are added/updated
3. **Fees** 💰 - When fees are added
4. **Assignments** 📚 - When new assignments are created
5. **Notices** 📢 - When notices are posted
6. **Student Requests** 👨‍🎓 - When teachers request to add students
7. **Request Status** ✉️ - When admin approves/rejects requests
8. **Enrollment** 🎓 - When students are enrolled in courses
9. **Payments** ✅ - When fee payments are recorded

---

## Database Schema

### notifications Table
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  recipient_role TEXT,           -- Target role (admin/teacher/student/principal)
  recipient_id TEXT,             -- Specific user ID/email
  sender_id TEXT,                -- Sender user ID
  sender_name TEXT,              -- Sender display name
  related_entity TEXT,           -- Related entity type
  related_id TEXT,               -- Related entity ID
  is_read INTEGER DEFAULT 0,     -- Read status (0=unread, 1=read)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## API Endpoints

### 1. Get Notifications
```
GET /api/notifications
```
**Description:** Fetch all notifications for the current user based on their role and ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "📅 Attendance Marked",
      "message": "Your attendance for Mathematics has been marked as PRESENT by teacher123",
      "type": "attendance",
      "recipient_role": null,
      "recipient_id": "STU001",
      "sender_name": "teacher123",
      "is_read": 0,
      "created_at": "2024-02-25T10:30:00Z"
    }
  ]
}
```

### 2. Mark Notification as Read
```
PUT /api/notifications/:id/read
```
**Description:** Mark a specific notification as read

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 3. Mark All as Read
```
PUT /api/notifications/mark-all-read
```
**Description:** Mark all notifications for current user as read

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "changes": 5
}
```

### 4. Delete Notification
```
DELETE /api/notifications/:id
```
**Description:** Delete a specific notification

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## Notification Triggers

### 1. Attendance Marked
**Trigger:** When teacher marks attendance
**Recipient:** Specific student
**Example:**
```javascript
notifyAttendanceMarked(
  studentId: "STU001",
  studentName: "John Doe",
  course: "Mathematics",
  status: "present",
  teacherName: "Mr. Smith"
);
```

### 2. Marks Added/Updated
**Trigger:** When teacher adds or updates marks
**Recipient:** Specific student
**Example:**
```javascript
notifyMarksAdded(
  studentId: "STU001",
  studentName: "John Doe",
  subject: "Physics",
  marks: 85,
  totalMarks: 100,
  teacherName: "Dr. Johnson"
);
```

### 3. Fees Added
**Trigger:** When admin adds a fee
**Recipient:** Specific student
**Example:**
```javascript
notifyFeesAdded(
  studentId: "STU001",
  studentName: "John Doe",
  amount: 5000,
  description: "Tuition Fee - Semester 1",
  category: "Tuition"
);
```

### 4. Assignment Created
**Trigger:** When teacher creates an assignment
**Recipient:** All students (role-based)
**Example:**
```javascript
notifyAssignmentCreated(
  course: "Computer Science",
  title: "Data Structures Project",
  dueDate: "2024-03-15",
  teacherName: "Prof. Williams"
);
```

### 5. Notice Posted
**Trigger:** When admin/teacher posts a notice
**Recipient:** All roles or specific role
**Example:**
```javascript
notifyNoticePosted(
  title: "Holiday Announcement",
  type: "announcement",
  priority: "high",
  createdBy: "Admin",
  targetRole: null  // null = all roles
);
```

### 6. Student Request Created
**Trigger:** When teacher requests to add a student
**Recipient:** Admin role
**Example:**
```javascript
notifyStudentRequestCreated(
  studentName: "Jane Smith",
  department: "Computer Science",
  teacherName: "Mr. Brown"
);
```

### 7. Student Request Status
**Trigger:** When admin approves/rejects a student request
**Recipient:** Specific teacher who made the request
**Example:**
```javascript
notifyStudentRequestStatus(
  studentName: "Jane Smith",
  status: "approved",  // or "rejected"
  teacherId: "TEACH001",
  adminName: "Admin",
  reason: "Incomplete information"  // for rejections
);
```

### 8. Student Enrolled
**Trigger:** When student is enrolled in a course
**Recipient:** Specific student
**Example:**
```javascript
notifyStudentEnrolled(
  studentId: "STU001",
  studentName: "John Doe",
  courseName: "Advanced Mathematics",
  department: "Mathematics"
);
```

### 9. Payment Received
**Trigger:** When fee payment is recorded
**Recipient:** Specific student
**Example:**
```javascript
notifyPaymentReceived(
  studentId: "STU001",
  amount: 5000,
  feeDescription: "Tuition Fee - Semester 1"
);
```

---

## Frontend Component

### NotificationBar Component
Located at: `frontend/src/components/NotificationBar.jsx`

**Features:**
- Bell icon with unread count badge
- Dropdown with notification list
- Real-time updates (30-second polling)
- Mark as read/delete actions
- Time ago display (e.g., "5m ago", "2h ago")
- Emoji icons for different notification types
- Smooth animations and transitions

**Usage:**
```jsx
import NotificationBar from '../components/NotificationBar';

// In your component
<NotificationBar />
```

**Integrated in:**
- Dashboard top navigation bar (all roles)

---

## Notification Flow Examples

### Example 1: Teacher Marks Attendance
```
1. Teacher marks student as "Present" in Mathematics
2. System creates notification:
   - Title: "📅 Attendance Marked"
   - Message: "Your attendance for Mathematics has been marked as PRESENT by Mr. Smith"
   - Recipient: Specific student (STU001)
3. Student sees notification in their notification bar
4. Student clicks to mark as read
```

### Example 2: Admin Adds Fee
```
1. Admin adds Rs.5000 tuition fee for student
2. System creates notification:
   - Title: "💰 New Fee Added"
   - Message: "A new fee of Rs.5000 has been added for Tuition Fee (Tuition)"
   - Recipient: Specific student (STU001)
3. Student receives notification immediately
4. Student can view fee details in Fees section
```

### Example 3: Teacher Creates Assignment
```
1. Teacher creates "Data Structures Project" assignment
2. System creates notification:
   - Title: "📚 New Assignment"
   - Message: "New assignment 'Data Structures Project' for Computer Science. Due: March 15, 2024"
   - Recipient: All students (role-based)
3. All students receive the notification
4. Students can click to view assignment details
```

### Example 4: Teacher Requests New Student
```
1. Teacher submits request to add new student
2. System creates notification:
   - Title: "👨‍🎓 New Student Request"
   - Message: "Mr. Brown has requested to add student: Jane Smith (Computer Science)"
   - Recipient: Admin role
3. Admin receives notification
4. Admin reviews and approves/rejects
5. Teacher receives status notification
```

---

## Role-Based Notification Access

### Admin
- Receives: Student requests from teachers
- Sends: Fee notifications, enrollment notifications, payment confirmations

### Principal
- Receives: System-wide notices, important announcements
- Sends: Notices to all roles

### Teacher
- Receives: Request status updates, notices
- Sends: Attendance notifications, marks notifications, assignment notifications

### Student
- Receives: Attendance, marks, fees, assignments, notices, enrollment, payment notifications
- Sends: None (read-only)

---

## Privacy & Security

### Role-Based Filtering
- Notifications are filtered by `recipient_role` OR `recipient_id`
- Users only see notifications meant for their role or specifically for them
- No cross-role notification leakage

### Example Scenarios:
1. **Teacher-Admin Communication:**
   - Teacher creates student request → Only admin sees it
   - Admin approves/rejects → Only that teacher sees status

2. **Student-Specific:**
   - Admin adds fee for STU001 → Only STU001 sees it
   - Teacher marks attendance for STU002 → Only STU002 sees it

3. **Broadcast Notices:**
   - Admin posts urgent notice → All roles see it
   - Teacher posts assignment → Only students see it

---

## UI/UX Features

### Visual Indicators
- 🔴 Red badge with count for unread notifications
- 💙 Blue background for unread items
- 🔵 Blue dot indicator on unread notifications
- ⏰ Time ago display (Just now, 5m ago, 2h ago, etc.)

### Interactions
- Click bell icon to open/close dropdown
- Click outside to close dropdown
- Click "Mark read" to mark individual notification
- Click "Mark all read" to clear all unread
- Click "Delete" to remove notification
- Auto-refresh every 30 seconds

### Animations
- Pulse animation on unread badge
- Smooth dropdown transitions
- Hover effects on notification items
- Loading states for actions

---

## Setup Instructions

### 1. Initialize Database
```bash
cd backend
node init-notifications.js
```

### 2. Start Backend Server
```bash
node server.js
```
The notifications API will be available at `/api/notifications`

### 3. Frontend Integration
The NotificationBar component is already integrated in the Dashboard component. No additional setup needed.

---

## Testing Notifications

### Test Attendance Notification
1. Login as teacher
2. Go to Attendance page
3. Mark attendance for a student
4. Login as that student
5. Check notification bar - should see attendance notification

### Test Marks Notification
1. Login as teacher
2. Go to Marks page
3. Add marks for a student
4. Login as that student
5. Check notification bar - should see marks notification

### Test Fee Notification
1. Login as admin
2. Go to Fees page
3. Add fee for a student
4. Login as that student
5. Check notification bar - should see fee notification

### Test Assignment Notification
1. Login as teacher
2. Go to Assignments page
3. Create new assignment
4. Login as any student
5. Check notification bar - should see assignment notification

### Test Notice Notification
1. Login as admin or teacher
2. Go to Notices page
3. Post a new notice
4. Login as any role
5. Check notification bar - should see notice notification

---

## Troubleshooting

### Notifications Not Appearing
1. Check if notifications table exists: `SELECT * FROM notifications;`
2. Verify backend server is running on port 3001
3. Check browser console for API errors
4. Ensure user is logged in with valid session

### Unread Count Not Updating
1. Wait for 30-second auto-refresh
2. Manually refresh the page
3. Check if `is_read` field is being updated in database

### Notifications Not Sending
1. Check backend console for notification errors
2. Verify notification helper functions are imported
3. Ensure database connection is active
4. Check if notification triggers are properly placed in routes

---

## Future Enhancements

### Planned Features
1. **Real-time WebSocket Updates** - Instant notifications without polling
2. **Email Notifications** - Send important notifications via email
3. **SMS Notifications** - Critical alerts via SMS
4. **Push Notifications** - Browser push notifications
5. **Notification Preferences** - Users can customize notification types
6. **Notification History** - Archive of all past notifications
7. **Notification Categories** - Filter by type/category
8. **Sound Alerts** - Audio notification for new items
9. **Desktop Notifications** - System-level notifications
10. **Notification Templates** - Customizable notification messages

---

## Code Examples

### Creating Custom Notification
```javascript
const { createNotification } = require('../utils/notificationHelper');

// Send custom notification
await createNotification({
  title: '🎉 Custom Event',
  message: 'This is a custom notification message',
  type: 'custom',
  recipient_role: 'student',  // or null for specific user
  recipient_id: null,          // or specific user ID
  sender_id: 'ADMIN001',
  sender_name: 'System Admin',
  related_entity: 'event',
  related_id: 'EVENT123'
});
```

### Querying Notifications
```javascript
// Get all unread notifications for a user
db.all(
  `SELECT * FROM notifications 
   WHERE (recipient_role = ? OR recipient_id = ?) 
   AND is_read = 0 
   ORDER BY created_at DESC`,
  [userRole, userId],
  (err, rows) => {
    console.log('Unread notifications:', rows);
  }
);
```

---

## Performance Considerations

### Optimization Tips
1. **Polling Interval:** 30 seconds is optimal (not too frequent, not too slow)
2. **Limit Results:** Fetch only last 50 notifications
3. **Index Database:** Add indexes on `recipient_role`, `recipient_id`, `is_read`
4. **Cleanup Old Notifications:** Periodically delete notifications older than 30 days
5. **Batch Operations:** Use transactions for bulk notification creation

### Database Indexes (Recommended)
```sql
CREATE INDEX idx_notifications_recipient ON notifications(recipient_role, recipient_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

---

## Summary

The notification system provides:
- ✅ Real-time updates for all major actions
- ✅ Role-based notification delivery
- ✅ Privacy and security through proper filtering
- ✅ Clean, intuitive UI with animations
- ✅ Comprehensive notification types
- ✅ Easy integration with existing features
- ✅ Scalable architecture for future enhancements

**All 4 roles (Admin, Principal, Teacher, Student) now have a fully functional notification system integrated throughout the application!**
