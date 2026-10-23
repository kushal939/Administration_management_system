const db = require('./database');
const {
  notifyAttendanceMarked,
  notifyMarksAdded,
  notifyFeesAdded,
  notifyAssignmentCreated,
  notifyNoticePosted,
  notifyStudentRequestCreated,
  notifyStudentRequestStatus,
  notifyStudentEnrolled,
  notifyPaymentReceived
} = require('./utils/notificationHelper');

console.log('🔔 Testing Notification System...\n');

async function testNotifications() {
  try {
    // Test 1: Attendance Notification
    console.log('1️⃣ Testing Attendance Notification...');
    await notifyAttendanceMarked('STU001', 'John Doe', 'Mathematics', 'present', 'Mr. Smith');
    console.log('✅ Attendance notification sent\n');

    // Test 2: Marks Notification
    console.log('2️⃣ Testing Marks Notification...');
    await notifyMarksAdded('STU001', 'John Doe', 'Physics', 85, 100, 'Dr. Johnson');
    console.log('✅ Marks notification sent\n');

    // Test 3: Fees Notification
    console.log('3️⃣ Testing Fees Notification...');
    await notifyFeesAdded('STU001', 'John Doe', 5000, 'Tuition Fee - Semester 1', 'Tuition');
    console.log('✅ Fees notification sent\n');

    // Test 4: Assignment Notification (to all students)
    console.log('4️⃣ Testing Assignment Notification...');
    await notifyAssignmentCreated('Computer Science', 'Data Structures Project', '2024-03-15', 'Prof. Williams');
    console.log('✅ Assignment notification sent\n');

    // Test 5: Notice Notification (to all roles)
    console.log('5️⃣ Testing Notice Notification...');
    await notifyNoticePosted('Holiday Announcement', 'announcement', 'high', 'Admin');
    console.log('✅ Notice notification sent\n');

    // Test 6: Student Request Notification (to admin)
    console.log('6️⃣ Testing Student Request Notification...');
    await notifyStudentRequestCreated('Jane Smith', 'Computer Science', 'Mr. Brown');
    console.log('✅ Student request notification sent\n');

    // Test 7: Request Status Notification (to teacher)
    console.log('7️⃣ Testing Request Status Notification...');
    await notifyStudentRequestStatus('Jane Smith', 'approved', 'teacher@school.com', 'Admin');
    console.log('✅ Request status notification sent\n');

    // Test 8: Enrollment Notification
    console.log('8️⃣ Testing Enrollment Notification...');
    await notifyStudentEnrolled('STU001', 'John Doe', 'Advanced Mathematics', 'Mathematics');
    console.log('✅ Enrollment notification sent\n');

    // Test 9: Payment Notification
    console.log('9️⃣ Testing Payment Notification...');
    await notifyPaymentReceived('STU001', 5000, 'Tuition Fee - Semester 1');
    console.log('✅ Payment notification sent\n');

    // Display all notifications
    console.log('📋 All Notifications Created:');
    db.all('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10', [], (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err);
      } else {
        console.table(rows);
        console.log(`\n✅ Total notifications: ${rows.length}`);
        console.log('\n🎉 All notification tests completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Start the backend server: node server.js');
        console.log('2. Start the frontend: npm run dev (in frontend folder)');
        console.log('3. Login as student@school.com to see notifications');
        console.log('4. Check the notification bell icon in the top right corner\n');
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
    process.exit(1);
  }
}

testNotifications();
