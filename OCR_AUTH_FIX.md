# OCR Authentication Fix

## Problem
The marksheet and student document OCR features were failing with "fail to process marksheet" error because authentication data was not being sent with the requests.

## Root Cause
The system uses a simplified authentication where:
- User data is stored in `localStorage` after login
- Backend expects user data in `req.headers['x-user-data']` or `req.body.user`
- OCR endpoints were only sending FormData without authentication headers

## Solution
Added authentication headers to both OCR upload functions:

### Student Document Upload (Admin)
```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');

const response = await fetch('/api/admin/ocr/student-document', {
  method: 'POST',
  headers: {
    'x-user-data': JSON.stringify(user)
  },
  body: formData
});
```

### Marksheet Upload (Teacher)
```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');

const response = await fetch('/api/teacher/ocr/marksheet', {
  method: 'POST',
  headers: {
    'x-user-data': JSON.stringify(user)
  },
  body: formData
});
```

## How It Works
1. User logs in → user data saved to localStorage
2. OCR upload → retrieves user from localStorage
3. Sends user data as `x-user-data` header
4. Backend auth middleware validates user and role
5. OCR processing proceeds if authorized

## Testing
1. Login as teacher: `teacher@school.com / teacher123`
2. Go to OCR page
3. Switch to "Marksheet Upload" tab
4. Upload a marksheet image
5. Should now process successfully

## Files Modified
- `frontend/src/pages/OCR.jsx` - Added authentication headers to both upload functions
