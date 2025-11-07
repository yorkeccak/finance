/**
 * PDF Generation Utilities
 * Based on investment banking PDF generation architecture
 *
 * This module provides comprehensive PDF generation capabilities including:
 * - Markdown to HTML conversion with GFM support
 * - Chart embedding (SVG → PNG via Puppeteer)
 * - Citation management with clickable references
 * - Professional styling and layout
 */

import { Citation, CitationMap } from './citation-utils';

/**
 * Format processing time in milliseconds to human-readable format
 */
function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Convert markdown to HTML with support for:
 * - Headers (H1-H6)
 * - Bold, italic
 * - Links
 * - Lists (ordered and unordered)
 * - Code blocks
 * - Citations
 * - Tables
 * - Horizontal rules
 */
export function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Step 1: Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Step 2: Convert headers (H1-H6) - order matters! (6 first, then 5, etc.)
  html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // Step 3: Convert bold and italic (before links to avoid conflicts)
  // **bold** or __bold__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // *italic* or _italic_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Step 4: Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Step 5: Convert citations to styled links
  // [1,2,3] or [1][2][3] → clickable citation badges
  html = html.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums) => {
    return nums.split(',').map((n: string) => {
      const num = n.trim();
      return `<a href="#ref-${num}" class="citation">[${num}]</a>`;
    }).join('');
  });

  // Step 6: Convert code blocks (before inline code)
  // ```language\ncode\n```
  html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Step 7: Convert blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Step 8: Convert lists
  const lines = html.split('\n');
  let processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | '' = '';

  for (const line of lines) {
    // Unordered list: starts with - or *
    if (line.match(/^[\*\-]\s+(.+)$/)) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(line.replace(/^[\*\-]\s+(.+)$/, '<li>$1</li>'));
    }
    // Ordered list: starts with number.
    else if (line.match(/^\d+\.\s+(.+)$/)) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(line.replace(/^\d+\.\s+(.+)$/, '<li>$1</li>'));
    } else {
      if (inList) {
        processedLines.push(`</${listType}>`);
        inList = false;
        listType = '';
      }
      processedLines.push(line);
    }
  }

  if (inList) {
    processedLines.push(`</${listType}>`);
  }

  html = processedLines.join('\n');

  // Step 9: Convert paragraphs
  // Split by double newlines, wrap non-block elements in <p>
  const blocks = html.split('\n\n');
  html = blocks.map(block => {
    // Don't wrap if already a block element
    if (block.match(/^<(h[1-6]|ul|ol|pre|table|hr|div|blockquote)/)) {
      return block;
    }
    // Don't wrap empty blocks
    if (block.trim() === '') {
      return '';
    }
    return `<p>${block}</p>`;
  }).join('\n');

  return html;
}

/**
 * Convert markdown tables to HTML
 * Handles GitHub Flavored Markdown table syntax:
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 */
export function convertMarkdownTables(markdown: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let inTable = false;
  let tableHtml = '';
  let isHeaderRow = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect table row: | cell1 | cell2 | cell3 |
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        isHeaderRow = true;
        tableHtml = '<table>';
      }

      // Skip separator row: |---|---|---|
      if (line.match(/^\|[\s:\-]+\|/)) {
        tableHtml += '<tbody>';
        isHeaderRow = false;
        continue;
      }

      // Parse cells
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '');

      // Build row
      const tag = isHeaderRow ? 'th' : 'td';
      const rowHtml = cells.map(cell => `<${tag}>${cell}</${tag}>`).join('');

      if (isHeaderRow) {
        tableHtml += `<thead><tr>${rowHtml}</tr></thead>`;
      } else {
        tableHtml += `<tr>${rowHtml}</tr>`;
      }
    } else {
      // End of table
      if (inTable) {
        tableHtml += '</tbody></table>';
        html += tableHtml;
        tableHtml = '';
        inTable = false;
      }
      html += line + '\n';
    }
  }

  // Close any open table
  if (inTable) {
    tableHtml += '</tbody></table>';
    html += tableHtml;
  }

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate references section HTML from citations
 */
