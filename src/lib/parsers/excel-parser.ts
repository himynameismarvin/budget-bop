import * as XLSX from 'xlsx';

export interface ExcelParseResult {
  headers: string[];
  rows: Record<string, string>[];
  sheetName: string;
  totalRows: number;
  format: 'xlsx' | 'xls' | 'csv';
}

export interface ExcelParseOptions {
  sheetIndex?: number; // Which sheet to parse (default: 0)
  sheetName?: string; // Parse sheet by name
  skipRows?: number; // Skip rows from top (default: 0)
  maxRows?: number; // Limit number of rows to parse
  dateNF?: string; // Date format for parsing dates
}

export class ExcelParser {
  /**
   * Parse Excel file from File object
   */
  static async parseFile(file: File, options: ExcelParseOptions = {}): Promise<ExcelParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('Failed to read file content');
          }
          
          const result = this.parseArrayBuffer(data as ArrayBuffer, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse Excel file from ArrayBuffer
   */
  static parseArrayBuffer(data: ArrayBuffer, options: ExcelParseOptions = {}): ExcelParseResult {
    try {
      const workbook = XLSX.read(data, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
        dateNF: options.dateNF || 'yyyy-mm-dd'
      });

      const sheetName = options.sheetName || workbook.SheetNames[options.sheetIndex || 0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      // Convert sheet to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: options.skipRows || 0,
        blankrows: false,
        defval: ''
      }) as string[][];

      if (jsonData.length === 0) {
        return {
          headers: [],
          rows: [],
          sheetName,
          totalRows: 0,
          format: this.detectFormat(data)
        };
      }

      // First row is headers
      const headers = jsonData[0].map((header, index) => 
        header ? this.cleanHeaderName(header.toString()) : `Column ${index + 1}`
      );

      // Rest are data rows
      const dataRows = jsonData.slice(1);
      const maxRows = options.maxRows ? Math.min(options.maxRows, dataRows.length) : dataRows.length;
      
      const rows = dataRows.slice(0, maxRows).map(row => {
        const rowData: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          const cellValue = row[index];
          rowData[header] = this.formatCellValue(cellValue);
        });
        
        return rowData;
      }).filter(row => 
        // Filter out completely empty rows
        Object.values(row).some(value => value && value.trim())
      );

      return {
        headers,
        rows,
        sheetName,
        totalRows: rows.length,
        format: this.detectFormat(data)
      };

    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sheet names from Excel file
   */
  static async getSheetNames(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error('Failed to read file');
          }
          
          const workbook = XLSX.read(data as ArrayBuffer, { type: 'array' });
          resolve(workbook.SheetNames);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse CSV data (using XLSX library for consistency)
   */
  static parseCSVText(csvText: string, options: ExcelParseOptions = {}): ExcelParseResult {
    try {
      const workbook = XLSX.read(csvText, {
        type: 'string',
        cellDates: true,
        raw: false
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: options.skipRows || 0,
        blankrows: false,
        defval: ''
      }) as string[][];

      if (jsonData.length === 0) {
        return {
          headers: [],
          rows: [],
          sheetName: 'CSV',
          totalRows: 0,
          format: 'csv'
        };
      }

      const headers = jsonData[0].map((header, index) => 
        header ? this.cleanHeaderName(header.toString()) : `Column ${index + 1}`
      );

      const rows = jsonData.slice(1).map(row => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = this.formatCellValue(row[index]);
        });
        return rowData;
      }).filter(row => 
        Object.values(row).some(value => value && value.trim())
      );

      return {
        headers,
        rows,
        sheetName: 'CSV',
        totalRows: rows.length,
        format: 'csv'
      };

    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect transaction-related columns in parsed data
   */
  static detectTransactionColumns(headers: string[]): {
    date?: string;
    description?: string;
    amount?: string;
    vendor?: string;
    account?: string;
    category?: string;
  } {
    const mapping: Record<string, string> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase());

    // Date column detection
    const dateKeywords = ['date', 'transaction date', 'posted date', 'time', 'when'];
    for (const keyword of dateKeywords) {
      const index = lowerHeaders.findIndex(h => h.includes(keyword));
      if (index !== -1) {
        mapping.date = headers[index];
        break;
      }
    }

    // Description/Vendor column detection
    const descKeywords = ['description', 'merchant', 'vendor', 'payee', 'name', 'reference'];
    for (const keyword of descKeywords) {
      const index = lowerHeaders.findIndex(h => h.includes(keyword));
      if (index !== -1) {
        mapping.description = headers[index];
        mapping.vendor = headers[index]; // Use same column for both initially
        break;
      }
    }

    // Amount column detection
    const amountKeywords = ['amount', 'debit', 'credit', 'transaction amount', 'total', 'sum'];
    for (const keyword of amountKeywords) {
      const index = lowerHeaders.findIndex(h => h.includes(keyword));
      if (index !== -1) {
        mapping.amount = headers[index];
        break;
      }
    }

    // Account column detection
    const accountKeywords = ['account', 'card', 'account number', 'source'];
    for (const keyword of accountKeywords) {
      const index = lowerHeaders.findIndex(h => h.includes(keyword));
      if (index !== -1) {
        mapping.account = headers[index];
        break;
      }
    }

    // Category column detection
    const categoryKeywords = ['category', 'type', 'classification'];
    for (const keyword of categoryKeywords) {
      const index = lowerHeaders.findIndex(h => h.includes(keyword));
      if (index !== -1) {
        mapping.category = headers[index];
        break;
      }
    }

    return mapping;
  }

  private static cleanHeaderName(header: string): string {
    return header
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Handle numbers
    if (typeof value === 'number') {
      // If it looks like a date serial number
      if (value > 40000 && value < 50000) { // Excel date range
        const date = XLSX.SSF.parse_date_code(value);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      return value.toString();
    }

    // Handle strings
    return value.toString().trim();
  }

  private static detectFormat(data: ArrayBuffer): 'xlsx' | 'xls' | 'csv' {
    // Check file signature
    const view = new Uint8Array(data.slice(0, 8));
    
    // XLSX signature (ZIP file)
    if (view[0] === 0x50 && view[1] === 0x4B) {
      return 'xlsx';
    }
    
    // XLS signature
    if (view[0] === 0xD0 && view[1] === 0xCF) {
      return 'xls';
    }
    
    // Default to CSV for text-based content
    return 'csv';
  }
}