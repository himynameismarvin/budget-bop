// Dynamic import for pdf-parse to avoid Node.js module issues in browser
let pdfParse: any;

const loadPdfParse = async () => {
  if (typeof window === 'undefined') {
    // Only load on server side
    pdfParse = (await import('pdf-parse')).default;
  } else {
    throw new Error('PDF parsing is not supported in the browser environment');
  }
};

export interface PDFParseResult {
  text: string;
  pages: string[];
  totalPages: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modDate?: Date;
  };
  extractedTransactions?: string[]; // Potential transaction lines
}

export interface PDFParseOptions {
  maxPages?: number; // Limit pages to parse
  pageRange?: {
    start: number;
    end: number;
  };
  extractTransactionHints?: boolean; // Try to identify transaction-like lines
}

export class PDFParser {
  /**
   * Parse PDF file from File object
   */
  static async parseFile(file: File, options: PDFParseOptions = {}): Promise<PDFParseResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return this.parseArrayBuffer(arrayBuffer, options);
    } catch (error) {
      throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse PDF from ArrayBuffer
   */
  static async parseArrayBuffer(data: ArrayBuffer, options: PDFParseOptions = {}): Promise<PDFParseResult> {
    try {
      if (!pdfParse) {
        await loadPdfParse();
      }
      
      const pdfData = await pdfParse(Buffer.from(data), {
        // PDF parsing options
        max: options.maxPages,
        version: 'v1.10.88' // Specify version for consistency
      });

      const pages = this.extractPages(pdfData.text);
      const filteredPages = this.applyPageRange(pages, options.pageRange);
      
      const result: PDFParseResult = {
        text: filteredPages.join('\n\n'),
        pages: filteredPages,
        totalPages: pages.length,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
          modDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
        }
      };

      // Extract potential transaction lines if requested
      if (options.extractTransactionHints) {
        result.extractedTransactions = this.extractTransactionLines(result.text);
      }

      return result;

    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a PDF contains bank statement patterns
   */
  static async isBankStatement(file: File): Promise<boolean> {
    try {
      const result = await this.parseFile(file, { maxPages: 2 });
      return this.detectBankStatementPatterns(result.text);
    } catch {
      return false;
    }
  }

  /**
   * Extract structured transaction data from PDF text
   */
  static extractStructuredTransactions(text: string): Array<{
    line: string;
    confidence: number;
    potentialDate?: string;
    potentialAmount?: string;
    potentialVendor?: string;
  }> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 10);
    const transactions = [];

    for (const line of lines) {
      const confidence = this.scoreTransactionLine(line);
      
      if (confidence > 0.3) {
        const extracted = this.extractTransactionComponents(line);
        transactions.push({
          line,
          confidence,
          ...extracted
        });
      }
    }

    return transactions.sort((a, b) => b.confidence - a.confidence);
  }

  private static extractPages(text: string): string[] {
    // Try to split by page breaks or form feeds
    let pages = text.split(/\f|\n\s*Page \d+/i);
    
    // If no clear page breaks, split by large gaps
    if (pages.length === 1) {
      pages = text.split(/\n\s*\n\s*\n/);
    }
    
    return pages.filter(page => page.trim().length > 50); // Filter out very short pages
  }

  private static applyPageRange(pages: string[], range?: { start: number; end: number }): string[] {
    if (!range) return pages;
    
    const start = Math.max(0, range.start - 1); // Convert to 0-based index
    const end = Math.min(pages.length, range.end);
    
    return pages.slice(start, end);
  }

  private static extractTransactionLines(text: string): string[] {
    const lines = text.split('\n').map(line => line.trim());
    const transactionLines = [];

    for (const line of lines) {
      if (this.looksLikeTransaction(line)) {
        transactionLines.push(line);
      }
    }

    return transactionLines;
  }

  private static looksLikeTransaction(line: string): boolean {
    // Basic heuristics to identify transaction lines
    const hasDate = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(line);
    const hasAmount = /\$?\d+[\.,]\d{2}\b/.test(line);
    const hasVendor = /[a-zA-Z]{3,}/.test(line);
    
    // Must have at least date + amount, or amount + vendor
    return (hasDate && hasAmount) || (hasAmount && hasVendor);
  }

  private static detectBankStatementPatterns(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Common bank statement indicators
    const bankKeywords = [
      'account summary',
      'statement period',
      'beginning balance',
      'ending balance',
      'account number',
      'routing number',
      'transaction history',
      'deposits and credits',
      'checks and debits',
      'electronic transactions'
    ];

    let matchCount = 0;
    for (const keyword of bankKeywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }

    return matchCount >= 2; // Require at least 2 banking terms
  }

  private static scoreTransactionLine(line: string): number {
    let score = 0;
    
    // Date patterns
    if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(line)) {
      score += 0.3;
    }
    
    // Amount patterns (various formats)
    if (/\$?\d+[\.,]\d{2}\b/.test(line)) {
      score += 0.4;
    }
    
    // Negative amounts or debit indicators
    if (/-\$?\d+|\(\$?\d+\)/.test(line)) {
      score += 0.1;
    }
    
    // Vendor/merchant patterns
    if (/[A-Z]{2,}/.test(line)) { // All caps words (common in statements)
      score += 0.2;
    }
    
    // Transaction type indicators
    const transactionKeywords = [
      'purchase', 'payment', 'deposit', 'withdrawal', 'transfer', 
      'debit', 'credit', 'ach', 'check', 'atm'
    ];
    for (const keyword of transactionKeywords) {
      if (line.toLowerCase().includes(keyword)) {
        score += 0.1;
        break;
      }
    }
    
    // Line structure (has multiple components separated by spaces)
    const components = line.trim().split(/\s+/);
    if (components.length >= 3 && components.length <= 10) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private static extractTransactionComponents(line: string): {
    potentialDate?: string;
    potentialAmount?: string;
    potentialVendor?: string;
  } {
    // Extract date
    const dateMatch = line.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
    const potentialDate = dateMatch ? dateMatch[1] : undefined;
    
    // Extract amount
    const amountMatch = line.match(/\$?(\d+[\.,]\d{2})/);
    const potentialAmount = amountMatch ? amountMatch[1] : undefined;
    
    // Extract vendor (remove date and amount, take remaining text)
    let potentialVendor = line;
    if (dateMatch) {
      potentialVendor = potentialVendor.replace(dateMatch[0], '');
    }
    if (amountMatch) {
      potentialVendor = potentialVendor.replace(amountMatch[0], '');
    }
    
    potentialVendor = potentialVendor
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^[-\s]+|[-\s]+$/g, ''); // Remove leading/trailing dashes and spaces
    
    return {
      potentialDate,
      potentialAmount,
      potentialVendor: potentialVendor.length > 2 ? potentialVendor : undefined
    };
  }
}