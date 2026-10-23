const db = require('./database');

console.log('🌱 Starting comprehensive data seeding...\n');

// Helper function to run SQL with promise
const runSQL = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getSQL = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allSQL = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Random data generators
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Data arrays
const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Ananya', 'Diya', 'Isha', 'Priya', 'Riya', 
                    'Rohan', 'Karan', 'Rahul', 'Amit', 'Neha', 'Pooja', 'Sneha', 'Kavya', 'Shreya', 'Tanvi'];
const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Joshi', 'Mehta', 'Nair'];

const departments = [
  { name: 'Computer Science', code: 'CS' },
  { name: 'Electronics', code: 'EC' },
  { name: 'Mechanical Engineering', code: 'ME' },
  { name: 'Civil Engineering', code: 'CE' },
  { name: 'Business Administration', code: 'BA' }
];

const courses = [
  // Computer Science
  { name: 'Data Structures', code: 'CS101', department: 'Computer Science', credits: 4 },
  { name: 'Database Management', code: 'CS201', department: 'Computer Science', credits: 4 },
  { name: 'Web Development', code: 'CS301', department: 'Computer Science', credits: 3 },
  
  // Electronics
  { name: 'Digital Electronics', code: 'EC101', department: 'Electronics', credits: 4 },
  { name: 'Microprocessors', code: 'EC201', department: 'Electronics', credits: 4 },
  { name: 'VLSI Design', code: 'EC301', department: 'Electronics', credits: 3 },
  
  // Mechanical
  { name: 'Thermodynamics', code: 'ME101', department: 'Mechanical Engineering', credits: 4 },
  { name: 'Fluid Mechanics', code: 'ME201', department: 'Mechanical Engineering', credits: 4 },
  { name: 'Machine Design', code: 'ME301', department: 'Mechanical Engineering', credits: 3 },
  
  // Civil
  { name: 'Structural Analysis', code: 'CE101', department: 'Civil Engineering', credits: 4 },
  { name: 'Concrete Technology', code: 'CE201', department: 'Civil Engineering', credits: 4 },
  { name: 'Highway Engineering', code: 'CE301', department: 'Civil Engineering', credits: 3 },
  
  // Business
  { name: 'Marketing Management', code: 'BA101', department: 'Business Administration', credits: 3 },
  { name: 'Financial Accounting', code: 'BA201', department: 'Business Administration', credits: 4 },
  { name: 'Human Resource Management', code: 'BA301', department: 'Business Administration', credits: 3 }
];

