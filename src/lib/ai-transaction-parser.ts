export interface ParsedTransaction {
  id: string;
  date: string; // ISO date string
  vendor: string;
  originalVendor: string; // Keep original for reference
  amount: number; // In dollars, rounded
  description: string;
  category?: string; // Category if extracted from source data
  confidence: number; // 0-1 score for parsing confidence
  issues: string[]; // Array of potential issues to flag
  rawText?: string; // Original text that was parsed
}

export interface AIParsingResult {
  transactions: ParsedTransaction[];
  totalFound: number;
  successRate: number;
  errors: string[];
  warnings: string[];
}

export interface TransactionParsingRequest {
  text: string;
  format?: 'auto' | 'statement' | 'receipt' | 'csv_like';
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export class AITransactionParser {
  private static readonly API_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
  
  /**
   * Parse transactions from unstructured text using AI
   */
  static async parseTransactions(request: TransactionParsingRequest): Promise<AIParsingResult> {
    try {
      const response = await this.callAI(request);
      return this.processAIResponse(response, request.text);
    } catch (error) {
      console.error('AI parsing error:', error);
      return {
        transactions: [],
        totalFound: 0,
        successRate: 0,
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
        warnings: []
      };
    }
  }

  /**
   * Parse transactions from a batch of text data
   */
  static async parseTransactionsBatch(requests: TransactionParsingRequest[]): Promise<AIParsingResult[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.parseTransactions(request))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : {
            transactions: [],
            totalFound: 0,
            successRate: 0,
            errors: ['Batch processing failed'],
            warnings: []
          }
    );
  }

  private static async callAI(request: TransactionParsingRequest): Promise<any> {
    // For client-side usage, we'll make a call to our API route instead
    if (typeof window !== 'undefined') {
      // Client-side: use our API route
      const response = await fetch('/api/parse-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    }

    // Server-side: direct API call
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent parsing
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  }

  private static buildSystemPrompt(): string {
    return `You are an expert transaction parser. Extract financial transactions from unstructured text and return them as a JSON array.

REQUIRED OUTPUT FORMAT:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "vendor": "Clean vendor name",
      "originalVendor": "Exact vendor text from source",
      "amount": 123.45,
      "description": "Transaction description",
      "category": "Category name if provided in source data",
      "confidence": 0.95,
      "issues": ["any concerns"]
    }
  ]
}

PARSING RULES:
1. Extract date, vendor, amount (always positive numbers)
2. Round amounts to nearest dollar (drop cents)
3. Clean vendor names (remove location codes, transaction IDs, prefixes like "SQ *", "TST*")
4. Focus on month/year for dates - day is less important
5. Extract category if present (look for columns labeled "category", "type", or category-like emojis/text)
6. Set confidence 0.9+ for clear transactions, 0.7-0.9 for unclear, <0.7 for problematic
7. Flag issues like: "unclear_amount", "missing_vendor", "invalid_date", "possible_duplicate"
8. Handle common bank statement formats, receipts, CSV-like data

CATEGORY EXTRACTION:
- Look for category columns in CSV data (headers like "Category", "Type", "Class")
- Extract category emojis or descriptive text (e.g., "🏠 Insurance", "👶 Childcare", "🛒 Shopping")  
- If no explicit category column, leave category field empty (don't guess)

VENDOR CLEANING EXAMPLES:
- "AMZN Mktp CA*1234567890" → "Amazon"
- "SQ *COFFEE SHOP 12345" → "Coffee Shop"  
- "WAL-MART #3542" → "Walmart"
- "PAYPAL *NETFLIX" → "Netflix"
- "TST* STARBUCKS #1234" → "Starbucks"

Return only valid JSON. No explanations.`;
  }

  private static buildUserPrompt(request: TransactionParsingRequest): string {
    let prompt = `Parse transactions from this text:\n\n${request.text}`;
    
    if (request.format && request.format !== 'auto') {
      prompt += `\n\nFormat hint: ${request.format}`;
    }
    
    if (request.dateRange) {
      prompt += `\n\nExpected date range: ${request.dateRange.start || 'any'} to ${request.dateRange.end || 'any'}`;
    }
    
    return prompt;
  }

  private static processAIResponse(aiResponse: string, originalText: string): AIParsingResult {
    try {
      // Clean response - sometimes AI adds extra text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : aiResponse;
      
      const parsed = JSON.parse(cleanJson);
      const transactions = parsed.transactions || [];

      // Add IDs and additional processing
      const processedTransactions = transactions.map((tx: any, index: number) => {
        console.log(`🤖 Processing AI transaction ${index + 1}:`, tx);
        
        const processed = {
          id: crypto.randomUUID(),
          date: this.normalizeDate(tx.date),
          vendor: this.cleanVendorName(tx.vendor || tx.originalVendor || 'Unknown'),
          originalVendor: tx.originalVendor || tx.vendor || 'Unknown',
          amount: Math.round(Math.abs(parseFloat(tx.amount) || 0)),
          description: tx.description || tx.vendor || 'Transaction',
          category: tx.category || undefined, // INCLUDE CATEGORY FROM AI
          confidence: Math.min(1, Math.max(0, parseFloat(tx.confidence) || 0.5)),
          issues: this.validateTransaction(tx),
          rawText: this.extractRawText(originalText, tx, index)
        };
        
        console.log(`✅ Processed transaction ${index + 1}:`, processed);
        return processed;
      });

      const successRate = processedTransactions.length > 0 
        ? processedTransactions.reduce((sum: number, tx: ParsedTransaction) => sum + tx.confidence, 0) / processedTransactions.length 
        : 0;

      return {
        transactions: processedTransactions,
        totalFound: processedTransactions.length,
        successRate,
        errors: [],
        warnings: this.generateWarnings(processedTransactions)
      };

    } catch (error) {
      console.error('Failed to process AI response:', error);
      return {
        transactions: [],
        totalFound: 0,
        successRate: 0,
        errors: ['Failed to parse AI response'],
        warnings: []
      };
    }
  }

  private static normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try to parse common date formats
        const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
        const parsedDate = new Date(cleaned);
        return isNaN(parsedDate.getTime()) ? new Date().toISOString().split('T')[0] : parsedDate.toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private static cleanVendorName(vendor: string): string {
    return vendor
      .replace(/^(SQ \*|TST\*|PAYPAL \*)/i, '') // Remove common prefixes
      .replace(/\s*#\d+.*$/, '') // Remove location/store numbers
      .replace(/\s*\*\s*\w+$/, '') // Remove trailing codes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      || 'Unknown Vendor';
  }

  private static validateTransaction(tx: any): string[] {
    const issues: string[] = [];
    
    if (!tx.vendor || tx.vendor.toLowerCase().includes('unknown')) {
      issues.push('missing_vendor');
    }
    
    if (!tx.amount || parseFloat(tx.amount) <= 0) {
      issues.push('unclear_amount');
    }
    
    if (!tx.date || isNaN(new Date(tx.date).getTime())) {
      issues.push('invalid_date');
    }
    
    if ((tx.confidence || 0) < 0.7) {
      issues.push('low_confidence');
    }
    
    return issues;
  }

  private static extractRawText(originalText: string, tx: any, index: number): string {
    // Try to find the original line that this transaction came from
    const lines = originalText.split('\n');
    
    // Look for lines containing the vendor or amount
    const vendorPattern = new RegExp(tx.originalVendor || tx.vendor, 'i');
    const amountPattern = new RegExp(Math.abs(tx.amount).toString());
    
    for (const line of lines) {
      if (vendorPattern.test(line) || amountPattern.test(line)) {
        return line.trim();
      }
    }
    
    return lines[Math.min(index, lines.length - 1)] || '';
  }

  private static generateWarnings(transactions: ParsedTransaction[]): string[] {
    const warnings: string[] = [];
    
    if (transactions.length === 0) {
      warnings.push('No transactions found in the provided text');
    }
    
    const lowConfidenceCount = transactions.filter(tx => tx.confidence < 0.7).length;
    if (lowConfidenceCount > 0) {
      warnings.push(`${lowConfidenceCount} transactions have low confidence scores`);
    }
    
    const missingVendorCount = transactions.filter(tx => tx.issues.includes('missing_vendor')).length;
    if (missingVendorCount > 0) {
      warnings.push(`${missingVendorCount} transactions have unclear vendor names`);
    }
    
    return warnings;
  }
}