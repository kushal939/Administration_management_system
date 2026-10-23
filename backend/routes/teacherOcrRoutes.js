const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromImage } = require('../services/ocrService');
const { requireAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-marksheet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Extract marks data from uploaded marksheet
 * POST /api/teacher/ocr/marksheet
 * Protected: Teacher only
 */
router.post('/ocr/marksheet', requireAuth, upload.single('document'), async (req, res) => {
  try {
    // Security: Check if user is teacher
    if (!req.user || req.user.role !== 'teacher') {
      // Clean up uploaded file
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teacher only.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No marksheet file uploaded'
      });
    }

    const imagePath = req.file.path;
    console.log(`[Teacher OCR] Processing marksheet for teacher: ${req.user.email}`);

    // Extract text using OCR service
    const rawText = await extractTextFromImage(imagePath);

    // Parse extracted text to find marks data
    const marksData = parseMarksheet(rawText);

    // Clean up - delete uploaded file after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    // Return extracted marks data (DO NOT save to database)
    res.json({
      success: true,
      data: {
        marksData: marksData,
        totalRecords: marksData.length
      },
      message: 'Marksheet processed. Please review and confirm the extracted marks before saving.'
    });

  } catch (error) {
    console.error('[Teacher OCR] Error processing marksheet:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process marksheet',
      error: error.message
    });
  }
});

/**
 * Parse marksheet text and extract marks data
 * Handles two formats:
 * 1. Student list format: "RollNo Name Marks" per line
 * 2. Subject marks format: Extract from a single student's marksheet
 */
function parseMarksheet(text) {
  const marksData = [];
  
  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`[Teacher OCR] Processing ${lines.length} lines from marksheet`);
  console.log(`[Teacher OCR] Raw text preview: ${text.substring(0, 300)}...`);

  // Try to detect format
  const hasMultipleStudents = detectMultipleStudentsFormat(lines);
  
  if (hasMultipleStudents) {
    // Format 1: Multiple students list
    console.log('[Teacher OCR] Detected: Multiple students list format');
    for (const line of lines) {
      console.log(`[Teacher OCR] Processing line: "${line}"`);
      
      if (isHeaderLine(line)) {
        console.log(`[Teacher OCR] Skipped header line: "${line}"`);
        continue;
      }

      const extracted = extractMarksFromLine(line);
      
      if (extracted && extracted.roll && extracted.name && extracted.marks) {
        marksData.push(extracted);
        console.log(`[Teacher OCR] ✓ Extracted: Roll=${extracted.roll}, Name=${extracted.name}, Marks=${extracted.marks}`);
      } else {
        console.log(`[Teacher OCR] ✗ Could not extract data from: "${line}"`);
      }
    }
  } else {
    // Format 2: Single student marksheet - extract subject-wise marks
    console.log('[Teacher OCR] Detected: Single student marksheet format');
    const studentInfo = extractStudentInfo(lines);
    
    if (studentInfo.roll && studentInfo.name) {
      // Look for total marks or percentage
      const totalMarks = extractTotalMarks(lines);
      
      if (totalMarks) {
        marksData.push({
          roll: studentInfo.roll,
          name: studentInfo.name,
          marks: totalMarks
        });
        console.log(`[Teacher OCR] ✓ Extracted from marksheet: Roll=${studentInfo.roll}, Name=${studentInfo.name}, Marks=${totalMarks}`);
      } else {
        console.log(`[Teacher OCR] ✗ Could not extract total marks from marksheet`);
      }
    } else {
      console.log(`[Teacher OCR] ✗ Could not extract student info from marksheet`);
    }
  }

  console.log(`[Teacher OCR] Successfully extracted ${marksData.length} student records`);
  return marksData;
}

/**
 * Detect if the text contains multiple students or a single student marksheet
 */
function detectMultipleStudentsFormat(lines) {
  // Count lines that look like "RollNo Name Marks" format
  let studentLineCount = 0;
  
  for (const line of lines) {
    if (isHeaderLine(line)) continue;
    
    // Check if line matches student list pattern
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const firstPart = parts[0];
      const lastPart = parts[parts.length - 1];
      
      // First part looks like roll number, last part looks like marks
      if (/^[A-Z]?\d+$/i.test(firstPart) && /^\d{1,3}$/.test(lastPart)) {
        studentLineCount++;
      }
    }
  }
  
  // If we found 2 or more student-like lines, it's probably a list
  return studentLineCount >= 2;
}

/**
 * Extract student info (name and roll) from a single student marksheet
 */
function extractStudentInfo(lines) {
  let name = '';
  let roll = '';
  
  for (const line of lines) {
    // Look for "Student Name:" or "Name:" pattern
    const nameMatch = line.match(/(?:Student\s+)?Name\s*:\s*([A-Za-z\s]+)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
      console.log(`[Teacher OCR] Found name: ${name}`);
    }
    
    // Look for "Roll No:" or "Roll:" pattern
    const rollMatch = line.match(/Roll\s*(?:No|Number)?\s*:\s*([A-Z]?\d+)/i);
    if (rollMatch) {
      roll = rollMatch[1].trim();
      console.log(`[Teacher OCR] Found roll: ${roll}`);
    }
    
    if (name && roll) break;
  }
  
  return { name, roll };
}

