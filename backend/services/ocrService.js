const Tesseract = require('tesseract.js');

/**
 * Extract text from image using Tesseract OCR
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted raw text
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log(`[OCR Service] Processing image: ${imagePath}`);
    
    const result = await Tesseract.recognize(
      imagePath,
      'eng', // English language
      {
        logger: info => {
          if (info.status === 'recognizing text') {
            console.log(`[OCR Service] Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );

    const extractedText = result.data.text || '';
    console.log(`[OCR Service] Extraction complete. Text length: ${extractedText.length} characters`);
    
    return extractedText;
  } catch (error) {
    console.error('[OCR Service] Error extracting text:', error);
    throw new Error('Failed to extract text from image');
  }
}

module.exports = {
  extractTextFromImage
};