export function generateReferencesSection(citations: Citation[]): string {
  if (citations.length === 0) return '';

  let html = `
    <div class="references-section">
      <h2 id="references">References</h2>
      <ol class="references-list">
  `;

  citations.forEach(citation => {
    html += `
      <li id="ref-${citation.number}" class="reference-item">
        <div class="reference-number">[${citation.number}]</div>
        <div class="reference-content">
          <div class="reference-title">${escapeHtml(citation.title)}</div>
          ${citation.source ? `<div class="reference-source">${escapeHtml(citation.source)}</div>` : ''}
          ${citation.authors && citation.authors.length > 0 ? `<div class="reference-authors">${escapeHtml(citation.authors.join(', '))}</div>` : ''}
          ${citation.date ? `<div class="reference-date">${escapeHtml(citation.date)}</div>` : ''}
          ${citation.url ? `
            <div class="reference-url">
              <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(citation.url)}</a>
            </div>
          ` : ''}
          ${citation.quote ? `
            <div class="reference-quote">"${escapeHtml(citation.quote)}"</div>
          ` : ''}
          ${citation.doi ? `
            <div class="reference-doi">DOI: ${escapeHtml(citation.doi)}</div>
          ` : ''}
        </div>
      </li>
    `;
  });

  html += `
      </ol>
    </div>
  `;

  return html;
}

/**
 * Get complete CSS for PDF
 */
export function getFullPdfCss(): string {
  return `
    /* ====================================
       PAGE SETUP
       ==================================== */
    @page {
      size: A4;
      margin: 2cm 0 3cm 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ====================================
       TYPOGRAPHY
       ==================================== */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
                   'Helvetica Neue', 'Arial', sans-serif;
      font-size: 10.5pt;
      line-height: 1.65;
      color: #1f2937;
      background: white;
      orphans: 2;
      widows: 2;
    }

    /* ====================================
       LETTERHEAD
       ==================================== */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 2cm 20px 2cm;
      border-bottom: 3px solid #FF784B;
      margin-bottom: 30px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    .letterhead .logo {
      height: 40px;
      width: auto;
    }

    .letterhead .date {
      font-size: 9pt;
      color: #6b7280;
      font-weight: 500;
    }

    /* ====================================
       REPORT HEADER
       ==================================== */
    .report-header {
      padding: 0 2cm;
      margin-bottom: 30px;
      page-break-after: avoid;
    }

    .report-title {
      font-size: 22pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      line-height: 1.3;
    }

    /* ====================================
       CONTENT AREA
       ==================================== */
    .report-content {
      padding: 0 2cm;
    }

    /* ====================================
       HEADINGS
       ==================================== */
    h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    h2 {
      font-size: 13pt;
      font-weight: 600;
      color: #111827;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    h3 {
      font-size: 11.5pt;
      font-weight: 600;
      color: #374151;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    h4, h5, h6 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #4b5563;
      margin-top: 14px;
      margin-bottom: 7px;
      page-break-after: avoid;
    }

    /* ====================================
       PARAGRAPHS
       ==================================== */
    p {
      margin-bottom: 12px;
      text-align: justify;
      page-break-inside: auto;
    }

    /* ====================================
       LISTS
       ==================================== */
    ul, ol {
      margin-bottom: 12px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 6px;
      line-height: 1.6;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    /* ====================================
       TABLES
       ==================================== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    thead {
      background-color: #f5f5f5;
    }

    th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #111827;
      border: 1px solid #ddd;
      background-color: #f5f5f5;
    }

    td {
      padding: 8px 12px;
      border: 1px solid #ddd;
      color: #374151;
      max-width: 200px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    /* ====================================
       CODE BLOCKS
       ==================================== */
    code {
      font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
      font-size: 9pt;
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      color: #d97706;
    }

    pre {
      background-color: #f5f5f5;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      color: #1f2937;
      font-size: 9.5pt;
      display: block;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* ====================================
       CITATIONS
       ==================================== */
    .citation {
      background-color: #f0f9ff;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 3px;
      text-decoration: none;
      font-size: 0.85em;
      font-weight: 600;
      white-space: nowrap;
      display: inline-block;
      margin: 0 2px;
      border: 1px solid #bae6fd;
    }

    /* ====================================
       REFERENCES SECTION
       ==================================== */
    .references-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      page-break-before: always;
    }

    .references-section h2 {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 20px;
      color: #111827;
    }

    .references-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .reference-item {
      display: flex;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f3f4f6;
      page-break-inside: avoid;
    }

    .reference-number {
      flex-shrink: 0;
      width: 40px;
      font-weight: 600;
      color: #6b7280;
    }

    .reference-content {
      flex: 1;
    }

    .reference-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    .reference-source {
      font-style: italic;
      color: #6b7280;
      font-size: 9pt;
      margin-bottom: 2px;
    }

    .reference-authors {
      color: #4b5563;
      font-size: 9pt;
      margin-bottom: 2px;
    }

    .reference-date {
      color: #9ca3af;
      font-size: 8.5pt;
      margin-bottom: 4px;
    }

    .reference-url {
      margin-top: 4px;
    }

    .reference-url a {
      color: #2563eb;
      font-size: 8.5pt;
      word-break: break-all;
      text-decoration: underline;
    }

    .reference-quote {
      margin-top: 8px;
      padding: 8px 12px;
      background-color: #f9fafb;
      border-left: 3px solid #d1d5db;
      font-style: italic;
      color: #4b5563;
      font-size: 9pt;
    }

    .reference-doi {
      margin-top: 4px;
      font-size: 8.5pt;
      color: #6b7280;
      font-family: 'Courier New', monospace;
    }

    /* ====================================
       CHARTS & IMAGES
       ==================================== */
    .chart-container {
      margin: 24px 0;
      page-break-inside: avoid;
      text-align: center;
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    img {
      max-width: 100%;
      height: auto;
    }

    /* ====================================
       HORIZONTAL RULES
       ==================================== */
    hr {
      border: none;
      border-top: 1px solid #d1d5db;
      margin: 24px 0;
    }

    /* ====================================
       LINKS
       ==================================== */
    a {
      color: #2563eb;
      text-decoration: underline;
    }

    /* ====================================
       EMPHASIS
       ==================================== */
    strong, b {
      font-weight: 600;
      color: #111827;
    }

    em, i {
      font-style: italic;
      color: #374151;
    }

    /* ====================================
       BLOCKQUOTES
       ==================================== */
    blockquote {
      margin: 16px 0;
      padding: 12px 20px;
      border-left: 4px solid #d1d5db;
      background-color: #f9fafb;
      font-style: italic;
      color: #4b5563;
      page-break-inside: avoid;
    }
  `;
}

