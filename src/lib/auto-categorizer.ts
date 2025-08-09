export interface CategoryRule {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  patterns: string[];
  isRegex?: boolean;
  isActive?: boolean;
  confidence?: number;
  createdAt?: Date;
  lastUsed?: Date;
  useCount?: number;
  isUserDefined?: boolean;
}

export interface AutoCategorizationResult {
  originalDescription: string;
  suggestedCategory?: string;
  matchedRule?: CategoryRule;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number; rule: CategoryRule }>;
}

export class AutoCategorizer {
  private rules: CategoryRule[] = [];
  private userCategories: string[] = [];
  private userId?: string;

  constructor(
    initialRules: CategoryRule[] = [],
    userCategories: string[] = [],
    userId?: string
  ) {
    this.rules = [...DEFAULT_RULES, ...initialRules];
    this.userCategories = userCategories;
    this.userId = userId;
  }

  /**
   * Update user categories and rules
   */
  updateUserData(userCategories: string[], userRules: CategoryRule[] = [], userId?: string) {
    this.userCategories = userCategories;
    this.userId = userId;
    
    // Remove existing user rules and add new ones
    this.rules = this.rules.filter(rule => !rule.isUserDefined);
    this.rules.push(...userRules);
  }

  /**
   * Add a new categorization rule
   */
  addRule(rule: Omit<CategoryRule, 'id' | 'createdAt' | 'useCount' | 'lastUsed'>): CategoryRule {
    const newRule: CategoryRule = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      useCount: 0,
      isActive: true,
      confidence: 0.8,
      ...rule
    };
    
