/**
 * Utility functions for enhanced markdown processing
 */

/**
 * Preprocesses text to fix character-level breaks and formatting issues
 * Also converts any stray LaTeX to proper <math> tags
 */
export function preprocessMarkdownText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let processedText = text;

  // Escape standalone $ symbols that aren't part of LaTeX expressions
  // This prevents them from being interpreted as math delimiters
  // Match $ that isn't followed/preceded by another $ (inline math) or \\ (LaTeX)
  processedText = processedText
    // Protect existing math expressions first by temporarily replacing them
    .replace(/\$\$[\s\S]+?\$\$/g, (match) => `__DISPLAY_MATH__${Buffer.from(match).toString('base64')}__`)
    .replace(/\$[^$\n]+?\$/g, (match) => `__INLINE_MATH__${Buffer.from(match).toString('base64')}__`)
    // Now escape remaining standalone $ symbols by wrapping them in backticks to prevent interpretation
    .replace(/\$/g, '\\$')
    // Restore protected math expressions
    .replace(/__DISPLAY_MATH__([A-Za-z0-9+/=]+)__/g, (_, base64) => Buffer.from(base64, 'base64').toString())
    .replace(/__INLINE_MATH__([A-Za-z0-9+/=]+)__/g, (_, base64) => Buffer.from(base64, 'base64').toString());

  // Convert any stray LaTeX expressions to <math> tags
  processedText = processedText
    // Convert standalone \frac{...}{...} to <math>\frac{...}{...}</math>
    .replace(/(?<!<math>)\\\w+\{[^}]*\}(?:\{[^}]*\})?(?![^<]*<\/math>)/g, (match) => `<math>${match}</math>`)
    // Convert standalone \times, \cdot, etc. to <math> tags
    .replace(/(?<!<math>)\\(times|cdot|pm|div|sqrt|sum|int|alpha|beta|gamma|pi|theta)(?![^<]*<\/math>)/g, (match) => `<math>${match}</math>`)
    // Convert expressions with parentheses and LaTeX
    .replace(/(?<!<math>)\\\w+\([^)]*\)(?![^<]*<\/math>)/g, (match) => `<math>${match}</math>`);

  // Fix any character-level breaks that might have occurred
  processedText = cleanFinancialText(processedText);

  return processedText;
}

/**
 * Detects if text has severe corruption that needs fixing
 */
export function needsCleaning(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Check for character-level breaks and other severe corruption
  return (
    // Character-level word breaks (like "2 6 . 9 B i n Q 2")
    /\d\s+\d\s+\.\s+\d\s+[A-Z]\s+[a-z]\s+[a-z]\s+[A-Z]\s+\d/.test(text) ||
    // Broken financial amounts like "2 3 . 3 5 B"
    /\d\s+\d\s+\.\s+\d\s+[BMK]/.test(text) ||
    // Character breaks in words like "t h e c o m p a n y"
    /\b[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]/.test(text) ||
    // Multiple character breaks
    /\b\w\s+\w\s+\w\s+\w\s+\w/.test(text)
  );
}

/**
 * Fixes severely corrupted text caused by LaTeX misinterpretation
 */
export function cleanFinancialText(text: string): string {
  if (!text || typeof text !== 'string' || !needsCleaning(text)) {
    return text;
  }

  return text
    // Fix financial amounts like "2 6 . 9 B" → "26.9 B"
    .replace(/(\d)\s+(\d)\s*\.\s*(\d+)\s+([BMK])/g, '$1$2.$3 $4')
    .replace(/(\d)\s+(\d)\s*\.\s*(\d+)/g, '$1$2.$3')
    // Fix broken numbers like "2 3 . 3 5" → "23.35"
    .replace(/(\d)\s+(\d)\s*\.\s*(\d)\s+(\d)/g, '$1$2.$3$4')
    .replace(/(\d)\s+(\d)\s*\.\s*(\d)/g, '$1$2.$3')
    // Fix character-level word breaks - most common patterns
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5$6$7$8$9$10')
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5$6$7$8$9')
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5$6$7$8')
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5$6$7')
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5$6')
    .replace(/\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g, '$1$2$3$4$5')
}