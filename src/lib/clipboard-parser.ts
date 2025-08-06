export interface ParsedRow {
  [key: string]: string;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  format: 'tsv' | 'csv' | 'html' | 'unknown';
}

export class ClipboardParser {
  static async parseFromClipboard(): Promise<ParseResult> {
    try {
      const text = await navigator.clipboard.readText();
      return this.parseText(text);
    } catch (error) {
      throw new Error('Failed to read from clipboard. Make sure clipboard access is allowed.');
    }
  }

  static parseText(text: string): ParseResult {
    const trimmedText = text.trim();
    
    if (this.isHTML(trimmedText)) {
      return this.parseHTML(trimmedText);
    } else if (this.isCSV(trimmedText)) {
      return this.parseCSV(trimmedText);
    } else if (this.isTSV(trimmedText)) {
      return this.parseTSV(trimmedText);
    } else {
      // Fallback: try to detect delimiter
      return this.parseDelimited(trimmedText);
    }
  }

  private static isHTML(text: string): boolean {
    return /<table|<tr|<td|<th/i.test(text);
  }

  private static isCSV(text: string): boolean {
    // Check for common CSV patterns
    const lines = text.split('\n');
    if (lines.length < 2) return false;
    
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    return commaCount > tabCount && commaCount > 0;
  }

  private static isTSV(text: string): boolean {
    return text.includes('\t');
  }

  private static parseHTML(html: string): ParseResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) {
      throw new Error('No table found in HTML content');
    }

    const headers: string[] = [];
    const rows: ParsedRow[] = [];

    // Extract headers
    const headerRow = table.querySelector('thead tr, tr:first-child');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('th, td');
      headerCells.forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
    }

    // Extract data rows
    const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
    dataRows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length > 0) {
        const rowData: ParsedRow = {};
        cells.forEach((cell, index) => {
          const header = headers[index] || `Column ${index + 1}`;
          rowData[header] = cell.textContent?.trim() || '';
        });
        rows.push(rowData);
      }
    });

    return {
      headers,
      rows,
      format: 'html'
    };
  }

  private static parseCSV(text: string): ParseResult {
    return this.parseDelimitedText(text, ',', 'csv');
  }

  private static parseTSV(text: string): ParseResult {
    return this.parseDelimitedText(text, '\t', 'tsv');
  }

  private static parseDelimited(text: string): ParseResult {
    // Auto-detect delimiter
    const firstLine = text.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount) {
      return this.parseDelimitedText(text, '\t', 'tsv');
    } else if (semicolonCount > commaCount) {
      return this.parseDelimitedText(text, ';', 'csv');
    } else if (commaCount > 0) {
      return this.parseDelimitedText(text, ',', 'csv');
    } else {
      // Single column or space-delimited
      return this.parseDelimitedText(text, ' ', 'unknown');
    }
  }

  private static parseDelimitedText(
    text: string, 
    delimiter: string, 
    format: 'tsv' | 'csv' | 'unknown'
  ): ParseResult {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [], format };
    }

    // Parse headers
    const headers = this.parseCSVLine(lines[0], delimiter);
    
    // Parse data rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.some(val => val.trim())) { // Skip empty rows
        const rowData: ParsedRow = {};
        values.forEach((value, index) => {
          const header = headers[index] || `Column ${index + 1}`;
          rowData[header] = value.trim();
        });
        rows.push(rowData);
      }
    }

    return {
      headers,
      rows,
      format
    };
  }

  private static parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    values.push(current);
    return values;
  }
}