/**
 * Extract total marks or calculate from percentage
 */
function extractTotalMarks(lines) {
  for (const line of lines) {
    // Look for "Total Marks: 409 / 500" or "Total: 409"
    const totalMatch = line.match(/Total\s*(?:Marks)?\s*:\s*(\d+)\s*(?:\/\s*\d+)?/i);
    if (totalMatch) {
      const marks = parseInt(totalMatch[1]);
      console.log(`[Teacher OCR] Found total marks: ${marks}`);
      return marks.toString();
    }
    
    // Look for "Percentage: 81.8%" and convert to marks out of 100
    const percentMatch = line.match(/Percentage\s*:\s*([\d.]+)\s*%/i);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      const marks = Math.round(percent); // Convert percentage to marks out of 100
      console.log(`[Teacher OCR] Found percentage: ${percent}%, converted to marks: ${marks}`);
      return marks.toString();
    }
  }
  
  return null;
}

/**
 * Check if line is a header line (should be skipped)
 */
function isHeaderLine(line) {
  const headerKeywords = [
    'roll', 'name', 'marks', 'student', 'score', 'total', 'subject',
    'class', 'section', 'date', 'exam', 'test', 'marksheet'
  ];
  
  const lowerLine = line.toLowerCase();
  
  // If line contains multiple header keywords, it's likely a header
  const keywordCount = headerKeywords.filter(keyword => lowerLine.includes(keyword)).length;
  if (keywordCount >= 2) {
    return true;
  }
  
  // If line is very short (less than 5 chars), skip it
  if (line.length < 5) {
    return true;
  }
  
  return false;
}

/**
 * Extract roll number, name, and marks from a single line
 * Tries multiple patterns to handle different formats
 */
function extractMarksFromLine(line) {
  // Clean the line
  const cleanLine = line.trim();
  
  // Pattern 1: "RollNo Name Marks" - Standard format (more flexible with name casing)
  // Examples: "12 Ram Kumar 78", "001 John Doe 85", "S123 Alice Smith 92"
  const pattern1 = /^([A-Z]?\d+)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d{1,3})$/i;
  let match = cleanLine.match(pattern1);
  
  if (match) {
    return {
      roll: match[1].trim(),
      name: match[2].trim(),
      marks: match[3].trim()
    };
  }

  // Pattern 2: "RollNo | Name | Marks" - Pipe separated
  const pattern2 = /^([A-Z]?\d+)\s*\|\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*\|\s*(\d{1,3})$/i;
  match = cleanLine.match(pattern2);
  
  if (match) {
    return {
      roll: match[1].trim(),
      name: match[2].trim(),
      marks: match[3].trim()
    };
  }

  // Pattern 3: "RollNo, Name, Marks" - Comma separated
  const pattern3 = /^([A-Z]?\d+)\s*,\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*,\s*(\d{1,3})$/i;
  match = cleanLine.match(pattern3);
  
  if (match) {
    return {
      roll: match[1].trim(),
      name: match[2].trim(),
      marks: match[3].trim()
    };
  }

  // Pattern 4: "RollNo\tName\tMarks" - Tab separated
  const pattern4 = /^([A-Z]?\d+)\t+([A-Za-z]+(?:\s+[A-Za-z]+)*)\t+(\d{1,3})$/i;
  match = cleanLine.match(pattern4);
  
  if (match) {
    return {
      roll: match[1].trim(),
      name: match[2].trim(),
      marks: match[3].trim()
    };
  }

  // Pattern 5: More flexible - any whitespace between roll, name, marks
  // Split by whitespace and try to identify components
  const parts = cleanLine.split(/\s+/);
  
  if (parts.length >= 3) {
    // First part should be roll number (starts with letter or digit)
    const rollPart = parts[0];
    if (/^[A-Z]?\d+$/i.test(rollPart)) {
      // Last part should be marks (1-3 digits)
      const marksPart = parts[parts.length - 1];
      if (/^\d{1,3}$/.test(marksPart)) {
        // Everything in between is the name
        const nameParts = parts.slice(1, -1);
        const name = nameParts.join(' ');
        
        // Validate name (should contain at least one letter)
        if (/[A-Za-z]/.test(name) && name.length >= 2) {
          return {
            roll: rollPart.trim(),
            name: name.trim(),
            marks: marksPart.trim()
          };
        }
      }
    }
  }

  // Pattern 6: Handle format with extra spaces or dots
  // Example: "12 . Ram Kumar . 78"
  const pattern6 = /^([A-Z]?\d+)\s*\.?\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*\.?\s*(\d{1,3})$/i;
  match = cleanLine.match(pattern6);
  
  if (match) {
    return {
      roll: match[1].trim(),
      name: match[2].trim(),
      marks: match[3].trim()
    };
  }

  // If no pattern matched, return null
  return null;
}

module.exports = router;
