'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutoCategorizer, AutoCategorizationResult, CategoryRule } from '@/lib/auto-categorizer';
import { HashedTransaction } from '@/lib/transaction-hash';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Lightbulb, 
  Target,
  TrendingUp,
  Settings,
  Trash2
} from 'lucide-react';

interface RememberCategorizationProps {
  transactions: HashedTransaction[];
  categories: string[];
  onCategorizationComplete: (categorizedTransactions: HashedTransaction[]) => void;
  onRulesUpdated?: (rules: CategoryRule[]) => void;
}

export function RememberCategorization({
  transactions,
  categories,
  onCategorizationComplete,
  onRulesUpdated
}: RememberCategorizationProps) {
  const [categorizer] = useState(() => new AutoCategorizer());
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);
  const [categorizedTransactions, setCategorizedTransactions] = useState<HashedTransaction[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<AutoCategorizationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLearningMode, setIsLearningMode] = useState(true);
  const [statistics, setStatistics] = useState({
    processed: 0,
    autoSuggested: 0,
    remembered: 0,
    accuracy: 0
  });

  // Initialize categorization when component mounts or transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      processCurrentTransaction();
    }
  }, [transactions, currentTransactionIndex]);

  const processCurrentTransaction = () => {
    if (currentTransactionIndex >= transactions.length) {
      // All transactions processed
      onCategorizationComplete(categorizedTransactions);
      return;
    }

    const transaction = transactions[currentTransactionIndex];
    if (!transaction.description) {
      // Skip transactions without description
      handleNextTransaction();
      return;
    }

    const suggestion = categorizer.categorizeTransaction(transaction.description);
    setCurrentSuggestion(suggestion);
    
    // Pre-select the suggested category if confidence is high
    if (suggestion.suggestedCategory && suggestion.confidence > 0.8) {
      setSelectedCategory(suggestion.suggestedCategory);
    } else {
      setSelectedCategory('');
    }
  };

  const handleAcceptSuggestion = () => {
    if (!currentSuggestion?.suggestedCategory) return;
    
    handleCategorySelection(currentSuggestion.suggestedCategory, true);
  };

  const handleRejectSuggestion = () => {
    setSelectedCategory('');
  };

  const handleCategorySelection = (category: string, wasAutoSuggested: boolean = false) => {
    const transaction = transactions[currentTransactionIndex];
    
    // Update the transaction with the selected category
    const updatedTransaction = {
      ...transaction,
      category
    };

    // Add to categorized transactions list
    const newCategorizedTransactions = [...categorizedTransactions, updatedTransaction];
    setCategorizedTransactions(newCategorizedTransactions);

    // Learn from this categorization if in learning mode
    if (isLearningMode && transaction.description) {
      const rejectedSuggestion = currentSuggestion?.suggestedCategory !== category 
        ? currentSuggestion?.suggestedCategory 
        : undefined;
      
      categorizer.learnFromCorrection(
        transaction.description,
        category,
        rejectedSuggestion
      );
    }

    // Update statistics
    setStatistics(prev => ({
      processed: prev.processed + 1,
      autoSuggested: prev.autoSuggested + (wasAutoSuggested ? 1 : 0),
      remembered: prev.remembered + (currentSuggestion?.matchedRule ? 1 : 0),
      accuracy: prev.processed > 0 ? Math.round(((prev.autoSuggested + (wasAutoSuggested ? 1 : 0)) / (prev.processed + 1)) * 100) : 0
    }));

    handleNextTransaction();
  };

  const handleNextTransaction = () => {
    setCurrentTransactionIndex(prev => prev + 1);
    setSelectedCategory('');
    setCurrentSuggestion(null);
  };

  const handleSkipTransaction = () => {
    const transaction = transactions[currentTransactionIndex];
    const skippedTransaction = { ...transaction };
    setCategorizedTransactions(prev => [...prev, skippedTransaction]);
    
    setStatistics(prev => ({
      ...prev,
      processed: prev.processed + 1
    }));

    handleNextTransaction();
  };

  const handleCreateNewCategory = (newCategory: string) => {
    if (newCategory && !categories.includes(newCategory)) {
      // This would typically update the categories list in the parent component
      console.log('Creating new category:', newCategory);
    }
    handleCategorySelection(newCategory);
  };

  const getCurrentTransaction = () => {
    return transactions[currentTransactionIndex];
  };

  const getProgressPercentage = () => {
    return transactions.length > 0 ? Math.round((currentTransactionIndex / transactions.length) * 100) : 0;
  };

  if (currentTransactionIndex >= transactions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Categorization Complete!
          </CardTitle>
          <CardDescription>
            All transactions have been processed and categorized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.processed}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.autoSuggested}</div>
              <div className="text-sm text-muted-foreground">Auto-Suggested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.remembered}</div>
              <div className="text-sm text-muted-foreground">From Memory</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>
          
          <Button 
            onClick={() => onRulesUpdated?.(categorizer.getRules())}
            className="w-full mt-4"
          >
            Save Learned Rules
          </Button>
        </CardContent>
      </Card>
    );
  }

  const transaction = getCurrentTransaction();

  return (
    <div className="space-y-6">
      {/* Progress and Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Transaction Categorization</h3>
              <p className="text-sm text-muted-foreground">
                {currentTransactionIndex + 1} of {transactions.length} transactions
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{getProgressPercentage()}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4 text-center">
            <div>
              <div className="font-semibold">{statistics.processed}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div>
              <div className="font-semibold text-blue-600">{statistics.autoSuggested}</div>
              <div className="text-xs text-muted-foreground">Auto-Suggested</div>
            </div>
            <div>
              <div className="font-semibold text-purple-600">{statistics.remembered}</div>
              <div className="text-xs text-muted-foreground">Remembered</div>
            </div>
            <div>
              <div className="font-semibold text-green-600">{statistics.accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Transaction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Categorize Transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <div className="font-mono">{transaction.date}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Amount</Label>
                <div className={`font-mono ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Description</Label>
                <div className="font-medium">{transaction.description}</div>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          {currentSuggestion && currentSuggestion.suggestedCategory && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">AI Suggestion</span>
                    {currentSuggestion.matchedRule && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Remembered
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-blue-600">
                    {Math.round(currentSuggestion.confidence * 100)}% confidence
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold text-blue-700">
                    {currentSuggestion.suggestedCategory}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handleAcceptSuggestion}
                    className="ml-auto"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleRejectSuggestion}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>

                {/* Alternative suggestions */}
                {currentSuggestion.alternatives.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <Label className="text-xs text-blue-600">Other suggestions:</Label>
                    <div className="flex gap-2 mt-1">
                      {currentSuggestion.alternatives.slice(0, 3).map((alt, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 px-2 text-blue-600 hover:bg-blue-100"
                          onClick={() => handleCategorySelection(alt.category, true)}
                        >
                          {alt.category} ({Math.round(alt.confidence * 100)}%)
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Category Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Or Create New</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="New category name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleCreateNewCategory(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="New category name"]') as HTMLInputElement;
                      if (input?.value.trim()) {
                        handleCreateNewCategory(input.value.trim());
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsLearningMode(!isLearningMode)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {isLearningMode ? 'Learning: ON' : 'Learning: OFF'}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleSkipTransaction}
                  className="text-muted-foreground"
                >
                  Skip
                </Button>
              </div>

              <Button
                onClick={() => selectedCategory && handleCategorySelection(selectedCategory)}
                disabled={!selectedCategory}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Categorize & Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}