/**
 * Build complete HTML template for PDF generation
 */
export function buildPdfHtmlTemplate(options: {
  title: string;
  content: string;
  citations: Citation[];
  logoDataUrl: string;
  chartImages?: Map<string, string>;
  processingTimeMs?: number;
}): string {
  const { title, content, citations, logoDataUrl, chartImages = new Map(), processingTimeMs } = options;

  // Replace chart placeholders with base64 images
  let processedContent = content;
  for (const [chartId, base64Image] of chartImages.entries()) {
    const placeholder = `__CHART_${chartId}__`;
    const imgTag = `
      <div class="chart-container">
        <img src="data:image/png;base64,${base64Image}" alt="Chart" />
      </div>
    `;
    processedContent = processedContent.replace(placeholder, imgTag);
  }

  // Convert tables first (before general markdown conversion)
  processedContent = convertMarkdownTables(processedContent);

  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHtml(processedContent);

  // Generate references
  const referencesHtml = citations.length > 0 ? generateReferencesSection(citations) : '';

  // Get current date
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format processing time
  const processingTimeDisplay = processingTimeMs
    ? formatProcessingTime(processingTimeMs)
    : null;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      <style>
        ${getFullPdfCss()}
        .processing-time {
          font-size: 10pt;
          color: #6b7280;
          text-align: right;
          margin-top: 8px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <!-- Letterhead -->
      <div class="letterhead">
        <img src="${logoDataUrl}" alt="Valyu Logo" class="logo" />
        <div class="date">${date}</div>
      </div>

      <!-- Report Header -->
      <div class="report-header">
        <h1 class="report-title">${escapeHtml(title)}</h1>
        ${processingTimeDisplay ? `<div class="processing-time">Generated in ${processingTimeDisplay}</div>` : ''}
      </div>

      <!-- Report Content -->
      <div class="report-content">
        ${htmlContent}
      </div>

      <!-- References -->
      ${referencesHtml}
    </body>
    </html>
  `;
}