    this.rules.push(newRule);
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<CategoryRule>): CategoryRule | null {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return null;
    
    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return this.rules[ruleIndex];
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    return this.rules.length < initialLength;
  }

  /**
   * Get all rules
   */
  getRules(): CategoryRule[] {
    return [...this.rules];
  }

  /**
   * Categorize a transaction description using user's categories
   */
  categorizeTransaction(description: string): AutoCategorizationResult {
    const normalizedDescription = this.normalizeDescription(description);
    const matches: Array<{ rule: CategoryRule; confidence: number }> = [];

    // Only consider rules that map to user's categories or are learning opportunities
    for (const rule of this.rules) {
      if (!rule.isActive) continue;
      
      // Skip default rules that don't match user's categories unless user has no categories
      if (!rule.isUserDefined && 
          this.userCategories.length > 0 && 
          !this.userCategories.includes(rule.category)) {
        continue;
      }

      const confidence = this.calculateMatchConfidence(normalizedDescription, rule);
      if (confidence > 0) {
        matches.push({ rule, confidence });
      }
    }

    // Sort by confidence and user preference
    matches.sort((a, b) => {
      // Prefer user-defined rules
      if (a.rule.isUserDefined && !b.rule.isUserDefined) return -1;
      if (!a.rule.isUserDefined && b.rule.isUserDefined) return 1;
      
      // Then by confidence
      if (Math.abs(a.confidence - b.confidence) < 0.1) {
        return b.rule.useCount! - a.rule.useCount!; // Prefer frequently used rules
      }
      return b.confidence - a.confidence;
    });

    const result: AutoCategorizationResult = {
      originalDescription: description,
      confidence: matches.length > 0 ? matches[0].confidence : 0,
      alternatives: matches.slice(1, 4).map(match => ({
        category: match.rule.category,
        confidence: match.confidence,
        rule: match.rule
      }))
    };

    if (matches.length > 0) {
      const bestMatch = matches[0];
      result.suggestedCategory = bestMatch.rule.category;
      result.matchedRule = bestMatch.rule;
      
      // Update rule usage statistics
      this.updateRuleUsage(bestMatch.rule.id);
    }

    return result;
  }

  /**
   * Batch categorize multiple transactions
   */
  categorizeTransactions(descriptions: string[]): AutoCategorizationResult[] {
    return descriptions.map(description => this.categorizeTransaction(description));
  }

  /**
   * Learn from user corrections to improve categorization
   */
  learnFromCorrection(description: string, correctCategory: string, rejectedSuggestion?: string) {
    // Only learn if the category is in the user's category list
    if (this.userCategories.length > 0 && !this.userCategories.includes(correctCategory)) {
      console.warn('Cannot learn correction: category not in user categories list', {
        correctCategory,
        userCategories: this.userCategories
      });
      return;
    }

    const normalizedDescription = this.normalizeDescription(description);
    
    // Extract key patterns from the description
    const patterns = this.extractPatterns(normalizedDescription);
    
    // Create or update a rule for this pattern
    const existingRule = this.findExistingUserRule(patterns, correctCategory);
    
    if (existingRule) {
      // Strengthen existing rule
      existingRule.confidence = Math.min(0.95, (existingRule.confidence || 0.8) + 0.1);
      existingRule.useCount = (existingRule.useCount || 0) + 1;
      existingRule.lastUsed = new Date();
    } else {
      // Create new user-defined rule
      this.addRule({
        name: `Auto-learned: ${patterns[0]}`,
        category: correctCategory,
        patterns,
        confidence: 0.8, // Higher confidence for user corrections
        isRegex: false,
        isUserDefined: true,
        user_id: this.userId
      });
    }

    // If user rejected a suggestion, lower confidence of the rule that made it
    if (rejectedSuggestion) {
      const rejectedRule = this.rules.find(rule => 
        rule.category === rejectedSuggestion && 
        this.calculateMatchConfidence(normalizedDescription, rule) > 0.5
      );
      
      if (rejectedRule && rejectedRule.confidence) {
        // Don't permanently damage default rules, just lower confidence temporarily
        if (rejectedRule.isUserDefined) {
          rejectedRule.confidence = Math.max(0.1, rejectedRule.confidence - 0.3);
        } else {
          rejectedRule.confidence = Math.max(0.3, rejectedRule.confidence - 0.1);
        }
      }
    }
  }

  /**
   * Get user-defined rules for database persistence
   */
  getUserDefinedRules(): CategoryRule[] {
    return this.rules.filter(rule => rule.isUserDefined);
  }

  /**
   * Load user-defined rules from database
   */
  loadUserRules(userRules: CategoryRule[]) {
    // Remove existing user rules
    this.rules = this.rules.filter(rule => !rule.isUserDefined);
    // Add loaded rules
    this.rules.push(...userRules.map(rule => ({ ...rule, isActive: rule.isActive !== false })));
  }

  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\d+/g, '#') // Replace numbers with #
      .replace(/[^\w\s#]/g, ' ') // Replace special chars with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private calculateMatchConfidence(description: string, rule: CategoryRule): number {
    let maxConfidence = 0;

    for (const pattern of rule.patterns) {
      let confidence = 0;

      if (rule.isRegex) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(description)) {
            confidence = rule.confidence || 0.8;
          }
        } catch (e) {
          // Invalid regex, skip
          continue;
        }
      } else {
        // Simple string matching with fuzzy logic
        const normalizedPattern = pattern.toLowerCase();
        
        if (description.includes(normalizedPattern)) {
          // Exact substring match
          confidence = rule.confidence || 0.8;
        } else {
          // Check for partial word matches
          const descriptionWords = description.split(/\s+/);
          const patternWords = normalizedPattern.split(/\s+/);
          
          let matchingWords = 0;
          for (const patternWord of patternWords) {
            for (const descWord of descriptionWords) {
              if (this.calculateWordSimilarity(descWord, patternWord) > 0.8) {
                matchingWords++;
                break;
              }
            }
          }
          
          const matchRatio = matchingWords / patternWords.length;
          if (matchRatio > 0.5) {
            confidence = (rule.confidence || 0.8) * matchRatio;
          }
        }
      }

      maxConfidence = Math.max(maxConfidence, confidence);
    }

    return maxConfidence;
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1;
    if (word1.length === 0 || word2.length === 0) return 0;
    
    // Simple edit distance-based similarity
    const maxLength = Math.max(word1.length, word2.length);
    const editDistance = this.editDistance(word1, word2);
    return Math.max(0, 1 - editDistance / maxLength);
  }

  private editDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private updateRuleUsage(ruleId: string) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.useCount = (rule.useCount || 0) + 1;
      rule.lastUsed = new Date();
    }
  }

  private extractPatterns(description: string): string[] {
    const words = description.split(/\s+/).filter(word => word.length > 2);
    const patterns: string[] = [];

    // Single significant words
    const significantWords = words.filter(word => 
      !COMMON_WORDS.has(word) && !word.includes('#')
    );
    patterns.push(...significantWords.slice(0, 3));

    // Two-word combinations
    for (let i = 0; i < Math.min(significantWords.length - 1, 2); i++) {
      patterns.push(`${significantWords[i]} ${significantWords[i + 1]}`);
    }

    return patterns.length > 0 ? patterns : [description];
  }

  private findExistingUserRule(patterns: string[], category: string): CategoryRule | undefined {
    return this.rules.find(rule => 
      rule.isUserDefined &&
      rule.category === category &&
      rule.patterns.some(rulePattern => 
        patterns.some(pattern => 
          rulePattern.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(rulePattern.toLowerCase())
        )
      )
    );
  }

  private findExistingRule(patterns: string[], category: string): CategoryRule | undefined {
    return this.rules.find(rule => 
      rule.category === category &&
      rule.patterns.some(rulePattern => 
        patterns.some(pattern => 
          rulePattern.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(rulePattern.toLowerCase())
        )
      )
    );
  }
}

