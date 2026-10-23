const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromImage } = require('../services/ocrService');
const { requireAuth } = require('../middleware/auth');
const db = require('../database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'ocr-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|bmp|tiff|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ── POST /api/admin/ocr/student-document ─────────────────────────────────────
router.post('/ocr/student-document', requireAuth, upload.single('document'), async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const rawText = await extractTextFromImage(req.file.path);
    fs.unlink(req.file.path, () => {});
    console.log('[OCR Raw Text]:\n' + rawText);

    const extracted = parseMarksheet(rawText);

    let existingStudent = null;
    if (extracted.name) {
      existingStudent = await new Promise(resolve => {
        db.get(
          `SELECT s.* FROM students s WHERE s.name LIKE ? LIMIT 1`,
          [`%${extracted.name.split(' ')[0]}%`],
          (e, r) => resolve(r || null)
        );
      });
    }

    res.json({
      success: true,
      data: extracted,
      existingStudent: existingStudent || null,
      rawText,
      message: existingStudent
        ? `Matched existing student: ${existingStudent.name}`
        : 'No existing student matched. Review and save as new student.'
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/admin/ocr/save-marksheet ───────────────────────────────────────
router.post('/ocr/save-marksheet', requireAuth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  const { studentId, extracted, isNewStudent, newStudentData } = req.body;

  try {
    let targetStudentId = studentId;

    if (isNewStudent && newStudentData) {
      const dept = await new Promise(resolve => {
        db.get('SELECT code FROM departments WHERE name = ?', [newStudentData.department], (e, r) => resolve(r));
      });
      const yr2 = String(new Date().getFullYear()).slice(-2);
      const code = dept && dept.code ? dept.code : 'STU';
      const prefix = 'STU' + code + yr2;
      const lastRow = await new Promise(resolve => {
        db.get('SELECT studentId FROM students WHERE studentId LIKE ? ORDER BY studentId DESC LIMIT 1',
          [prefix + '%'], (e, r) => resolve(r));
      });
      const seq = lastRow ? (parseInt(lastRow.studentId.slice(prefix.length), 10) || 0) + 1 : 1;
      const autoId = prefix + String(seq).padStart(3, '0');

      const newStudent = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO students (name, email, studentId, department, year) VALUES (?, ?, ?, ?, ?)',
          [newStudentData.name, newStudentData.email, autoId, newStudentData.department, newStudentData.year || '1'],
          function(err) { if (err) reject(err); else resolve({ id: this.lastID, studentId: autoId }); }
        );
      });
      targetStudentId = newStudent.id;
    }

    await new Promise(resolve => {
      db.run(`CREATE TABLE IF NOT EXISTS ocr_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_db_id INTEGER,
        symbol_number TEXT, registration_number TEXT, student_name TEXT,
        institution TEXT, exam_year TEXT, gpa REAL, percentage REAL,
        division TEXT, subjects TEXT, raw_text TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, resolve);
    });

    const docId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ocr_documents (student_db_id, symbol_number, registration_number, student_name,
          institution, exam_year, gpa, percentage, division, subjects, raw_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetStudentId,
          extracted.symbolNumber || null,
          extracted.registrationNumber || null,
          extracted.name || null,
          extracted.institution || null,
          extracted.examYear || null,
          extracted.gpa ? parseFloat(extracted.gpa) : null,
          extracted.percentage ? parseFloat(extracted.percentage) : null,
          extracted.division || null,
          JSON.stringify(extracted.subjects || []),
          extracted.rawText || null
        ],
        function(err) { if (err) reject(err); else resolve(this.lastID); }
      );
    });

    res.json({ success: true, message: 'Saved successfully', docId, studentDbId: targetStudentId });
  } catch (err) {
    console.error('Save marksheet error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/ocr/all-documents ─────────────────────────────────────────
router.get('/ocr/all-documents', requireAuth, (req, res) => {
  db.run(`CREATE TABLE IF NOT EXISTS ocr_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, student_db_id INTEGER,
    symbol_number TEXT, registration_number TEXT, student_name TEXT,
    institution TEXT, exam_year TEXT, gpa REAL, percentage REAL,
    division TEXT, subjects TEXT, raw_text TEXT,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, () => {
    db.all(
      `SELECT od.*, s.name as student_name_db, s.studentId as student_code, s.department
       FROM ocr_documents od LEFT JOIN students s ON s.id = od.student_db_id
       ORDER BY od.scanned_at DESC LIMIT 50`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const docs = (rows || []).map(r => ({ ...r, subjects: JSON.parse(r.subjects || '[]') }));
        res.json({ success: true, data: docs });
      }
    );
  });
});

// ── Normalize OCR misreads in grade letters ───────────────────────────────────
function fixGrade(s) {
  if (!s) return '';
  return s.trim()
    .replace(/^Br$/i, 'B+').replace(/^Ar$/i, 'A+').replace(/^Cr$/i, 'C+')
    .replace(/^8r$/i, 'B+').replace(/^8$/i, 'B').replace(/^fl$/i, 'A')
    .replace(/^ae$/i, 'A+').replace(/^av$/i, 'A+').replace(/^ar$/i, 'A+')
    .toUpperCase();
}

// ── PARSER — NEB Nepal Grade Sheet ───────────────────────────────────────────
function parseMarksheet(text) {
  // Strip pipe/bracket chars that come from table borders, normalize spaces
  const lines = text.split('\n')
    .map(l => l.replace(/[|\\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const clean = lines.join(' ');

  const result = {
    name: '', symbolNumber: '', registrationNumber: '',
    institution: '', examYear: '', gpa: '', percentage: '',
    division: '', subjects: [], rawText: text
  };

  // Institution — first line containing school/college keyword
  for (const line of lines) {
    if (line.length > 8 && line.length < 80 &&
        /school|college|academy|institute|university|vidyalaya/i.test(line)) {
      result.institution = line.trim();
      break;
    }
  }

  // Student name — "OBTAINED BY: KUSHAL KUMAR"
  const nameM = clean.match(/obtained\s+by\s*[:\-]?\s*([A-Z][A-Z\s]{2,40})(?:\s{2,}|[^A-Z\s]|$)/i)
    || clean.match(/name\s*[:\-]\s*([A-Z][A-Za-z\s]{2,40})/i);
  if (nameM && nameM[1]) result.name = nameM[1].trim().replace(/\s+[a-z]{1,3}$/, '').trim();

  // Registration number
  const regM = clean.match(/reg(?:istration)?\s*(?:no|number|#)?\.?\s*[:\-]?\s*([0-9]{5,15})/i);
  if (regM && regM[1]) result.registrationNumber = regM[1].trim();

  // Symbol number
  const symM = clean.match(/symbol\s*(?:no|number|#)?\.?\s*[:\-]?\s*([0-9]{5,12})/i);
  if (symM && symM[1]) result.symbolNumber = symM[1].trim();

  // Exam year
  const yearM = clean.match(/(?:examination|conducted|session|batch)\s*[^0-9]*?(20[0-9]{2})/i)
    || clean.match(/\b(20[0-9]{2})\b/);
  if (yearM && yearM[1]) result.examYear = yearM[1];

  // GPA — "GRADE POINT AVERAGE (GPA): 3.80"
  const gpaM = clean.match(/grade\s+point\s+average\s*(?:\([A-Z]+\))?\s*[:\-]?\s*(\d+\.\d{1,2})/i)
    || clean.match(/\b(?:gpa|cpa)\b\s*[:\-]?\s*(\d+\.\d{1,2})/i);
  if (gpaM && gpaM[1]) result.gpa = gpaM[1];

  // Percentage
  const pctM = clean.match(/(?:percentage|percent)\s*[:\-]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?/i)
    || clean.match(/(\d{1,3}\.\d{1,2})\s*%/);
  if (pctM && pctM[1]) result.percentage = pctM[1];

  // Division
  const divM = clean.match(/\b(?:division|result)\s*[:\-]?\s*(first|second|third|pass|fail|distinction)/i);
  if (divM && divM[1]) result.division = divM[1].trim();

  // Subjects — NEB format: "0011 COMPULSORY NEPALI (TH) 2.25 2.50 B B+"
  const SKIP = /^(subject|code|credit|grade|point|hour|final|remark|prepared|checked|principal|date|note|one|th=|pr=|abs=|w=|the\s+following|are\s+given|in\s+the|examination|conducted|national|government|board|scanned|camscann)/i;

  // Pattern with 4-digit subject code
  const WITH_CODE = /^(\d{4})\s+([A-Z][A-Z\s\(\)\/\-\.]{3,50}?)\s+([\d\.]+)\s+([\d\.]+)\s+([A-Za-z\+]{1,3})\s*([A-Za-z\+]{1,3})?\s*$/;
  // Pattern without code
  const NO_CODE = /^([A-Z][A-Z\s\(\)\/\-\.]{3,50}?)\s+([\d\.]+)\s+([\d\.]+)\s+([A-Za-z\+]{1,3})\s*([A-Za-z\+]{1,3})?\s*$/;

  for (const line of lines) {
    if (line.length < 8 || line.length > 150) continue;
    if (SKIP.test(line)) continue;

    const m1 = line.match(WITH_CODE);
    if (m1) {
      const grade = fixGrade(m1[5]);
      const finalGrade = fixGrade(m1[6]) || grade;
      result.subjects.push({
        code: m1[1], subject: m1[2].trim(),
        creditHour: parseFloat(m1[3]), gradePoint: parseFloat(m1[4]),
        grade, finalGrade
      });
      continue;
    }

    const m2 = line.match(NO_CODE);
    if (m2) {
      const subj = m2[1].trim();
      if (SKIP.test(subj)) continue;
      const grade = fixGrade(m2[4]);
      const finalGrade = fixGrade(m2[5]) || grade;
      result.subjects.push({
        subject: subj,
        creditHour: parseFloat(m2[2]), gradePoint: parseFloat(m2[3]),
        grade, finalGrade
      });
    }
  }

  // Deduplicate
  const seen = new Set();
  result.subjects = result.subjects.filter(s => {
    const key = s.subject.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log('[OCR Parser] Result:', {
    name: result.name, reg: result.registrationNumber,
    symbol: result.symbolNumber, gpa: result.gpa,
    subjects: result.subjects.length
  });

  return result;
}

module.exports = router;