const seedData = async () => {
  try {
    console.log('📚 Step 1: Creating Departments...');
    const departmentIds = {};
    for (const dept of departments) {
      const result = await runSQL(
        'INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)',
        [dept.name, dept.code]
      );
      // Get the ID whether it was just inserted or already exists
      const existing = await getSQL('SELECT id FROM departments WHERE name = ?', [dept.name]);
      departmentIds[dept.name] = existing.id;
      console.log(`   ✓ Created/Found: ${dept.name} (${dept.code})`);
    }

    console.log('\n🎓 Step 2: Creating Courses...');
    const courseIds = {};
    for (const course of courses) {
      const result = await runSQL(
        'INSERT OR IGNORE INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)',
        [course.name, course.code, course.department, course.credits]
      );
      const existing = await getSQL('SELECT id FROM courses WHERE code = ?', [course.code]);
      courseIds[course.code] = existing.id;
      console.log(`   ✓ Created/Found: ${course.name} (${course.code})`);
    }

    console.log('\n📅 Step 3: Creating Batches...');
    const batches = [];
    const currentYear = new Date().getFullYear();
    for (const dept of departments) {
      // Create 2 batches per department
      for (let i = 0; i < 2; i++) {
        const year = currentYear - i;
        const result = await runSQL(
          'INSERT INTO batches (batch_name, department, start_year, end_year, status) VALUES (?, ?, ?, ?, ?)',
          [`${dept.code} ${year}`, dept.name, year, year + 4, 'active']
        );
        batches.push({
          id: result.lastID,
          name: `${dept.code} ${year}`,
          department: dept.name,
          year: year
        });
        console.log(`   ✓ Created: ${dept.code} ${year}`);
      }
    }

    console.log('\n👨‍🎓 Step 4: Creating 20 Students...');
    const students = [];
    
    // First, check existing students to avoid duplicates
    const existingStudents = await allSQL('SELECT studentId FROM students');
    const existingIds = new Set(existingStudents.map(s => s.studentId));
    
    let studentCounter = 1001;
    let created = 0;
    
    while (created < 20) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const name = `${firstName} ${lastName}`;
      const dept = getRandomElement(departments);
      const batch = batches.find(b => b.department === dept.name);
      const studentId = `${dept.code}${currentYear}${String(studentCounter++).padStart(3, '0')}`;
      
      // Skip if this ID already exists
      if (existingIds.has(studentId)) {
        continue;
      }
      
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${created}@student.edu`;
      const year = getRandomInt(1, 4);
      
      // Get a random course from the department
      const deptCourses = courses.filter(c => c.department === dept.name);
      const course = deptCourses.length > 0 ? deptCourses[0].name : 'General';

      const result = await runSQL(
        `INSERT INTO students (studentId, name, email, course, year, department, batch_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId, 
          name, 
          email, 
          course,
          year, 
          dept.name, 
          batch ? batch.id : null
        ]
      );

      students.push({
        id: result.lastID,
        studentId: studentId,
        name: name,
        email: email,
        department: dept.name,
        year: year
      });

      console.log(`   ✓ Created: ${name} (${studentId}) - ${dept.name}`);
      created++;
    }

    console.log('\n📝 Step 5: Enrolling Students in Courses...');
    let enrollmentCount = 0;
    for (const student of students) {
      // Get courses for student's department
      const deptCourses = courses.filter(c => c.department === student.department);
      
      // Enroll in 3-5 random courses (or all if less than 3)
      const numCourses = getRandomInt(3, Math.min(5, deptCourses.length));
      const selectedCourses = [];
      
      while (selectedCourses.length < numCourses && selectedCourses.length < deptCourses.length) {
        const course = getRandomElement(deptCourses);
        if (!selectedCourses.includes(course.code)) {
          selectedCourses.push(course.code);
          await runSQL(
            'INSERT OR IGNORE INTO enrollments (student_id, course_id, department_id) VALUES (?, ?, ?)',
            [student.id, courseIds[course.code], departmentIds[student.department]]
          );
          enrollmentCount++;
        }
      }
    }
    console.log(`   ✓ Created ${enrollmentCount} enrollments`);

    console.log('\n📊 Step 6: Adding Marks for Students...');
    let marksCount = 0;
    for (const student of students) {
      // Get enrolled courses
      const enrollments = await allSQL(
        'SELECT course_id FROM enrollments WHERE student_id = ?',
        [student.id]
      );

      for (const enrollment of enrollments) {
        const course = await getSQL('SELECT name FROM courses WHERE id = ?', [enrollment.course_id]);
        
        // Add a random mark for the course (out of 100)
        const marks = getRandomInt(40, 100);
        
        await runSQL(
          `INSERT INTO marks (studentId, course, marks) 
           VALUES (?, ?, ?)`,
          [
            student.studentId,
            course.name,
            marks
          ]
        );
        marksCount++;
      }
    }
    console.log(`   ✓ Created ${marksCount} mark entries`);

    console.log('\n📅 Step 7: Adding Attendance Records...');
    let attendanceCount = 0;
    const statuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date();
    
    for (const student of students) {
      const enrollments = await allSQL(
        `SELECT c.name, c.id FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE e.student_id = ?`,
        [student.id]
      );

      for (const enrollment of enrollments) {
        // Add 20-30 attendance records per course
        const numRecords = getRandomInt(20, 30);
        for (let i = 0; i < numRecords; i++) {
          const date = getRandomDate(startDate, endDate);
          const status = getRandomElement(statuses);
          
          await runSQL(
            `INSERT INTO attendance (studentId, course, date, status) 
             VALUES (?, ?, ?, ?)`,
            [
              student.studentId,
              enrollment.name,
              date.toISOString().split('T')[0],
              status
            ]
          );
          attendanceCount++;
        }
      }
    }
    console.log(`   ✓ Created ${attendanceCount} attendance records`);

    console.log('\n📢 Step 8: Adding Notices...');
    const notices = [
      { title: 'Mid-Term Exam Schedule', content: 'Mid-term examinations will be conducted from March 15-25, 2024.', type: 'exam', priority: 'high' },
      { title: 'Holiday Notice', content: 'College will remain closed on March 8th for Holi festival.', type: 'holiday', priority: 'normal' },
      { title: 'Sports Day Event', content: 'Annual sports day will be held on March 30th. All students are encouraged to participate.', type: 'event', priority: 'normal' },
      { title: 'Library Timing Change', content: 'Library will now be open from 8 AM to 8 PM on weekdays.', type: 'general', priority: 'normal' },
      { title: 'Workshop on AI/ML', content: 'A workshop on Artificial Intelligence and Machine Learning will be conducted on April 5th.', type: 'event', priority: 'high' }
    ];

    for (const notice of notices) {
      await runSQL(
        `INSERT INTO notices (title, content, type, priority, author) 
         VALUES (?, ?, ?, ?, ?)`,
        [notice.title, notice.content, notice.type, notice.priority, 'Admin']
      );
      console.log(`   ✓ Created: ${notice.title}`);
    }

    console.log('\n📝 Step 9: Adding Assignments...');
    const assignments = [
      { title: 'Data Structures Project', course: 'Data Structures', description: 'Implement a Binary Search Tree with all operations', totalMarks: 100, dueDate: '2024-04-15' },
      { title: 'Database Design Assignment', course: 'Database Management', description: 'Design a database schema for an e-commerce system', totalMarks: 50, dueDate: '2024-04-20' },
      { title: 'Web Development Project', course: 'Web Development', description: 'Create a responsive website using HTML, CSS, and JavaScript', totalMarks: 100, dueDate: '2024-04-25' },
      { title: 'Digital Circuit Design', course: 'Digital Electronics', description: 'Design a 4-bit ALU using logic gates', totalMarks: 75, dueDate: '2024-04-18' },
      { title: 'Marketing Strategy Report', course: 'Marketing Management', description: 'Prepare a marketing strategy for a new product launch', totalMarks: 50, dueDate: '2024-04-22' }
    ];

    // Get teacher user ID (assuming admin can create assignments)
    const adminUser = await getSQL('SELECT id FROM users WHERE email = ?', ['admin@school.com']);
    
    for (const assignment of assignments) {
      await runSQL(
        `INSERT INTO assignments (title, description, course, teacher_id, due_date, total_marks) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignment.title, assignment.description, assignment.course, adminUser ? adminUser.id : 1, assignment.dueDate, assignment.totalMarks]
      );
      console.log(`   ✓ Created: ${assignment.title}`);
    }

    console.log('\n💰 Step 10: Adding Fee Records...');
    let feeCount = 0;
    const feeCategories = ['tuition', 'library', 'lab', 'exam', 'sports'];
    const feeAmounts = { tuition: 50000, library: 2000, lab: 5000, exam: 3000, sports: 1000 };
    
    for (const student of students) {
      for (const category of feeCategories) {
        const isPaid = Math.random() > 0.3; // 70% paid
        const dueDate = new Date(2024, getRandomInt(0, 11), getRandomInt(1, 28));
        
        await runSQL(
          `INSERT INTO fees (studentId, amount, description, category, due_date, paid) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            student.studentId,
            feeAmounts[category],
            `${category.charAt(0).toUpperCase() + category.slice(1)} Fee - Semester 1`,
            category,
            dueDate.toISOString().split('T')[0],
            isPaid ? 1 : 0
          ]
        );
        feeCount++;
      }
    }
    console.log(`   ✓ Created ${feeCount} fee records`);

    console.log('\n✅ Data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Departments: ${departments.length}`);
    console.log(`   • Courses: ${courses.length}`);
    console.log(`   • Batches: ${batches.length}`);
    console.log(`   • Students: ${students.length}`);
    console.log(`   • Enrollments: ${enrollmentCount}`);
    console.log(`   • Marks: ${marksCount}`);
    console.log(`   • Attendance: ${attendanceCount}`);
    console.log(`   • Notices: ${notices.length}`);
    console.log(`   • Assignments: ${assignments.length}`);
    console.log(`   • Fees: ${feeCount}`);
    console.log('\n🎉 Database is now populated with test data!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
};

// Run the seeding
seedData()
  .then(() => {
    console.log('\n✨ All done! You can now use the application with test data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
