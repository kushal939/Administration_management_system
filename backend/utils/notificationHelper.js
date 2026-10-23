const db = require('../database');

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - Notification type (attendance, marks, fees, assignment, notice, etc.)
 * @param {string} data.recipient_role - Target role (admin, teacher, student, principal) or null for specific user
 * @param {string} data.recipient_id - Specific user ID/email or null for role-based
 * @param {string} data.sender_id - Sender user ID
 * @param {string} data.sender_name - Sender name
 * @param {string} data.related_entity - Related entity type (student, course, etc.)
 * @param {string} data.related_id - Related entity ID
 */
const createNotification = (data) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO notifications (title, message, type, recipient_role, recipient_id, sender_id, sender_name, related_entity, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.title,
      data.message,
      data.type,
      data.recipient_role || null,
      data.recipient_id || null,
      data.sender_id || null,
      data.sender_name || null,
      data.related_entity || null,
      data.related_id || null
    ];

    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error creating notification:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
};

/**
 * Send notification when attendance is marked
 */
const notifyAttendanceMarked = async (studentId, studentName, course, status, teacherName) => {
  try {
    await createNotification({
      title: '📅 Attendance Marked',
      message: `Your attendance for ${course} has been marked as ${status.toUpperCase()} by ${teacherName}`,
      type: 'attendance',
      recipient_id: studentId,
      sender_name: teacherName,
      related_entity: 'attendance',
      related_id: studentId
    });
  } catch (error) {
    console.error('Error sending attendance notification:', error);
  }
};

/**
 * Send notification when marks are added/updated
 */
const notifyMarksAdded = async (studentId, studentName, subject, marks, totalMarks, teacherName) => {
  try {
    await createNotification({
      title: '📝 Marks Updated',
      message: `Your marks for ${subject} have been updated: ${marks}/${totalMarks} by ${teacherName}`,
      type: 'marks',
      recipient_id: studentId,
      sender_name: teacherName,
      related_entity: 'marks',
      related_id: studentId
    });
  } catch (error) {
    console.error('Error sending marks notification:', error);
  }
};

/**
 * Send notification when fees are added
 */
const notifyFeesAdded = async (studentId, studentName, amount, description, category) => {
  try {
    await createNotification({
      title: '💰 New Fee Added',
      message: `A new fee of Rs.${amount} has been added for ${description} (${category})`,
      type: 'fees',
      recipient_id: studentId,
      sender_name: 'Admin',
      related_entity: 'fees',
      related_id: studentId
    });
  } catch (error) {
    console.error('Error sending fees notification:', error);
  }
};

/**
 * Send notification when assignment is created
 */
const notifyAssignmentCreated = async (course, title, dueDate, teacherName) => {
  try {
    // Notify all students (role-based)
    await createNotification({
      title: '📚 New Assignment',
      message: `New assignment "${title}" for ${course}. Due: ${new Date(dueDate).toLocaleDateString()}`,
      type: 'assignment',
      recipient_role: 'student',
      sender_name: teacherName,
      related_entity: 'assignment',
      related_id: course
    });
  } catch (error) {
    console.error('Error sending assignment notification:', error);
  }
};

/**
 * Send notification when notice is posted
 */
const notifyNoticePosted = async (title, type, priority, createdBy, targetRole = null) => {
  try {
    const emoji = type === 'urgent' ? '🔴' : type === 'announcement' ? '📢' : '📋';
    
    if (targetRole) {
      // Send to specific role
      await createNotification({
        title: `${emoji} New ${type.charAt(0).toUpperCase() + type.slice(1)} Notice`,
        message: `${title}`,
        type: 'notice',
        recipient_role: targetRole,
        sender_name: createdBy,
        related_entity: 'notice',
        related_id: title
      });
    } else {
      // Send to all roles
      const roles = ['admin', 'teacher', 'student', 'principal'];
      for (const role of roles) {
        await createNotification({
          title: `${emoji} New ${type.charAt(0).toUpperCase() + type.slice(1)} Notice`,
          message: `${title}`,
          type: 'notice',
          recipient_role: role,
          sender_name: createdBy,
          related_entity: 'notice',
          related_id: title
        });
      }
    }
  } catch (error) {
    console.error('Error sending notice notification:', error);
  }
};

/**
 * Send notification when student request is created (teacher to admin)
 */
const notifyStudentRequestCreated = async (studentName, department, teacherName) => {
  try {
    await createNotification({
      title: '👨‍🎓 New Student Request',
      message: `${teacherName} has requested to add student: ${studentName} (${department})`,
      type: 'student_request',
      recipient_role: 'admin',
      sender_name: teacherName,
      related_entity: 'student_request',
      related_id: studentName
    });
  } catch (error) {
    console.error('Error sending student request notification:', error);
  }
};

/**
 * Send notification when student request is approved/rejected (admin to teacher)
 */
const notifyStudentRequestStatus = async (studentName, status, teacherId, adminName, reason = null) => {
  try {
    const message = status === 'approved' 
      ? `Your request to add student ${studentName} has been APPROVED`
      : `Your request to add student ${studentName} has been REJECTED${reason ? ': ' + reason : ''}`;
    
    await createNotification({
      title: status === 'approved' ? '✅ Request Approved' : '❌ Request Rejected',
      message: message,
      type: 'student_request_status',
      recipient_id: teacherId,
      sender_name: adminName,
      related_entity: 'student_request',
      related_id: studentName
    });
  } catch (error) {
    console.error('Error sending request status notification:', error);
  }
};

/**
 * Send notification when student is enrolled in course
 */
const notifyStudentEnrolled = async (studentId, studentName, courseName, department) => {
  try {
    await createNotification({
      title: '🎓 Course Enrollment',
      message: `You have been enrolled in ${courseName} (${department})`,
      type: 'enrollment',
      recipient_id: studentId,
      sender_name: 'Admin',
      related_entity: 'enrollment',
      related_id: courseName
    });
  } catch (error) {
    console.error('Error sending enrollment notification:', error);
  }
};

/**
 * Send notification for payment received
 */
const notifyPaymentReceived = async (studentId, amount, feeDescription) => {
  try {
    await createNotification({
      title: '✅ Payment Received',
      message: `Payment of Rs.${amount} received for ${feeDescription}`,
      type: 'payment',
      recipient_id: studentId,
      sender_name: 'Admin',
      related_entity: 'payment',
      related_id: studentId
    });
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
};

module.exports = {
  createNotification,
  notifyAttendanceMarked,
  notifyMarksAdded,
  notifyFeesAdded,
  notifyAssignmentCreated,
  notifyNoticePosted,
  notifyStudentRequestCreated,
  notifyStudentRequestStatus,
  notifyStudentEnrolled,
  notifyPaymentReceived
};
