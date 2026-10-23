const db = require('./database');

async function verifyFeesData() {
  console.log('🔍 Verifying fees data in database...\n');

  try {
    // Count total fees
    const totalFees = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM fees', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`✅ Total fees in database: ${totalFees}\n`);

    // Get fees summary
    const summary = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_records,
          SUM(amount) as total_amount,
          SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as unpaid_amount,
          COUNT(CASE WHEN paid = 1 THEN 1 END) as paid_count,
          COUNT(CASE WHEN paid = 0 THEN 1 END) as unpaid_count
        FROM fees
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('📊 Fees Summary:');
    console.log(`   • Total Records: ${summary.total_records}`);
    console.log(`   • Total Amount: Rs.${Number(summary.total_amount).toLocaleString()}`);
    console.log(`   • Paid Amount: Rs.${Number(summary.paid_amount).toLocaleString()} (${summary.paid_count} records)`);
    console.log(`   • Unpaid Amount: Rs.${Number(summary.unpaid_amount).toLocaleString()} (${summary.unpaid_count} records)`);

    // Get by category
    const byCategory = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          category,
          COUNT(*) as count,
          SUM(amount) as total,
          SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paid,
          SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as unpaid
        FROM fees
        GROUP BY category
        ORDER BY total DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log('\n📋 By Category:');
    byCategory.forEach(cat => {
      console.log(`   • ${cat.category.toUpperCase()}: Rs.${Number(cat.total).toLocaleString()} (${cat.count} records)`);
      console.log(`     - Paid: Rs.${Number(cat.paid).toLocaleString()}`);
      console.log(`     - Unpaid: Rs.${Number(cat.unpaid).toLocaleString()}`);
    });

    // Get sample fees
    const sampleFees = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM fees LIMIT 5', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log('\n📝 Sample Fees (first 5):');
    sampleFees.forEach(fee => {
      console.log(`   • ${fee.studentId}: ${fee.description} - Rs.${fee.amount} (${fee.paid ? 'PAID' : 'UNPAID'})`);
    });

    // Check payment history
    const paymentCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM payment_history', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`\n💳 Payment History Records: ${paymentCount}`);

    // Check templates
    const templateCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM fee_templates', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`🎨 Fee Templates: ${templateCount}\n`);

    console.log('✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error verifying fees data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
verifyFeesData();
