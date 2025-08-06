import { MappedTransaction } from '@/components/import/column-mapper';

export interface HashedTransaction extends MappedTransaction {
  hash: string;
  isDuplicate?: boolean;
}

export class TransactionHasher {
  /**
   * Generate SHA-1 hash for a transaction based on key fields
   * Uses date, amount, and normalized description for uniqueness
   */
  static async generateHash(transaction: MappedTransaction): Promise<string> {
    const normalizedData = this.normalizeTransactionData(transaction);
    const hashInput = `${normalizedData.date}|${normalizedData.amount}|${normalizedData.description}`;
    
    // Use Web Crypto API for SHA-1 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * Normalize transaction data for consistent hashing
   */
  private static normalizeTransactionData(transaction: MappedTransaction) {
    return {
      date: this.normalizeDate(transaction.date),
      amount: this.normalizeAmount(transaction.amount),
      description: this.normalizeDescription(transaction.description)
    };
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private static normalizeDate(date: string): string {
    if (!date) return '';
    
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Try to parse and format
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return date;
  }

  /**
   * Normalize amount to fixed decimal places
   */
  private static normalizeAmount(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toFixed(2);
  }

  /**
   * Normalize description by removing extra whitespace and converting to lowercase
   */
  private static normalizeDescription(description: string): string {
    if (!description) return '';
    
    return description
      .toLowerCase()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .replace(/[^\w\s.-]/g, '') // Remove special characters except periods, hyphens
      .substring(0, 100); // Limit length to avoid hash collisions from very long descriptions
  }

  /**
   * Process array of transactions and add hashes
   */
  static async addHashesToTransactions(transactions: MappedTransaction[]): Promise<HashedTransaction[]> {
    const hashedTransactions: HashedTransaction[] = [];
    const seenHashes = new Set<string>();
    
    for (const transaction of transactions) {
      const hash = await this.generateHash(transaction);
      const isDuplicate = seenHashes.has(hash);
      
      hashedTransactions.push({
        ...transaction,
        hash,
        isDuplicate
      });
      
      seenHashes.add(hash);
    }
    
    return hashedTransactions;
  }

  /**
   * Compare new transactions against existing hashes to detect duplicates
   */
  static async checkForDuplicates(
    newTransactions: MappedTransaction[], 
    existingHashes: Set<string>
  ): Promise<HashedTransaction[]> {
    const hashedTransactions: HashedTransaction[] = [];
    
    for (const transaction of newTransactions) {
      const hash = await this.generateHash(transaction);
      const isDuplicate = existingHashes.has(hash);
      
      hashedTransactions.push({
        ...transaction,
        hash,
        isDuplicate
      });
    }
    
    return hashedTransactions;
  }

  /**
   * Get unique transactions from a list, removing duplicates
   */
  static getUniqueTransactions(transactions: HashedTransaction[]): HashedTransaction[] {
    const uniqueTransactions: HashedTransaction[] = [];
    const seenHashes = new Set<string>();
    
    for (const transaction of transactions) {
      if (!seenHashes.has(transaction.hash)) {
        uniqueTransactions.push({
          ...transaction,
          isDuplicate: false
        });
        seenHashes.add(transaction.hash);
      }
    }
    
    return uniqueTransactions;
  }

  /**
   * Group transactions by duplicate status
   */
  static groupTransactionsByDuplicateStatus(transactions: HashedTransaction[]) {
    const unique: HashedTransaction[] = [];
    const duplicates: HashedTransaction[] = [];
    
    for (const transaction of transactions) {
      if (transaction.isDuplicate) {
        duplicates.push(transaction);
      } else {
        unique.push(transaction);
      }
    }
    
    return { unique, duplicates };
  }

  /**
   * Create a summary of duplicate detection results
   */
  static createDuplicateReport(transactions: HashedTransaction[]) {
    const { unique, duplicates } = this.groupTransactionsByDuplicateStatus(transactions);
    
    return {
      totalTransactions: transactions.length,
      uniqueTransactions: unique.length,
      duplicateTransactions: duplicates.length,
      duplicatePercentage: transactions.length > 0 
        ? Math.round((duplicates.length / transactions.length) * 100) 
        : 0
    };
  }
}