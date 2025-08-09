'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedImportUpload, FileUploadResult } from '@/components/import/enhanced-import-upload';
import { ColumnMapper, ColumnMapping, MappedTransaction } from '@/components/import/column-mapper';
import { TransactionReviewTable, ReviewableTransaction } from '@/components/import/transaction-review-table';
import { TransactionHasher, HashedTransaction } from '@/lib/transaction-hash';
import { ParseResult } from '@/lib/clipboard-parser';
import { AITransactionParser, ParsedTransaction } from '@/lib/ai-transaction-parser';
import { VendorNormalizer, VendorNormalizationResult } from '@/lib/vendor-normalizer';
import { AutoCategorizer, AutoCategorizationResult } from '@/lib/auto-categorizer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload, MapPin, Brain, Table, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ImportStep = 'upload' | 'parse' | 'normalize' | 'categorize' | 'review';

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [reviewableTransactions, setReviewableTransactions] = useState<ReviewableTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [vendorNormalizer, setVendorNormalizer] = useState<VendorNormalizer | null>(null);
  const [autoCategorizer, setAutoCategorizer] = useState<AutoCategorizer | null>(null);

  // Initialize services and load user data
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Load user categories from Supabase
        const { data: categories, error } = await supabase
          .from('categories')
          .select('name')
          .eq('user_id', session.user.id);
        
        if (error) {
          console.warn('Failed to load categories from database:', error);
        }
        
        const categoryNames = categories?.map(c => c.name) || [];
        
        if (categoryNames.length > 0) {
          setUserCategories(categoryNames);
        } else {
          // Use default categories if no user categories found
          setUserCategories([
            'Groceries', 'Dining Out', 'Transportation', 'Utilities', 'Shopping',
            'Healthcare', 'Entertainment', 'Income', 'Rent', 'Insurance'
          ]);
        }
      } else {
        // No user session - use default categories
        setUserCategories([
          'Groceries', 'Dining Out', 'Transportation', 'Utilities', 'Shopping',
          'Healthcare', 'Entertainment', 'Income', 'Rent', 'Insurance'
        ]);
      }

      // Initialize vendor normalizer
      const normalizer = new VendorNormalizer();
      setVendorNormalizer(normalizer);

      // Initialize auto-categorizer
      const categorizer = new AutoCategorizer();
      setAutoCategorizer(categorizer);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      // Use default categories as fallback
      setUserCategories([
        'Groceries', 'Dining Out', 'Transportation', 'Utilities', 'Shopping',
        'Healthcare', 'Entertainment', 'Income', 'Rent', 'Insurance'
      ]);
    }
  };

  const handleFileUploaded = async (result: FileUploadResult) => {
    setUploadResults(prev => [...prev, result]);
    
    // Auto-advance to processing if we have data
    if (result.structured || result.unstructured) {
      await processUploadedData([result]);
    }
  };

  const processUploadedData = async (results: FileUploadResult[]) => {
    if (!vendorNormalizer || !autoCategorizer) {
      setError('Services not initialized. Please refresh the page.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('parse');
    setError(null);

    try {
      const allTransactions: ParsedTransaction[] = [];

      for (const result of results) {
        setProcessingStatus(`Processing ${result.filename}...`);

        if (result.type === 'structured' && result.structured) {
          console.log('🔍 Processing structured data:', result.filename);
          console.log('📊 Sample row data:', result.structured.rows[0]);
          
          // Extract transactions from structured data with better date handling
          const extractedTransactions: ParsedTransaction[] = result.structured.rows.map((row, index) => {
            const extractedDate = extractDateFromRow(row);
            const extractedVendor = extractVendorFromRow(row);
            const extractedAmount = extractAmountFromRow(row);
            
            console.log(`📝 Row ${index + 1}:`, {
              date: extractedDate,
              vendor: extractedVendor,
              amount: extractedAmount,
              rawRow: row
            });
            
            return {
              id: crypto.randomUUID(),
              date: extractedDate || new Date().toISOString().split('T')[0],
              vendor: extractedVendor || 'Unknown Vendor',
              originalVendor: extractedVendor || 'Unknown Vendor',
              amount: Math.abs(parseFloat(extractedAmount) || 0),
              description: Object.values(row).join(' - '),
              confidence: 0.8,
              issues: extractedDate ? [] : ['Could not parse date from row'],
              rawText: Object.values(row).join(' | ')
            };
          });

          allTransactions.push(...extractedTransactions);
        } else if (result.type === 'unstructured' && result.unstructured?.aiParsed) {
          console.log('🤖 AI Parsed data found:', result.filename);
          console.log('🎯 AI extracted transactions:', result.unstructured.aiParsed.transactions?.length || 0);
          console.log('💫 AI parsing details:', result.unstructured.aiParsed);
          allTransactions.push(...(result.unstructured.aiParsed.transactions || []));
        }
      }

      setParsedTransactions(allTransactions);

      if (allTransactions.length > 0) {
        await normalizeAndCategorize(allTransactions);
      } else {
        setError('No transactions found in the uploaded data.');
        setCurrentStep('upload');
      }
    } catch (error) {
      setError(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const normalizeAndCategorize = async (transactions: ParsedTransaction[]) => {
    if (!vendorNormalizer || !autoCategorizer) return;

    setCurrentStep('normalize');
    setProcessingStatus('Normalizing vendor names...');

    try {
      const reviewable: ReviewableTransaction[] = [];

      for (const transaction of transactions) {
        // Normalize vendor name
        const vendorNormalization = vendorNormalizer.normalizeVendor(transaction.vendor);
        
        // Determine the best category - prefer AI-extracted over auto-categorization
        let finalCategory: string | undefined;
        let finalConfidence: number;
        
        // Check if AI extracted a category directly
        const aiExtractedCategory = transaction.category;
        
        console.log('🏷️ Category resolution for:', transaction.vendor, {
          aiExtractedCategory,
          transactionKeys: Object.keys(transaction),
          transactionValues: Object.entries(transaction),
          fullTransaction: transaction
        });
        
        console.log('🔍 Category matching check:', {
          aiExtractedCategory,
          userCategories,
          exactMatch: userCategories.includes(aiExtractedCategory || ''),
          hasAICategory: !!aiExtractedCategory
        });

        if (aiExtractedCategory) {
          // Check if AI category matches user categories (exact or partial match)
          let matchedCategory = userCategories.find(userCat => 
            // Exact match
            userCat === aiExtractedCategory ||
            // Partial match (e.g., "Mortgage" matches "🏦 Mortgage")
            aiExtractedCategory.toLowerCase().includes(userCat.toLowerCase()) ||
            userCat.toLowerCase().includes(aiExtractedCategory.toLowerCase())
          );

          if (matchedCategory || aiExtractedCategory) {
            // Use the matched user category or the AI category if no match
            finalCategory = matchedCategory || aiExtractedCategory;
            finalConfidence = matchedCategory ? 0.95 : 0.85; // Slightly lower confidence for non-matching categories
            console.log('✅ Using AI-extracted category:', finalCategory, matchedCategory ? '(matched user category)' : '(direct AI category)');
          } else {
            // Fallback to auto-categorization
            const categorization = autoCategorizer.categorizeTransaction(vendorNormalization.normalizedName);
            finalCategory = categorization.suggestedCategory;
            finalConfidence = categorization.confidence;
            console.log('🤖 Using auto-categorization (AI category not valid):', categorization);
          }
        } else {
          // No AI category, fallback to auto-categorization based on vendor
          const categorization = autoCategorizer.categorizeTransaction(vendorNormalization.normalizedName);
          finalCategory = categorization.suggestedCategory;
          finalConfidence = categorization.confidence;
          console.log('🤖 Using auto-categorization (no AI category):', categorization);
        }
        
        // Validate transaction and identify issues
        const validationErrors: string[] = [];
        if (!vendorNormalization.normalizedName || vendorNormalization.normalizedName === 'Unknown Vendor') {
          validationErrors.push('missing_vendor');
        }
        if (transaction.amount <= 0) {
          validationErrors.push('invalid_amount');
        }
        if (!transaction.date || isNaN(new Date(transaction.date).getTime())) {
          validationErrors.push('invalid_date');
        }

        // Check for potential duplicates (basic check based on date + amount + vendor)
        const isDuplicate = reviewable.some(existing => 
          existing.date === transaction.date &&
          existing.amount === transaction.amount &&
          existing.vendor === vendorNormalization.normalizedName
        );

        const reviewableTransaction: ReviewableTransaction = {
          ...transaction,
          vendor: vendorNormalization.normalizedName,
          vendorNormalization,
          suggestedCategory: finalCategory,
          categoryConfidence: finalConfidence,
          isDuplicate,
          validationErrors
        };

        reviewable.push(reviewableTransaction);
      }

      setReviewableTransactions(reviewable);
      setCurrentStep('review');
      setProcessingStatus('');
    } catch (error) {
      setError(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('upload');
    }
  };

  const handleTransactionUpdate = (transactionId: string, updates: Partial<ReviewableTransaction>) => {
    setReviewableTransactions(prev => 
      prev.map(tx => tx.id === transactionId ? { ...tx, ...updates } : tx)
    );
  };

  const handleTransactionDelete = (transactionId: string) => {
    setReviewableTransactions(prev => prev.filter(tx => tx.id !== transactionId));
  };

  const handleBulkUpdate = (transactionIds: string[], updates: Partial<ReviewableTransaction>) => {
    setReviewableTransactions(prev =>
      prev.map(tx => 
        transactionIds.includes(tx.id) ? { ...tx, ...updates } : tx
      )
    );
  };

  const handleSaveAll = async (transactions: ReviewableTransaction[]) => {
    setIsProcessing(true);
    setProcessingStatus('Saving transactions to database...');

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      const userId = session.user.id;
      let savedCount = 0;
      let categoryLookup: Map<string, string> = new Map();
      let defaultAccountId: string | null = null;

      // Load category mappings
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('group_name', 'Expenses');

      if (categoryData) {
        categoryData.forEach(cat => categoryLookup.set(cat.name, cat.id));
      }

      // Try to get default account (first account for user)
      // If no accounts exist, we'll proceed with null account_id
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (accountError || !accountData || accountData.length === 0) {
        defaultAccountId = null;
      } else {
        defaultAccountId = accountData[0].id;
      }

      // Save each transaction
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        setProcessingStatus(`Saving transaction ${i + 1} of ${transactions.length}...`);

        // Parse date - ensure it's in YYYY-MM-DD format
        const transactionDate = new Date(tx.date);
        if (isNaN(transactionDate.getTime())) {
          console.warn(`Invalid date for transaction: ${tx.date}, using today`);
          transactionDate.setTime(Date.now());
        }
        const dateString = transactionDate.toISOString().split('T')[0];

        // Get category ID, default to first expense category if not found
        let categoryId = tx.suggestedCategory ? categoryLookup.get(tx.suggestedCategory) : null;
        if (!categoryId && categoryLookup.size > 0) {
          categoryId = Array.from(categoryLookup.values())[0]; // Use first category as default
        }

        // Prepare transaction data
        const transactionData: any = {
          user_id: userId,
          description: tx.vendor,
          amount: -Math.abs(tx.amount), // Expenses are negative
          transaction_date: dateString,
          vendor: tx.notes || '',
          category_id: categoryId,
          is_income: false
        };

        // Only add account_id if we have one
        if (defaultAccountId) {
          transactionData.account_id = defaultAccountId;
        }

        // Insert transaction
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) {
          console.error(`Error saving transaction ${i + 1}:`, error);
          throw new Error(`Failed to save transaction "${tx.vendor}": ${error.message}`);
        }

        savedCount++;
      }
      
      // Learn from user corrections for future improvements
      if (vendorNormalizer && autoCategorizer) {
        for (const tx of transactions) {
          if (tx.isEdited && tx.vendor !== tx.originalVendor) {
            vendorNormalizer.learnFromCorrection({
              originalName: tx.originalVendor,
              userCorrectedName: tx.vendor
            });
          }
          
          if (tx.isEdited && tx.suggestedCategory) {
            autoCategorizer.learnFromCorrection(
              tx.vendor,
              tx.suggestedCategory,
              tx.categoryConfidence && tx.categoryConfidence < 0.8 ? 'low_confidence' : undefined
            );
          }
        }
      }

      // Reset to start for next import
      resetImport();
      alert(`Successfully saved ${savedCount} transactions! You can view them in the Expenses page.`);
    } catch (error) {
      setError(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const resetImport = () => {
    setCurrentStep('upload');
    setUploadResults([]);
    setParsedTransactions([]);
    setReviewableTransactions([]);
    setError(null);
    setProcessingStatus('');
  };

  // Helper methods for extracting data from structured rows
  const extractDateFromRow = (row: Record<string, string>): string | null => {
    const dateKeys = Object.keys(row).filter(key => 
      key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
    );
    
    console.log('🗓️ Looking for dates in keys:', dateKeys);
    
    for (const key of dateKeys) {
      const value = row[key];
      console.log(`📅 Checking date value: "${value}" from key: "${key}"`);
      
      if (value && value.trim()) {
        // Try parsing the date
        const parsedDate = new Date(value.trim());
        console.log(`🔍 Parsed date result:`, parsedDate, 'Valid:', !isNaN(parsedDate.getTime()));
        
        if (!isNaN(parsedDate.getTime())) {
          const dateString = parsedDate.toISOString().split('T')[0];
          console.log(`✅ Successfully extracted date: ${dateString}`);
          return dateString;
        }
        
        // Try common date formats if direct parsing fails
        const formats = [
          value.replace(/[\/\-\.]/g, '/'), // Normalize separators
          value.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'), // MM/DD/YYYY to YYYY-MM-DD
          value.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2})/, '20$3-$1-$2'), // MM/DD/YY to YYYY-MM-DD
        ];

        // Handle month/year format like "3/2023" -> "2023-03-01"
        const monthYearMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
        if (monthYearMatch) {
          const month = monthYearMatch[1].padStart(2, '0');
          const year = monthYearMatch[2];
          const dateString = `${year}-${month}-01`;
          console.log(`✅ Month/Year format converted: "${value}" -> "${dateString}"`);
          return dateString;
        }

        // Handle year/month format like "2023/3" -> "2023-03-01"
        const yearMonthMatch = value.match(/^(\d{4})\/(\d{1,2})$/);
        if (yearMonthMatch) {
          const year = yearMonthMatch[1];
          const month = yearMonthMatch[2].padStart(2, '0');
          const dateString = `${year}-${month}-01`;
          console.log(`✅ Year/Month format converted: "${value}" -> "${dateString}"`);
          return dateString;
        }
        
        for (const format of formats) {
          const testDate = new Date(format);
          if (!isNaN(testDate.getTime())) {
            const dateString = testDate.toISOString().split('T')[0];
            console.log(`✅ Date parsed with format conversion: ${dateString}`);
            return dateString;
          }
        }
      }
    }
    
    console.log('❌ No valid date found in row');
    return null;
  };

  const extractVendorFromRow = (row: Record<string, string>): string | null => {
    const vendorKeys = Object.keys(row).filter(key => 
      key.toLowerCase().includes('description') || 
      key.toLowerCase().includes('merchant') ||
      key.toLowerCase().includes('vendor') ||
      key.toLowerCase().includes('payee') ||
      key.toLowerCase().includes('name')
    );
    
    for (const key of vendorKeys) {
      const value = row[key];
      if (value && value.trim()) {
        return value.trim();
      }
    }
    
    return null;
  };

  const extractAmountFromRow = (row: Record<string, string>): string => {
    const amountKeys = Object.keys(row).filter(key => 
      key.toLowerCase().includes('amount') ||
      key.toLowerCase().includes('debit') ||
      key.toLowerCase().includes('credit') ||
      key.toLowerCase().includes('total')
    );
    
    for (const key of amountKeys) {
      const value = row[key];
      if (value && !isNaN(parseFloat(value))) {
        return value;
      }
    }
    
    // If no amount key found, look for any numeric value
    for (const [key, value] of Object.entries(row)) {
      if (value && !isNaN(parseFloat(value)) && parseFloat(value) !== 0) {
        return value;
      }
    }
    
    return '0';
  };

  const getStepTitle = (step: ImportStep) => {
    switch (step) {
      case 'upload': return 'Upload Data';
      case 'parse': return 'Parse Transactions';
      case 'normalize': return 'Normalize Vendors';
      case 'categorize': return 'Auto-Categorize';
      case 'review': return 'Review & Save';
      default: return '';
    }
  };

  const getStepIcon = (step: ImportStep) => {
    switch (step) {
      case 'upload': return Upload;
      case 'parse': return Brain;
      case 'normalize': return MapPin;
      case 'categorize': return Brain;
      case 'review': return Eye;
      default: return Upload;
    }
  };

  const getStepDescription = (step: ImportStep) => {
    switch (step) {
      case 'upload': return 'Upload files or paste data to begin import';
      case 'parse': return 'AI is extracting transactions from your data';
      case 'normalize': return 'Cleaning up vendor names and detecting issues';
      case 'categorize': return 'Auto-categorizing transactions';
      case 'review': return 'Review, edit, and save your transactions';
      default: return '';
    }
  };

  const allSteps: ImportStep[] = ['upload', 'parse', 'normalize', 'categorize', 'review'];
  const currentStepIndex = allSteps.indexOf(currentStep);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enhanced Transaction Import</h1>
        <p className="text-gray-600">Upload files, extract transactions with AI, and review before saving</p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {allSteps.map((step, index) => {
              const Icon = getStepIcon(step);
              const isActive = currentStep === step;
              const isCompleted = currentStepIndex > index;
              const isStepProcessing = isProcessing && isActive;
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive ? 'bg-blue-100 text-blue-700' :
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className={`h-4 w-4 ${isStepProcessing ? 'animate-spin' : ''}`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{getStepTitle(step)}</span>
                      {isActive && (
                        <span className="text-xs opacity-75">{getStepDescription(step)}</span>
                      )}
                    </div>
                  </div>
                  {index < allSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-2 hidden lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && processingStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="h-5 w-5 animate-pulse text-blue-600" />
            <span className="text-blue-800">{processingStatus}</span>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700 whitespace-pre-line">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetImport}
                className="mt-2"
              >
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <EnhancedImportUpload 
            onDataParsed={handleFileUploaded} 
            onError={setError}
          />
        </div>
      )}

      {currentStep === 'review' && reviewableTransactions.length > 0 && (
        <TransactionReviewTable
          transactions={reviewableTransactions}
          categories={userCategories}
          onTransactionUpdate={handleTransactionUpdate}
          onTransactionDelete={handleTransactionDelete}
          onBulkUpdate={handleBulkUpdate}
          onSaveAll={handleSaveAll}
          isLoading={isProcessing}
        />
      )}

      {/* Summary Card */}
      {(parsedTransactions.length > 0 || reviewableTransactions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 'review' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Brain className="h-5 w-5 text-blue-600" />
              )}
              Import Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResults.length}
                </div>
                <div className="text-sm text-gray-600">Files Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {parsedTransactions.length}
                </div>
                <div className="text-sm text-gray-600">Transactions Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {reviewableTransactions.filter(tx => tx.validationErrors.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Need Review</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {reviewableTransactions.filter(tx => tx.isEdited).length}
                </div>
                <div className="text-sm text-gray-600">User Edited</div>
              </div>
            </div>
            
            {currentStep !== 'review' && reviewableTransactions.length === 0 && (
              <div className="mt-4 flex gap-2">
                <Button onClick={resetImport} variant="outline">
                  Start Over
                </Button>
                {uploadResults.length > 0 && (
                  <Button 
                    onClick={() => processUploadedData(uploadResults)}
                    disabled={isProcessing}
                  >
                    Process All Files
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}