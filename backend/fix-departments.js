const db = require('./database');

/**
 * Fix department-course mismatch by adding courses for existing departments
 */
async function fixDepartments() {
  console.log('=== Fixing Department-Course Mismatch ===\n');

  // Add courses for existing departments
  const coursesToAdd = [
    // BCom courses
    { name: 'Financial Accounting', code: 'BCOM101', department: 'BCom', credits: 4 },
    { name: 'Business Economics', code: 'BCOM102', department: 'BCom', credits: 3 },
    { name: 'Business Law', code: 'BCOM103', department: 'BCom', credits: 3 },
    
    // B.Tech.Ed.IT courses (already has DSA)
    { name: 'Programming Fundamentals', code: 'BTECH101', department: 'B.Tech.Ed.IT', credits: 4 },
    { name: 'Database Management', code: 'BTECH102', department: 'B.Tech.Ed.IT', credits: 4 },
    { name: 'Web Development', code: 'BTECH103', department: 'B.Tech.Ed.IT', credits: 3 },
    { name: 'Software Engineering', code: 'BTECH104', department: 'B.Tech.Ed.IT', credits: 3 },
    
    // BPH courses
    { name: 'Pharmaceutical Chemistry', code: 'BPH101', department: 'BPH', credits: 4 },
    { name: 'Pharmacology', code: 'BPH102', department: 'BPH', credits: 4 },
    { name: 'Pharmaceutics', code: 'BPH103', department: 'BPH', credits: 3 },
    
    // BIT courses
    { name: 'Information Systems', code: 'BIT101', department: 'BIT', credits: 4 },
    { name: 'Network Security', code: 'BIT102', department: 'BIT', credits: 3 },
    { name: 'Cloud Computing', code: 'BIT103', department: 'BIT', credits: 3 },
    
    // BBS courses
    { name: 'Business Management', code: 'BBS101', department: 'BBS', credits: 4 },
    { name: 'Marketing Management', code: 'BBS102', department: 'BBS', credits: 3 },
    { name: 'Human Resource Management', code: 'BBS103', department: 'BBS', credits: 3 }
  ];

  console.log(`Adding ${coursesToAdd.length} courses...`);

  const stmt = db.prepare('INSERT OR IGNORE INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)');
  
  coursesToAdd.forEach(course => {
    stmt.run(course.name, course.code, course.department, course.credits, (err) => {
      if (err) {
        console.error(`Error adding ${course.name}:`, err);
      } else {
        console.log(`✓ Added: ${course.name} (${course.code}) - ${course.department}`);
      }
    });
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('Error finalizing:', err);
      process.exit(1);
    }

    // Verify courses were added
    setTimeout(() => {
      db.all('SELECT department, COUNT(*) as count FROM courses GROUP BY department', [], (err, results) => {
        if (err) {
          console.error('Error counting courses:', err);
          process.exit(1);
        }

        console.log('\n=== Courses by Department ===');
        results.forEach(r => {
          console.log(`${r.department}: ${r.count} courses`);
        });

        console.log('\n✅ Department-course mismatch fixed!');
        console.log('\nNow you can:');
        console.log('1. Add a student and select a department (BCom, B.Tech.Ed.IT, BPH, BIT, or BBS)');
        console.log('2. Student will be automatically enrolled in all courses of that department');
        
        process.exit(0);
      });
    }, 1000);
  });
}

fixDepartments();
