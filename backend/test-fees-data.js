const db = require('./database');

async function addTestFeesData() {
  console.log('🔄 Adding test fees data for existing students...\n');

  try {
    // Get existing students
    const students = await new Promise((resolve, reject) => {
      db.all('SELECT studentId, name FROM students LIMIT 10', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (students.length === 0) {
      console.log('❌ No students found in database. Please add students first.');
      process.exit(1);
    }

    console.log(`✅ Found ${students.length} students\n`);

    // Fee categories and descriptions
    const feeTypes = [
      { category: 'tuition', description: 'Semester Tuition Fee', amount: 25000 },
      { category: 'library', description: 'Library Annual Fee', amount: 2000 },
      { category: 'lab', description: 'Laboratory Fee', amount: 5000 },
      { category: 'exam', description: 'Examination Fee', amount: 1500 },
      { category: 'sports', description: 'Sports & Activities Fee', amount: 3000 },
      { category: 'hostel', description: 'Hostel Fee (Monthly)', amount: 8000 },
      { category: 'bus', description: 'Bus Transportation Fee', amount: 4000 },
      { category: 'general', description: 'Miscellaneous Fee', amount: 1000 }
    ];

    let feesCreated = 0;
    let paymentsRecorded = 0;

    // Add fees for each student
    for (const student of students) {
      console.log(`📝 Adding fees for ${student.name} (${student.studentId})...`);

      // Add 3-5 random fees per student
      const numFees = Math.floor(Math.random() * 3) + 3;
      const selectedFees = [];
      
      // Randomly select fee types
      const shuffled = [...feeTypes].sort(() => 0.5 - Math.random());
      for (let i = 0; i < numFees; i++) {
        selectedFees.push(shuffled[i]);
      }

      for (const feeType of selectedFees) {
        // Random due date (some past, some future)
        const daysOffset = Math.floor(Math.random() * 120) - 60; // -60 to +60 days
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysOffset);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // Random paid status (70% unpaid, 30% paid)
        const isPaid = Math.random() < 0.3 ? 1 : 0;

        // Insert fee
        const feeId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO fees (studentId, amount, description, category, paid, due_date) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [student.studentId, feeType.amount, feeType.description, feeType.category, isPaid, dueDateStr],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        feesCreated++;

        // If paid, add payment history
        if (isPaid) {
          const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer', 'cheque'];
          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
          
          const paymentDate = new Date(dueDate);
          paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 10)); // Paid before due date
          const paymentDateStr = paymentDate.toISOString();

          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO payment_history 
               (fee_id, student_id, amount, payment_method, transaction_id, payment_date, notes) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [feeId, student.studentId, feeType.amount, paymentMethod, transactionId, paymentDateStr, 'Test payment'],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          paymentsRecorded++;
        }
      }

      console.log(`   ✓ Added ${numFees} fees for ${student.name}`);
    }

    console.log('\n📊 Summary:');
    console.log(`   • Total fees created: ${feesCreated}`);
    console.log(`   • Payments recorded: ${paymentsRecorded}`);
    console.log(`   • Unpaid fees: ${feesCreated - paymentsRecorded}`);

    // Create some fee templates
    console.log('\n🎨 Creating fee templates...');
    
    const templates = [
      { name: 'Standard Tuition', amount: 25000, description: 'Regular semester tuition fee', category: 'tuition', due_days: 30 },
      { name: 'Lab Fee Package', amount: 5000, description: 'Complete laboratory access fee', category: 'lab', due_days: 15 },
      { name: 'Annual Library', amount: 2000, description: 'Full year library membership', category: 'library', due_days: 45 },
      { name: 'Hostel Monthly', amount: 8000, description: 'Monthly hostel accommodation', category: 'hostel', due_days: 7 }
    ];

    for (const template of templates) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO fee_templates (name, amount, description, category, default_due_days) 
           VALUES (?, ?, ?, ?, ?)`,
          [template.name, template.amount, template.description, template.category, template.due_days],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      console.log(`   ✓ Created template: ${template.name}`);
    }

    console.log('\n✅ Test fees data added successfully!');
    console.log('\n💡 You can now:');
    console.log('   • View fees in the Fees Management page');
    console.log('   • See analytics and payment history');
    console.log('   • Use templates to create bulk fees');
    console.log('   • Record payments for unpaid fees\n');

  } catch (error) {
    console.error('❌ Error adding test fees data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
addTestFeesData();
