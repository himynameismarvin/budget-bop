export interface VendorNormalizationRule {
  id: string;
  pattern: string;
  normalizedName: string;
  confidence: number;
  isRegex: boolean;
  isUserDefined: boolean;
  useCount: number;
  createdAt: Date;
  lastUsed?: Date;
}

export interface VendorNormalizationResult {
  originalName: string;
  normalizedName: string;
  confidence: number;
  rule?: VendorNormalizationRule;
  suggestions: Array<{
    name: string;
    confidence: number;
    rule: VendorNormalizationRule;
  }>;
  needsReview: boolean;
}

export interface VendorLearningData {
  originalName: string;
  userCorrectedName: string;
  context?: string; // Additional context about the transaction
}

export class VendorNormalizer {
  private rules: VendorNormalizationRule[] = [];
  private userLearningRules: Map<string, VendorNormalizationRule> = new Map();

  constructor(existingRules: VendorNormalizationRule[] = []) {
    this.rules = [...DEFAULT_NORMALIZATION_RULES, ...existingRules];
    this.updateUserLearningCache();
  }

  /**
   * Normalize a vendor name using rules and pattern matching
   */
  normalizeVendor(originalName: string): VendorNormalizationResult {
    const cleanedOriginal = this.preCleanVendorName(originalName);
    const matches = this.findMatchingRules(cleanedOriginal);

    if (matches.length === 0) {
      return {
        originalName,
        normalizedName: cleanedOriginal,
        confidence: 0.3, // Low confidence for no matches
        suggestions: [],
        needsReview: true
      };
    }

    // Sort by confidence and use count
    const sortedMatches = matches.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) < 0.1) {
        return b.rule.useCount - a.rule.useCount; // Prefer frequently used rules
      }
      return b.confidence - a.confidence;
    });

    const bestMatch = sortedMatches[0];
    
    // Update usage statistics
    this.updateRuleUsage(bestMatch.rule.id);

    return {
      originalName,
      normalizedName: bestMatch.name,
      confidence: bestMatch.confidence,
      rule: bestMatch.rule,
      suggestions: sortedMatches.slice(1, 4), // Top 3 alternatives
      needsReview: bestMatch.confidence < 0.8 || bestMatch.rule.isUserDefined === false
    };
  }

  /**
   * Batch normalize multiple vendor names
   */
  normalizeVendorsBatch(vendorNames: string[]): VendorNormalizationResult[] {
    return vendorNames.map(name => this.normalizeVendor(name));
  }

  /**
   * Learn from user corrections to improve future normalizations
   */
  learnFromCorrection(learningData: VendorLearningData): VendorNormalizationRule {
    const { originalName, userCorrectedName, context } = learningData;
    const cleanedOriginal = this.preCleanVendorName(originalName);
    
    // Check if we already have a rule for this pattern
    const existingRule = this.findExistingUserRule(cleanedOriginal, userCorrectedName);
    
    if (existingRule) {
      // Strengthen existing rule
      existingRule.confidence = Math.min(0.95, existingRule.confidence + 0.1);
      existingRule.useCount += 1;
      existingRule.lastUsed = new Date();
      return existingRule;
    }

    // Create new rule from user correction
    const patterns = this.extractPatternsFromCorrection(cleanedOriginal, userCorrectedName);
    const newRule: VendorNormalizationRule = {
      id: crypto.randomUUID(),
      pattern: patterns.primary,
      normalizedName: userCorrectedName,
      confidence: 0.9, // High confidence for user corrections
      isRegex: patterns.isRegex,
      isUserDefined: true,
      useCount: 1,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.rules.push(newRule);
    this.userLearningRules.set(cleanedOriginal.toLowerCase(), newRule);
    
    return newRule;
  }

  /**
   * Get suggestions for vendor names that need review
   */
  getSuggestionsForVendor(originalName: string, limit = 5): Array<{ name: string; confidence: number }> {
    const result = this.normalizeVendor(originalName);
    const suggestions = result.suggestions.slice(0, limit);
    
    // Add some common vendor corrections
    const commonSuggestions = this.getCommonVendorSuggestions(originalName);
    
    return [
      ...suggestions.map(s => ({ name: s.name, confidence: s.confidence })),
      ...commonSuggestions
    ].slice(0, limit);
  }

  /**
   * Export rules for database storage
   */
  exportRules(): VendorNormalizationRule[] {
    return this.rules.filter(rule => rule.isUserDefined);
  }

  /**
   * Import rules from database
   */
  importRules(rules: VendorNormalizationRule[]): void {
    // Remove existing user-defined rules and add new ones
    this.rules = this.rules.filter(rule => !rule.isUserDefined);
    this.rules.push(...rules);
    this.updateUserLearningCache();
  }

  private preCleanVendorName(name: string): string {
    return name
      // Remove common banking prefixes
      .replace(/^(SQ \*|TST\*|PAYPAL \*|POS |DDA |ATM )/gi, '')
      // Remove transaction IDs and codes
      .replace(/\s*[#*]\s*[\w\d]+/g, '')
      // Remove location codes in parentheses
      .replace(/\s*\([^)]*\)/, '')
      // Remove trailing alphanumeric codes
      .replace(/\s+[\w\d]{10,}$/, '')
      // Remove dates at the end
      .replace(/\s+\d{1,2}\/\d{1,2}$/, '')
      // Clean up spacing
      .replace(/\s+/g, ' ')
      .trim()
      || name; // Fallback to original if cleaning results in empty string
  }

  private findMatchingRules(vendorName: string): Array<{ name: string; confidence: number; rule: VendorNormalizationRule }> {
    const matches: Array<{ name: string; confidence: number; rule: VendorNormalizationRule }> = [];
    const lowerName = vendorName.toLowerCase();

    for (const rule of this.rules) {
      let confidence = 0;

      if (rule.isRegex) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(vendorName)) {
            confidence = rule.confidence;
          }
        } catch (e) {
          // Skip invalid regex patterns
          continue;
        }
      } else {
        const patternLower = rule.pattern.toLowerCase();
        
        if (lowerName === patternLower) {
          // Exact match
          confidence = Math.min(rule.confidence + 0.1, 1.0);
        } else if (lowerName.includes(patternLower) || patternLower.includes(lowerName)) {
          // Partial match
          const matchRatio = Math.min(patternLower.length, lowerName.length) / Math.max(patternLower.length, lowerName.length);
          confidence = rule.confidence * matchRatio;
        } else {
          // Check word-level similarity
          const similarity = this.calculateWordSimilarity(lowerName, patternLower);
          if (similarity > 0.7) {
            confidence = rule.confidence * similarity;
          }
        }
      }

      if (confidence > 0.3) { // Only include reasonable matches
        matches.push({
          name: rule.normalizedName,
          confidence,
          rule
        });
      }
    }

    return matches;
  }

  private calculateWordSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || (word1.length > 3 && word2.length > 3 && 
            (word1.includes(word2) || word2.includes(word1)))) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  private findExistingUserRule(originalName: string, correctedName: string): VendorNormalizationRule | undefined {
    const lowerOriginal = originalName.toLowerCase();
    return this.userLearningRules.get(lowerOriginal) || 
           this.rules.find(rule => 
             rule.isUserDefined && 
             rule.normalizedName.toLowerCase() === correctedName.toLowerCase() &&
             rule.pattern.toLowerCase().includes(lowerOriginal)
           );
  }

  private extractPatternsFromCorrection(original: string, corrected: string): { primary: string; isRegex: boolean } {
    // For now, use simple string patterns
    // Could be enhanced to create regex patterns for more complex cases
    const significantParts = original.split(/\s+/).filter(part => part.length > 2);
    const primaryPattern = significantParts[0] || original;
    
    return {
      primary: primaryPattern.toLowerCase(),
      isRegex: false
    };
  }

  private getCommonVendorSuggestions(originalName: string): Array<{ name: string; confidence: number }> {
    const suggestions: Array<{ name: string; confidence: number }> = [];
    const lowerName = originalName.toLowerCase();
    
    // Common vendor name corrections
    const commonMappings = [
      { pattern: 'amzn', suggestion: 'Amazon', confidence: 0.9 },
      { pattern: 'walmart', suggestion: 'Walmart', confidence: 0.9 },
      { pattern: 'target', suggestion: 'Target', confidence: 0.9 },
      { pattern: 'starbucks', suggestion: 'Starbucks', confidence: 0.9 },
      { pattern: 'mcdonalds', suggestion: "McDonald's", confidence: 0.9 },
    ];
    
    for (const mapping of commonMappings) {
      if (lowerName.includes(mapping.pattern)) {
        suggestions.push({
          name: mapping.suggestion,
          confidence: mapping.confidence
        });
      }
    }
    
    return suggestions;
  }

  private updateRuleUsage(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.useCount += 1;
      rule.lastUsed = new Date();
    }
  }

  private updateUserLearningCache(): void {
    this.userLearningRules.clear();
    for (const rule of this.rules) {
      if (rule.isUserDefined) {
        this.userLearningRules.set(rule.pattern.toLowerCase(), rule);
      }
    }
  }
}

