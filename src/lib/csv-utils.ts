/**
 * CSV Utilities
 * Functions to convert CSV data to markdown tables and handle CSV references
 */

export interface CSVData {
  title: string;
  description?: string;
  headers: string[];
  rows: string[][];
}

/**
 * Converts CSV data to a markdown table
 * @param csvData CSV data object with headers and rows
 * @returns Formatted markdown table string
 */
export function csvToMarkdownTable(csvData: CSVData): string {
  const { title, description, headers, rows } = csvData;

  // Build markdown table
  const lines: string[] = [];

  // Add title if present
  if (title) {
    lines.push(`**${title}**`);
    lines.push('');
  }

  // Add description if present
  if (description) {
    lines.push(description);
    lines.push('');
  }

  // Add header row
  const headerRow = '| ' + headers.join(' | ') + ' |';
  lines.push(headerRow);

  // Add separator row
  const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';
  lines.push(separatorRow);

  // Add data rows
  rows.forEach(row => {
    const rowStr = '| ' + row.join(' | ') + ' |';
    lines.push(rowStr);
  });

  return lines.join('\n');
}

/**
 * Escapes CSV cell content for markdown table rendering
 * Handles pipes, newlines, and other special characters
 */
export function escapeCsvCell(cell: string): string {
  if (!cell) return '';

  // Replace pipes with escaped version
  let escaped = cell.replace(/\|/g, '\\|');

  // Replace newlines with <br/>
  escaped = escaped.replace(/\n/g, '<br/>');

  return escaped;
}

/**
 * Formats CSV data with proper escaping for markdown tables
 */
export function formatCsvForMarkdown(csvData: CSVData): CSVData {
  return {
    ...csvData,
    headers: csvData.headers.map(h => escapeCsvCell(h)),
    rows: csvData.rows.map(row => row.map(cell => escapeCsvCell(cell))),
  };
}

/**
 * Generates a CSV reference link that can be embedded in markdown
 * Format: [CSV:csvId]
 */
export function generateCsvReference(csvId: string, label?: string): string {
  return label
    ? `[${label}](csv:${csvId})`
    : `[CSV](csv:${csvId})`;
}

/**
 * Parses a CSV reference from markdown text
 * Matches patterns like: [text](csv:uuid) or ![alt](csv:uuid)
 */
export function parseCsvReference(text: string): { csvId: string; alt?: string } | null {
  // Match markdown link with csv: protocol
  const linkMatch = text.match(/\[([^\]]*)\]\(csv:([a-f0-9-]+)\)/i);
  if (linkMatch) {
    return {
      csvId: linkMatch[2],
      alt: linkMatch[1] || undefined,
    };
  }

  // Match markdown image with csv: protocol
  const imageMatch = text.match(/!\[([^\]]*)\]\(csv:([a-f0-9-]+)\)/i);
  if (imageMatch) {
    return {
      csvId: imageMatch[2],
      alt: imageMatch[1] || undefined,
    };
  }

  return null;
}
