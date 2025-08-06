'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardImport } from '@/components/import/clipboard-import';
import { ColumnMapper, ColumnMapping, MappedTransaction } from '@/components/import/column-mapper';
import { RememberCategorization } from '@/components/import/remember-categorization';
import { TransactionsTable } from '@/components/transactions/transactions-table';
import { TransactionHasher, HashedTransaction } from '@/lib/transaction-hash';
import { ParseResult } from '@/lib/clipboard-parser';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload, MapPin, Brain, Table } from 'lucide-react';

type ImportStep = 'paste' | 'map' | 'categorize' | 'review';

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('paste');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappedTransactions, setMappedTransactions] = useState<MappedTransaction[]>([]);
  const [hashedTransactions, setHashedTransactions] = useState<HashedTransaction[]>([]);
  const [finalTransactions, setFinalTransactions] = useState<HashedTransaction[]>([]);

  // Sample categories for demo
  const sampleCategories = [
    'Groceries', 'Dining Out', 'Transportation', 'Utilities', 'Shopping',
    'Healthcare', 'Entertainment', 'Income', 'Rent', 'Insurance'
  ];

  const handleDataParsed = (result: ParseResult) => {
    setParseResult(result);
    if (result.rows.length > 0) {
      setCurrentStep('map');
    }
  };

  const handleMappingComplete = async (mapping: ColumnMapping, mappedData: MappedTransaction[]) => {
    setMappedTransactions(mappedData);
    
    // Add hashes to transactions for deduplication
    const hashed = await TransactionHasher.addHashesToTransactions(mappedData);
    setHashedTransactions(hashed);
    
    if (hashed.length > 0) {
      setCurrentStep('categorize');
    }
  };

  const handleCategorizationComplete = (categorizedTransactions: HashedTransaction[]) => {
    setFinalTransactions(categorizedTransactions);
    setCurrentStep('review');
  };

  const handleTransactionUpdate = (transaction: any) => {
    console.log('Transaction updated:', transaction);
    // In a real app, this would update the database
  };

  const handleTransactionDelete = (transactionId: string) => {
    setFinalTransactions(prev => prev.filter(t => t.hash !== transactionId));
  };

  const resetImport = () => {
    setCurrentStep('paste');
    setParseResult(null);
    setMappedTransactions([]);
    setHashedTransactions([]);
    setFinalTransactions([]);
  };

  const getStepTitle = (step: ImportStep) => {
    switch (step) {
      case 'paste': return 'Import Data';
      case 'map': return 'Map Columns';
      case 'categorize': return 'Categorize Transactions';
      case 'review': return 'Review & Save';
      default: return '';
    }
  };

  const getStepIcon = (step: ImportStep) => {
    switch (step) {
      case 'paste': return Upload;
      case 'map': return MapPin;
      case 'categorize': return Brain;
      case 'review': return Table;
      default: return Upload;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction Import</h1>
        <p className="text-gray-600">Import, map, and categorize your transactions</p>
      </div>

      {/* Progress Steps */}
      <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {(['paste', 'map', 'categorize', 'review'] as ImportStep[]).map((step, index) => {
                const Icon = getStepIcon(step);
                const isActive = currentStep === step;
                const isCompleted = (['paste', 'map', 'categorize', 'review'] as ImportStep[]).indexOf(currentStep) > index;
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isActive ? 'bg-blue-100 text-blue-700' :
                      isCompleted ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{getStepTitle(step)}</span>
                    </div>
                    {index < 3 && (
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 'paste' && (
          <ClipboardImport onDataParsed={handleDataParsed} />
        )}

        {currentStep === 'map' && parseResult && (
          <ColumnMapper
            headers={parseResult.headers}
            sampleRows={parseResult.rows.slice(0, 5)}
            onMappingComplete={handleMappingComplete}
          />
        )}

        {currentStep === 'categorize' && hashedTransactions.length > 0 && (
          <RememberCategorization
            transactions={hashedTransactions}
            categories={sampleCategories}
            onCategorizationComplete={handleCategorizationComplete}
          />
        )}

        {currentStep === 'review' && finalTransactions.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Complete!</CardTitle>
                <CardDescription>
                  Review your {finalTransactions.length} imported transactions below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={resetImport} variant="outline">
                    Import More
                  </Button>
                  <Button>
                    Save to Database
                  </Button>
                </div>
              </CardContent>
            </Card>

            <TransactionsTable
              transactions={finalTransactions}
              onTransactionUpdate={handleTransactionUpdate}
              onTransactionDelete={handleTransactionDelete}
              categories={sampleCategories}
            />
          </div>
        )}

        {/* Sample Data Helper */}
        {currentStep === 'paste' && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm">Need sample data to test?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Copy this sample CSV data to your clipboard, then click "Import from Clipboard":</p>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`Date,Description,Amount,Account
2024-01-15,WALMART SUPERCENTER,-125.43,Checking
2024-01-16,STARBUCKS COFFEE,-4.85,Credit Card
2024-01-17,PAYROLL DEPOSIT,2500.00,Checking
2024-01-18,SHELL GAS STATION,-45.20,Credit Card
2024-01-19,AMAZON PURCHASE,-89.99,Credit Card`}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}