// Default normalization rules for common vendors
const DEFAULT_NORMALIZATION_RULES: VendorNormalizationRule[] = [
  // Amazon variations
  {
    id: 'amazon-1',
    pattern: 'amzn',
    normalizedName: 'Amazon',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'amazon-2',
    pattern: 'amazon',
    normalizedName: 'Amazon',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Walmart variations
  {
    id: 'walmart-1',
    pattern: 'wal-mart',
    normalizedName: 'Walmart',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'walmart-2',
    pattern: 'walmart',
    normalizedName: 'Walmart',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Starbucks variations
  {
    id: 'starbucks-1',
    pattern: 'starbucks',
    normalizedName: 'Starbucks',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'starbucks-2',
    pattern: 'sbux',
    normalizedName: 'Starbucks',
    confidence: 0.9,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // McDonald's variations
  {
    id: 'mcdonalds-1',
    pattern: 'mcdonalds',
    normalizedName: "McDonald's",
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'mcdonalds-2',
    pattern: 'mcdonald',
    normalizedName: "McDonald's",
    confidence: 0.9,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Gas stations
  {
    id: 'shell-1',
    pattern: 'shell',
    normalizedName: 'Shell',
    confidence: 0.9,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },
  {
    id: 'chevron-1',
    pattern: 'chevron',
    normalizedName: 'Chevron',
    confidence: 0.9,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Netflix variations
  {
    id: 'netflix-1',
    pattern: 'netflix',
    normalizedName: 'Netflix',
    confidence: 0.95,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Target
  {
    id: 'target-1',
    pattern: 'target',
    normalizedName: 'Target',
    confidence: 0.9,
    isRegex: false,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  },

  // Square patterns (generic for small businesses)
  {
    id: 'square-1',
    pattern: '^sq \\*',
    normalizedName: 'Local Business', // Generic, user should correct
    confidence: 0.6,
    isRegex: true,
    isUserDefined: false,
    useCount: 0,
    createdAt: new Date()
  }
];