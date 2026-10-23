# User Delete Feature - Quick Start Guide 🚀

## What's New?

Admin can now delete any user (Student, Teacher, or Principal) from the User Management section with full cascading deletion of related records.

## How to Use

### Step 1: Access User Management
1. Login as Admin (admin@school.com / admin123)
2. Navigate to **Admin Panel**
3. Click on **User Management**

### Step 2: View All Users
1. Click on the **"All Users"** tab
2. You'll see a table with all users showing:
   - User ID / Student ID
   - Name
   - Email
   - Role (color-coded badge)
   - Department
   - Delete button

### Step 3: Search/Filter (Optional)
- **Search**: Type in the search box to find users by name, email, or ID
- **Filter by Role**: Select Student, Teacher, Principal, or Admin
- **Filter by Department**: Select a specific department

### Step 4: Delete a User
1. Find the user you want to delete
2. Click the red **"🗑️ Delete"** button
3. A confirmation modal will appear with:
   - User name
   - Warning message
   - List of what will be deleted
4. Click **"Delete"** to confirm or **"Cancel"** to abort
5. Success message appears: "User deleted successfully"

## What Gets Deleted?

### For Students:
- ✅ Attendance records
- ✅ Marks/grades
- ✅ Fee records
- ✅ Course enrollments
- ✅ Student profile
- ✅ User account

### For Teachers:
- ✅ Course assignments
- ✅ Created assignments
- ✅ User account

### For Principals:
- ✅ User account

## Safety Features

### 🛡️ Protection
- ❌ Cannot delete your own account (button is disabled)
- ⚠️ Confirmation required before deletion
- 🔒 Admin-only access
- 💾 All related records automatically cleaned up

### ⚡ Real-time Updates
- User list refreshes after deletion
- Statistics update automatically
- Toast notification confirms success

## Visual Guide

### User Table
```
┌─────────────┬──────────────┬─────────────────────┬──────────┬──────────────┬─────────┐
│ User ID     │ Name         │ Email               │ Role     │ Department   │ Actions │
├─────────────┼──────────────┼─────────────────────┼──────────┼──────────────┼─────────┤
│ CS20261001  │ John Doe     │ john@student.edu    │ Student  │ Comp Science │ Delete  │
│ 2           │ Jane Smith   │ jane@school.com     │ Teacher  │ N/A          │ Delete  │
│ 3           │ Bob Johnson  │ bob@school.com      │ Principal│ N/A          │ Delete  │
│ 1           │ Admin User   │ admin@school.com    │ Admin    │ N/A          │ ⚠️ Own  │
└─────────────┴──────────────┴─────────────────────┴──────────┴──────────────┴─────────┘
```

### Role Badges
- 🔵 **Student** - Blue badge
- 🟢 **Teacher** - Green badge
- 🟣 **Principal** - Purple badge
- 🔴 **Admin** - Red badge

## Testing the Feature

### Test Scenario 1: Delete a Student
1. Go to All Users tab
2. Find a student (e.g., "Shreya Gupta")
3. Click Delete
4. Confirm deletion
5. ✅ Student and all records deleted

### Test Scenario 2: Try to Delete Own Account
1. Find your own account (admin@school.com)
2. Notice the Delete button is disabled
3. Hover to see tooltip: "Cannot delete your own account"
4. ✅ Protection working

### Test Scenario 3: Search and Delete
1. Type "teacher" in search box
2. Filter by Role: "Teacher"
3. Select a teacher
4. Delete the teacher
5. ✅ Teacher and assignments deleted

## API Endpoints

### Get All Users
```
GET /api/admin/users
Headers: x-user-role: admin
```

### Delete User
```
DELETE /api/admin/users/:id
Headers: x-user-role: admin
Body: { "currentUserEmail": "admin@school.com" }
```

## Troubleshooting

### Issue: Delete button is disabled
**Solution**: You're trying to delete your own account. This is not allowed for security.

### Issue: "Access denied" error
**Solution**: Make sure you're logged in as Admin and the x-user-role header is set.

### Issue: User not found
**Solution**: The user may have already been deleted. Refresh the page.

### Issue: Network error
**Solution**: Check if the backend server is running on port 3001.

## Statistics Dashboard

The header shows real-time counts:
- 👤 **Total Users**: All users in the system
- 🎓 **Students**: Number of student accounts
- 👨‍🏫 **Teachers**: Number of teacher accounts
- ⏳ **Pending**: Pending approval requests

## Best Practices

1. ✅ Always verify the user before deleting
2. ✅ Use search/filter to find the correct user
3. ✅ Read the confirmation message carefully
4. ✅ Understand that deletion is permanent
5. ❌ Don't delete users during active sessions
6. ❌ Don't delete users with important historical data without backup

## Current Database Stats

Run this to check current users:
```bash
cd backend
node test-user-delete.js
```

## Files Involved

### Backend:
- `backend/routes/admin.js` - API endpoints

### Frontend:
- `frontend/src/pages/UserManagement_Enhanced.jsx` - UI implementation
- `frontend/src/components/ConfirmModal.jsx` - Confirmation dialog
- `frontend/src/components/Toast.jsx` - Success notification

## Next Steps

After testing the delete feature:
1. ✅ Verify users are deleted from database
2. ✅ Check related records are cleaned up
3. ✅ Test with different user roles
4. ✅ Ensure statistics update correctly
5. ✅ Test search and filter functionality

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify database integrity
4. Restart both servers if needed

---

**⚠️ Important**: Deletion is permanent and cannot be undone. Always double-check before confirming deletion.
