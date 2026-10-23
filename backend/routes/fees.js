const express = require('express');
const router = express.Router();
const { getAllFees, addFee, markFeePaid, updateFee, deleteFee } = require('../dbHelpers');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const { notifyFeesAdded, notifyPaymentReceived } = require('../utils/notificationHelper');
const crypto = require('crypto');

// eSewa sandbox config
const ESEWA_PRODUCT_CODE = 'EPAYTEST';
const ESEWA_SECRET = '8gBm/:&EnhH.1/q';
const ESEWA_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const FRONTEND_URL = 'http://localhost:5173';

function esewaSign(message) {
  return crypto.createHmac('sha256', ESEWA_SECRET).update(message).digest('base64');
}

// Middleware to check if user is admin or principal (not teacher or student)
const requireAdminOrPrincipal = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const userRole = String(req.user.role).toLowerCase();
  if (userRole === 'teacher' || userRole === 'student') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Only admin and principal can access fee information.' 
    });
  }
  
  next();
};

// GET /api/fees?studentId=&paid=&category=&overdue=
router.get('/', async (req, res) => {
  const { studentId, paid, category, overdue } = req.query;
  const filters = {};
  if (studentId) filters.studentId = studentId;
  if (typeof paid !== 'undefined') filters.paid = paid === '1' || paid === 'true';
  if (category) filters.category = category;
  
  try {
    let data = await getAllFees(filters);
    
    // Filter overdue fees
    if (overdue === 'true') {
      const today = new Date().toISOString().split('T')[0];
      data = data.filter(f => !f.paid && f.due_date && f.due_date < today);
    }
    
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/fees/analytics - Get fee analytics
router.get('/analytics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Total fees
    const totalQuery = 'SELECT SUM(amount) as total FROM fees';
    const paidQuery = 'SELECT SUM(amount) as total FROM fees WHERE paid = 1';
    const unpaidQuery = 'SELECT SUM(amount) as total FROM fees WHERE paid = 0';
    const overdueQuery = 'SELECT SUM(amount) as total FROM fees WHERE paid = 0 AND due_date < ?';
    
    // Category breakdown
    const categoryQuery = `
      SELECT category, 
             COUNT(*) as count, 
             SUM(amount) as total,
             SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paid_amount,
             SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as unpaid_amount
      FROM fees 
      GROUP BY category
    `;
    
    // Recent payments
    const recentPaymentsQuery = `
      SELECT * FROM payment_history 
      ORDER BY payment_date DESC 
      LIMIT 10
    `;
    
    const [total, paid, unpaid, overdue, categories, recentPayments] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get(totalQuery, [], (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(paidQuery, [], (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(unpaidQuery, [], (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(overdueQuery, [today], (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(categoryQuery, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(recentPaymentsQuery, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      })
    ]);
    
    res.json({
      success: true,
      data: {
        total: Number(total) || 0,
        paid: Number(paid) || 0,
        unpaid: Number(unpaid) || 0,
        overdue: Number(overdue) || 0,
        categories: categories || [],
        recentPayments: recentPayments || []
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/fees/student/:studentId - Get all fees for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const fees = await getAllFees({ studentId });
    
    // Get payment history
    const paymentHistory = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM payment_history WHERE student_id = ? ORDER BY payment_date DESC',
        [studentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    const total = fees.reduce((sum, f) => sum + Number(f.amount), 0);
    // paid = fully paid fees + partial amounts already paid on unpaid fees
    const paid = fees.reduce((sum, f) => sum + (f.paid ? Number(f.amount) : Number(f.amount_paid || 0)), 0);
    const unpaid = total - paid;
    
    res.json({
      success: true,
      data: {
        fees,
        paymentHistory,
        summary: { total, paid, unpaid }
      }
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/fees - Create a single fee
router.post('/', async (req, res) => {
  const { studentId: rawStudentId, amount, description, due_date, category } = req.body;
  const studentId = (rawStudentId || '').trim();
  if (!studentId || !amount) return res.status(400).json({ success: false, message: 'studentId and amount required' });
  try {
    const fee = await addFee({ studentId, amount, description, due_date, category });
    
    // Send notification to student
    try {
      const studentQuery = 'SELECT name FROM students WHERE studentId = ?';
      db.get(studentQuery, [studentId], (err, student) => {
        if (!err && student) {
          notifyFeesAdded(studentId, student.name, amount, description || 'Fee', category || 'General');
        }
      });
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.json({ success: true, data: fee, message: 'Fee created successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Error adding fee' });
  }
});

// POST /api/fees/bulk - Create fees for multiple students
router.post('/bulk', async (req, res) => {
  try {
    const { studentIds, amount, description, due_date, category, filter } = req.body;
    
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }
    
    let targetStudents = [];
    
    // If filter is provided, get students based on filter
    if (filter) {
      if (filter.type === 'all') {
        // Get all students
        targetStudents = await new Promise((resolve, reject) => {
          db.all('SELECT studentId FROM students', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.studentId));
          });
        });
      } else if (filter.type === 'department' && filter.value) {
        // Get students by department
        targetStudents = await new Promise((resolve, reject) => {
          db.all('SELECT studentId FROM students WHERE department = ?', [filter.value], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.studentId));
          });
        });
      } else if (filter.type === 'course' && filter.value) {
        // Get students enrolled in a course
        targetStudents = await new Promise((resolve, reject) => {
          db.all(`
            SELECT DISTINCT s.studentId 
            FROM students s
            JOIN enrollments e ON e.student_id = s.id
            JOIN courses c ON c.id = e.course_id
            WHERE c.name = ?
          `, [filter.value], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.studentId));
          });
        });
      }
    } else if (studentIds && Array.isArray(studentIds)) {
      targetStudents = studentIds;
    }
    
    if (targetStudents.length === 0) {
      return res.status(400).json({ success: false, message: 'No students selected' });
    }
    
    // Create fees for all target students
    const createdFees = [];
    for (const studentId of targetStudents) {
      try {
        const fee = await addFee({
          studentId,
          amount,
          description: description || 'Bulk fee',
          due_date,
          category: category || 'general'
        });
        createdFees.push(fee);
      } catch (error) {
        console.error(`Error creating fee for ${studentId}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Created ${createdFees.length} fee records`,
      data: { count: createdFees.length, fees: createdFees }
    });
  } catch (error) {
    console.error('Error creating bulk fees:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/fees/:id/pay - Mark fee as paid with payment details
router.post('/:id/pay', async (req, res) => {
  const id = req.params.id;
  const { payment_method, transaction_id, payment_date, notes } = req.body;
  
  try {
    // Get fee details
    const fee = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM fees WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    if (fee.paid) {
      return res.status(400).json({ success: false, message: 'Fee already paid' });
    }
    
    // Mark as paid
    const result = await markFeePaid(id);
    
    // Record payment history
    const paymentDate = payment_date || new Date().toISOString();
    const transactionId = transaction_id || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payment_history 
         (fee_id, student_id, amount, payment_method, transaction_id, payment_date, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, fee.studentId, fee.amount, payment_method || 'cash', transactionId, paymentDate, notes || ''],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { ...result, transaction_id: transactionId }
    });
  } catch (e) {
    console.error('Error processing payment:', e);
    res.status(500).json({ success: false, message: e.message || 'Error marking fee paid' });
  }
});

// POST /api/fees/:id/installment - Create installment plan
router.post('/:id/installment', async (req, res) => {
  try {
    const { id } = req.params;
    const { num_installments, start_date } = req.body;
    
    if (!num_installments || num_installments < 2) {
      return res.status(400).json({ success: false, message: 'Number of installments must be at least 2' });
    }
    
    // Get original fee
    const fee = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM fees WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    if (fee.paid) {
      return res.status(400).json({ success: false, message: 'Fee already paid' });
    }
    
    // Delete original fee
    await deleteFee(id);
    
    // Create installments
    const installmentAmount = (Number(fee.amount) / num_installments).toFixed(2);
    const startDate = new Date(start_date || Date.now());
    const installments = [];
    
    for (let i = 0; i < num_installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const installment = await addFee({
        studentId: fee.studentId,
        amount: i === num_installments - 1 
          ? (Number(fee.amount) - (installmentAmount * (num_installments - 1))).toFixed(2) // Last installment gets remainder
          : installmentAmount,
        description: `${fee.description || 'Fee'} - Installment ${i + 1}/${num_installments}`,
        due_date: dueDate.toISOString().split('T')[0],
        category: fee.category
      });
      
      installments.push(installment);
    }
    
    res.json({
      success: true,
      message: `Created ${num_installments} installments`,
      data: installments
    });
  } catch (error) {
    console.error('Error creating installments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/fees/templates - Get fee templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM fee_templates ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/fees/templates - Create fee template
router.post('/templates', async (req, res) => {
  try {
    const { name, amount, description, category, default_due_days } = req.body;
    
    if (!name || !amount) {
      return res.status(400).json({ success: false, message: 'Name and amount are required' });
    }
    
    const template = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO fee_templates (name, amount, description, category, default_due_days) 
         VALUES (?, ?, ?, ?, ?)`,
        [name, amount, description || '', category || 'general', default_due_days || 30],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, amount, description, category, default_due_days });
        }
      );
    });
    
    res.json({ success: true, message: 'Template created successfully', data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/fees/templates/:id/apply - Apply template to students
router.post('/templates/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;
    const { filter } = req.body;
    
    // Get template
    const template = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM fee_templates WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Get target students
    let targetStudents = [];
    
    if (filter.type === 'all') {
      targetStudents = await new Promise((resolve, reject) => {
        db.all('SELECT studentId FROM students', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.studentId));
        });
      });
    } else if (filter.type === 'department' && filter.value) {
      targetStudents = await new Promise((resolve, reject) => {
        db.all('SELECT studentId FROM students WHERE department = ?', [filter.value], (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.studentId));
        });
      });
    }
    
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (template.default_due_days || 30));
    
    // Create fees
    const createdFees = [];
    for (const studentId of targetStudents) {
      try {
        const fee = await addFee({
          studentId,
          amount: template.amount,
          description: template.description,
          due_date: dueDate.toISOString().split('T')[0],
          category: template.category
        });
        createdFees.push(fee);
      } catch (error) {
        console.error(`Error creating fee for ${studentId}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Applied template to ${createdFees.length} students`,
      data: { count: createdFees.length }
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/fees/:id - Update a fee record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, amount, description, category, due_date, paid } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'studentId and amount are required'
      });
    }

    // Check if fee exists
    db.get('SELECT * FROM fees WHERE id = ?', [Number(id)], async (err, fee) => {
      if (err) {
        console.error('Error fetching fee:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: 'Fee record not found'
        });
      }

      try {
        // Update fee
        const updatedFee = await updateFee(Number(id), {
          studentId,
          amount,
          description: description || fee.description,
          category: category || fee.category,
          due_date: due_date || fee.due_date,
          paid: paid !== undefined ? paid : fee.paid
        });

        res.json({
          success: true,
          message: 'Fee updated successfully',
          data: updatedFee
        });
      } catch (error) {
        console.error('Error updating fee:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/fees/bulk - Delete multiple fee records
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required and must not be empty'
      });
    }

    // Delete all records in a transaction
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM fees WHERE id IN (${placeholders})`;

    db.run(query, ids, function(err) {
      if (err) {
        console.error('Error bulk deleting fees:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      res.json({
        success: true,
        message: `Successfully deleted ${this.changes} fee record(s)`,
        deletedCount: this.changes
      });
    });
  } catch (error) {
    console.error('Error bulk deleting fees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/fees/:id - Delete a fee record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if fee exists
    db.get('SELECT * FROM fees WHERE id = ?', [Number(id)], async (err, fee) => {
      if (err) {
        console.error('Error fetching fee:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: 'Fee record not found'
        });
      }

      try {
        // Delete fee
        const result = await deleteFee(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Fee deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Fee record not found'
          });
        }
      } catch (error) {
        console.error('Error deleting fee:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/fees/esewa/initiate - Generate eSewa payment payload
router.post('/esewa/initiate', async (req, res) => {
  try {
    const { feeId, studentId, splitAmount } = req.body;
    if (!feeId || !studentId) {
      return res.status(400).json({ success: false, message: 'feeId and studentId required' });
    }

    const fee = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM fees WHERE id = ? AND studentId = ?', [feeId, studentId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
    if (fee.paid) return res.status(400).json({ success: false, message: 'Fee already paid' });

    const remaining = Number(fee.amount) - Number(fee.amount_paid || 0);
    let payAmt = splitAmount ? parseFloat(splitAmount) : remaining;
    if (isNaN(payAmt) || payAmt <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    if (payAmt > remaining) payAmt = remaining;

    const amount = payAmt.toFixed(2);
    const transaction_uuid = `${feeId}-${studentId}-${Date.now()}`;
    const message = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = esewaSign(message);

    res.json({
      success: true,
      data: {
        amount,
        tax_amount: '0',
        total_amount: amount,
        transaction_uuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: `${FRONTEND_URL}/dashboard/fees`,
        failure_url: `${FRONTEND_URL}/dashboard/fees?esewa=failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
        esewa_url: ESEWA_URL,
        fee_id: feeId
      }
    });
  } catch (e) {
    console.error('eSewa initiate error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/fees/esewa/verify - Verify eSewa payment after redirect
router.get('/esewa/verify', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.status(400).json({ success: false, message: 'No data provided' });

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    } catch (e) {
      console.error('eSewa base64 decode error:', e, 'raw data:', data);
      return res.status(400).json({ success: false, message: 'Invalid payment data' });
    }

    console.log('eSewa verify decoded:', decoded);

    const { transaction_uuid, total_amount, status, signed_field_names, signature } = decoded;

    if (status !== 'COMPLETE') {
      return res.json({ success: false, message: 'Payment not completed', status });
    }

    // Verify signature
    const fields = signed_field_names.split(',');
    const message = fields.map(f => `${f}=${decoded[f]}`).join(',');
    const expectedSig = esewaSign(message);
    if (expectedSig !== signature) {
      console.error('eSewa signature mismatch. Expected:', expectedSig, 'Got:', signature);
      return res.status(400).json({ success: false, message: 'Signature mismatch' });
    }

    // Extract feeId from transaction_uuid (format: feeId-studentId-timestamp)
    const dashIdx = transaction_uuid.indexOf('-');
    const feeId = transaction_uuid.substring(0, dashIdx);

    const fee = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM fees WHERE id = ?', [feeId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
    if (fee.paid) return res.json({ success: true, message: 'Already marked paid' });

    // paidAmount from eSewa response
    const paidNow = parseFloat(total_amount) || 0;
    const newAmountPaid = Number(fee.amount_paid || 0) + paidNow;
    const isFullyPaid = newAmountPaid >= Number(fee.amount);

    // Update amount_paid and mark paid if fully settled
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE fees SET amount_paid = ?, paid = ? WHERE id = ?',
        [newAmountPaid, isFullyPaid ? 1 : 0, feeId],
        function(err) { if (err) reject(err); else resolve(); }
      );
    });

    const transactionId = `ESEWA-${transaction_uuid}`;
    const notes = isFullyPaid ? 'eSewa online payment (full)' : `eSewa partial payment (${paidNow} of ${fee.amount})`;
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payment_history (fee_id, student_id, amount, payment_method, transaction_id, payment_date, notes)
         VALUES (?, ?, ?, 'esewa', ?, ?, ?)`,
        [feeId, fee.studentId, paidNow, transactionId, new Date().toISOString(), notes],
        function(err) { if (err) reject(err); else resolve(); }
      );
    });

    res.json({
      success: true,
      message: isFullyPaid ? 'Payment complete! Fee fully paid.' : `Partial payment of Rs.${paidNow} recorded. Remaining: Rs.${(Number(fee.amount) - newAmountPaid).toFixed(2)}`,
      transaction_id: transactionId,
      fully_paid: isFullyPaid,
      amount_paid: newAmountPaid,
      remaining: Number(fee.amount) - newAmountPaid
    });
  } catch (e) {
    console.error('eSewa verify error:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
