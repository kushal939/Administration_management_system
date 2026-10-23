const tutorialContent = {
  admin: {
    title: 'Welcome, Admin',
    subtitle: 'Quick tour to manage the system',
    steps: [
      'Use the sidebar to navigate to Students, Courses, Attendance and more.',
      'To assign teachers to courses go to Assign Teachers and create mappings.',
      'Use Reports and Analytics to get aggregated insights about students and courses.',
      'You can manage notices and fees from the corresponding sections.'
    ]
  },
  teacher: {
    title: 'Welcome, Teacher',
    subtitle: 'Quick tour for instructors',
    steps: [
      'View your assigned students on the Students page filtered to your classes.',
      'Record attendance and marks for your classes in Attendance and Marks.',
      'Use Analytics to spot at-risk students and performance summaries.',
      'Post class notices in Notices for your students.'
    ]
  },
  student: {
    title: 'Welcome, Student',
    subtitle: 'Quick tour for students',
    steps: [
      'View your attendance and marks in the Attendance and Marks sections.',
      'Check Notices regularly for announcements from teachers and admins.',
      'Use Reports to download your performance summaries if available.'
    ]
  }
};

export default tutorialContent;