// Default categorization rules
const DEFAULT_RULES: CategoryRule[] = [
  // Grocery & Food
  {
    id: 'grocery-1',
    name: 'Grocery Stores',
    category: 'Groceries',
    patterns: ['walmart', 'target', 'safeway', 'kroger', 'whole foods', 'trader joes', 'costco', 'sams club'],
    confidence: 0.9,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'restaurant-1',
    name: 'Restaurants',
    category: 'Dining Out',
    patterns: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'burger', 'pizza', 'chipotle'],
    confidence: 0.85,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Transportation
  {
    id: 'gas-1',
    name: 'Gas Stations',
    category: 'Transportation',
    patterns: ['shell', 'chevron', 'exxon', 'bp', 'mobil', 'gas station', 'fuel'],
    confidence: 0.9,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'transport-1',
    name: 'Public Transportation',
    category: 'Transportation',
    patterns: ['uber', 'lyft', 'taxi', 'metro', 'bus fare', 'parking', 'toll'],
    confidence: 0.9,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Utilities
  {
    id: 'utilities-1',
    name: 'Utilities',
    category: 'Utilities',
    patterns: ['electric', 'gas bill', 'water', 'internet', 'phone bill', 'cable', 'utility'],
    confidence: 0.9,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Shopping
  {
    id: 'shopping-1',
    name: 'Retail Shopping',
    category: 'Shopping',
    patterns: ['amazon', 'ebay', 'store', 'mall', 'retail', 'purchase'],
    confidence: 0.7,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Healthcare
  {
    id: 'healthcare-1',
    name: 'Healthcare',
    category: 'Healthcare',
    patterns: ['hospital', 'doctor', 'pharmacy', 'medical', 'clinic', 'dentist', 'cvs', 'walgreens'],
    confidence: 0.85,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Entertainment
  {
    id: 'entertainment-1',
    name: 'Entertainment',
    category: 'Entertainment',
    patterns: ['netflix', 'spotify', 'movie', 'theater', 'cinema', 'game', 'entertainment'],
    confidence: 0.8,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  },

  // Income patterns
  {
    id: 'salary-1',
    name: 'Salary',
    category: 'Income',
    patterns: ['salary', 'payroll', 'wages', 'direct deposit', 'paycheck'],
    confidence: 0.9,
    isActive: true,
    useCount: 0,
    createdAt: new Date()
  }
];

// Common words to ignore when creating patterns
const COMMON_WORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'among', 'under', 'over', 'payment', 'transaction', 'purchase',
  'sale', 'fee', 'charge', 'bill', 'debit', 'credit'
]);