const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ocr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, BMP, TIFF, WebP)'));
    }
  }
});

// OCR processing endpoint
router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const imagePath = req.file.path;
    const language = req.body.language || 'eng'; // Default to English

    console.log(`Processing OCR for file: ${req.file.filename}`);
    console.log(`Language: ${language}`);

    // Process image with Tesseract
    const result = await Tesseract.recognize(
      imagePath,
      language,
      {
        logger: info => {
          // Log progress
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );

    // Extract text and confidence
    const extractedText = result.data.text || '';
    const confidence = result.data.confidence || 0;
    const words = result.data.words ? result.data.words.length : extractedText.split(/\s+/).filter(w => w.length > 0).length;

    // Clean up - delete uploaded file after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    // Return results
    res.json({
      success: true,
      data: {
        text: extractedText,
        confidence: Math.round(confidence),
        wordCount: words,
        language: language,
        fileName: req.file.originalname,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process image',
      error: error.message
    });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' },
    { code: 'ben', name: 'Bengali' },
    { code: 'kor', name: 'Korean' }
  ];

  res.json({
    success: true,
    data: languages
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OCR service is running',
    tesseractVersion: Tesseract.version
  });
});

module.exports = router;
