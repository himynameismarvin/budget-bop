'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleEditableTable, EditableTransaction } from '@/components/transactions/simple-editable-table';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/components/providers';
import { HashedTransaction } from '@/lib/transaction-hash';
import { Plus, TrendingDown, DollarSign, Calendar, PieChart, ChevronLeft, ChevronRight, Save, Loader2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM format
  
  // Month-specific save state
  const [unsavedRows, setUnsavedRows] = useState<Set<string>>(new Set());
  const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [originalTransactions, setOriginalTransactions] = useState<Map<string, EditableTransaction>>(new Map());

  // Navigation protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedRows.size > 0) {
        e.preventDefault();
        e.returnValue = `You have ${unsavedRows.size} unsaved changes. Leave anyway?`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedRows.size]);

  useEffect(() => {
    if (user) {
      loadExpenseData();
    }
  }, [user, selectedMonth]);

  const loadExpenseData = async () => {
    try {
      // Reset save state for new month
      setUnsavedRows(new Set());
      setSavedRows(new Set());
      setOriginalTransactions(new Map());

      // Load expense transactions for selected month with category and account names
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = `${selectedMonth}-01`;
      // Get the last day of the month properly
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${selectedMonth}-${lastDay.toString().padStart(2, '0')}`;
      
      console.log('Loading expenses for:', selectedMonth, 'Date range:', startDate, 'to', endDate);
      
      const { data: transactionData, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id(name),
          accounts:account_id(name)
        `)
        .eq('user_id', user?.id)
        .eq('is_income', false)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Found transactions:', transactionData?.length || 0);

      // Load categories (expense categories)
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user?.id)
        .eq('group_name', 'Expenses');

      // Load accounts
      const { data: accountData } = await supabase
        .from('accounts')
        .select('name')
        .eq('user_id', user?.id);

      // Convert transactions to EditableTransaction format
      const editableTransactions: EditableTransaction[] = (transactionData || []).map(t => ({
        id: t.id,
        date: t.transaction_date ? t.transaction_date.substring(0, 7) : '', // Convert to YYYY-MM format
        vendor: t.description || '',
        amount: Math.abs(t.amount).toString(), // Convert to string for input
        account: t.accounts?.name || '',
        category: t.categories?.name || '',
        notes: t.vendor || '',
        isNew: false
      }));

      console.log('Setting transactions for month:', selectedMonth, 'Count:', editableTransactions.length);
      setTransactions(editableTransactions);
      setCategories(categoryData?.map(c => c.name) || []);
      setAccounts(accountData?.map(a => a.name) || []);

      // Store original state for change tracking (only for new month loads)
      const originalMap = new Map();
      editableTransactions.forEach(transaction => originalMap.set(transaction.id, { ...transaction }));
      setOriginalTransactions(originalMap);

      // Mark existing transactions as saved
      const savedIds = editableTransactions
        .filter(t => !t.isNew && t.vendor && t.amount)
        .map(t => t.id);
      
      if (savedIds.length > 0) {
        setSavedRows(new Set(savedIds));
      }
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if transaction has changed from original state
  const hasTransactionChanged = (transaction: EditableTransaction): boolean => {
    const original = originalTransactions.get(transaction.id);
    if (!original) return true; // New transaction, consider it changed
    
    return (
      original.date !== transaction.date ||
      original.vendor !== transaction.vendor ||
      original.amount !== transaction.amount ||
      original.category !== transaction.category ||
      original.notes !== transaction.notes ||
      original.account !== transaction.account
    );
  };

  // Handle field changes
  const handleTransactionChange = (id: string, field: keyof EditableTransaction, value: string | number) => {
    setTransactions(prev => {
      return prev.map(transaction => {
        if (transaction.id === id) {
          const updatedTransaction = { ...transaction, [field]: value };
          
          // Update unsaved state
          if (hasTransactionChanged(updatedTransaction)) {
            setUnsavedRows(prev => new Set(prev).add(id));
            // Remove from saved if it was previously saved
            setSavedRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          } else {
            // No changes, remove from unsaved
            setUnsavedRows(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
          
          return updatedTransaction;
        }
        return transaction;
      });
    });
  };

  const handleTransactionDelete = async (transactionId: string) => {
    try {
      // Only delete from database if it's not a new row
      if (!transactionId.startsWith('new-')) {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId);

        if (error) throw error;
      }

      // Remove from all tracking sets
      setUnsavedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
      setSavedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
      setOriginalTransactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(transactionId);
        return newMap;
      });

      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Month-specific save function
  const handleSaveAll = async () => {
    if (unsavedRows.size === 0) return;

    setIsSaving(true);
    try {
      const unsavedTransactions = transactions.filter(t => unsavedRows.has(t.id));
      
      for (const transaction of unsavedTransactions) {
        // Only save if transaction has meaningful data
        if (!transaction.vendor || !transaction.amount) {
          continue;
        }

        const fullDate = transaction.date ? `${transaction.date}-01` : `${selectedMonth}-01`;
        const amountValue = transaction.amount ? parseInt(transaction.amount.toString()) * -1 : 0;

        // Get category ID
        let categoryId = null;
        if (transaction.category) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id')
            .eq('name', transaction.category)
            .eq('user_id', user?.id)
            .single();
          categoryId = categoryData?.id;
        }

        // Get account ID
        let accountId = null;
        if (transaction.account) {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('id')
            .eq('name', transaction.account)
            .eq('user_id', user?.id)
            .single();
          accountId = accountData?.id;
        }

        if (transaction.isNew || transaction.id.startsWith('new-')) {
          // Create new transaction
          const { data, error } = await supabase
            .from('transactions')
            .insert({
              user_id: user?.id,
              description: transaction.vendor,
              amount: amountValue,
              transaction_date: fullDate,
              vendor: transaction.notes || '',
              category_id: categoryId,
              account_id: accountId,
              is_income: false
            })
            .select()
            .single();

          if (error) throw error;

          // Update transaction with new ID
          const newId = data.id;
          setTransactions(prev => 
            prev.map(t => t.id === transaction.id 
              ? { ...t, id: newId, isNew: false }
              : t
            )
          );

          // Update tracking
          setOriginalTransactions(prev => {
            const newMap = new Map(prev);
            newMap.delete(transaction.id);
            newMap.set(newId, { ...transaction, id: newId, isNew: false });
            return newMap;
          });

          // Mark as saved with new ID
          setSavedRows(prev => new Set(prev).add(newId));
          setUnsavedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(transaction.id);
            return newSet;
          });
        } else {
          // Update existing transaction
          const { error } = await supabase
            .from('transactions')
            .update({
              description: transaction.vendor,
              amount: amountValue,
              transaction_date: fullDate,
              vendor: transaction.notes || '',
              category_id: categoryId,
              account_id: accountId
            })
            .eq('id', transaction.id);

          if (error) throw error;

          // Mark as saved
          setSavedRows(prev => new Set(prev).add(transaction.id));
          setUnsavedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(transaction.id);
            return newSet;
          });

          // Update original state
          setOriginalTransactions(prev => {
            const newMap = new Map(prev);
            newMap.set(transaction.id, { ...transaction, isNew: false });
            return newMap;
          });
        }
      }
    } catch (error) {
      console.error('Error saving transactions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAdd = () => {
    // Navigate to import page
    window.location.href = '/import';
  };

  const handleAddRow = () => {
    const newRow: EditableTransaction = {
      id: `new-${Date.now()}-${Math.random()}`,
      date: selectedMonth,
      vendor: '',
      amount: '',
      category: '',
      notes: '',
      account: '',
      isNew: true
    };
    
    setTransactions(prev => [...prev, newRow]);
    
    // Add to original transactions for change tracking
    setOriginalTransactions(prev => {
      const newMap = new Map(prev);
      newMap.set(newRow.id, { ...newRow });
      return newMap;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    // Check for unsaved changes
    if (unsavedRows.size > 0) {
      const confirmed = window.confirm(
        `You have ${unsavedRows.size} unsaved changes in ${formatMonthDisplay(selectedMonth)}. ` +
        'These changes will be lost if you navigate away. Continue anyway?'
      );
      if (!confirmed) {
        return; // Stay on current month
      }
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;
    
    if (direction === 'prev') {
      newMonth--;
      if (newMonth === 0) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth === 13) {
        newMonth = 1;
        newYear++;
      }
    }
    
    const newDate = `${newYear}-${newMonth.toString().padStart(2, '0')}`;
    setSelectedMonth(newDate);
  };

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    
    // Check for unsaved changes
    if (unsavedRows.size > 0 && newMonth !== selectedMonth) {
      const confirmed = window.confirm(
        `You have ${unsavedRows.size} unsaved changes in ${formatMonthDisplay(selectedMonth)}. ` +
        'These changes will be lost if you navigate away. Continue anyway?'
      );
      if (!confirmed) {
        return; // Keep current month
      }
    }
    
    setSelectedMonth(newMonth);
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Calculate expense statistics - useMemo ensures recalculation when transactions change
  const { totalExpenses, transactionCount, categoryTotals, topCategory } = useMemo(() => {
    const validTransactions = transactions.filter(t => !t.isNew && !t.id.startsWith('new-') && t.amount && t.amount !== '');
    const total = validTransactions.reduce((sum, t) => {
      const amount = parseInt(t.amount.toString()) || 0;
      return sum + Math.abs(amount);
    }, 0);

    // Calculate category breakdown
    const catTotals: { [key: string]: number } = {};
    validTransactions.forEach(t => {
      if (t.category && t.category !== '') {
        const amount = parseInt(t.amount.toString()) || 0;
        catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(amount);
      }
    });
    const topCat = Object.entries(catTotals).sort(([,a], [,b]) => b - a)[0];

    return {
      totalExpenses: total,
      transactionCount: validTransactions.length,
      categoryTotals: catTotals,
      topCategory: topCat
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-600" />
            Expenses
          </h1>
          <p className="text-gray-600">Track and manage your expenses</p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between py-8 px-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigateMonth('prev')}
          className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200"
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </Button>
        
        <div className="flex flex-col items-center">
          <label className="text-sm font-medium text-blue-700 mb-2">Viewing Month</label>
          <div 
            className="text-4xl font-bold text-blue-900 cursor-pointer hover:text-blue-700 transition-colors relative"
            onClick={() => {
              const input = document.getElementById('month-picker') as HTMLInputElement;
              input?.focus();
              input?.showPicker?.();
            }}
          >
            {formatMonthDisplay(selectedMonth)}
            <input
              id="month-picker"
              type="month"
              value={selectedMonth}
              onChange={handleMonthInputChange}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigateMonth('next')}
          className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200"
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Month Total</p>
              <p className="text-2xl font-bold text-red-600">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">
                {transactionCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingDown className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average/Day</p>
              <p className="text-2xl font-bold text-purple-600">
                ${transactionCount > 0 ? (totalExpenses / transactionCount).toFixed(2) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <PieChart className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Category</p>
              <p className="text-lg font-bold text-green-600">
                {topCategory ? topCategory[0] : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                ${topCategory ? topCategory[1].toFixed(2) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
            <CardDescription>Your spending across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categoryTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{category}</span>
                    <span className="text-red-600 font-bold">${amount.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Editable Transactions Table */}
      <SimpleEditableTable
        title="Expense Transactions"
        categories={categories}
        accounts={accounts}
        transactions={transactions}
        onTransactionChange={handleTransactionChange}
        onTransactionDelete={handleTransactionDelete}
        onAddRow={handleAddRow}
        defaultMonth={selectedMonth}
        unsavedRows={unsavedRows}
        savedRows={savedRows}
      />
      
      {/* Floating Controls - Positioned within content area */}
      <div className="sticky bottom-6 flex justify-center mt-8 z-50">
        <div className="flex gap-4">
          <Button 
            onClick={handleAddRow}
            variant="outline"
            className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg rounded-full px-6 py-3 flex items-center gap-2 border-gray-200"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          
          <Button 
            onClick={handleBulkAdd}
            variant="outline"
            className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg rounded-full px-6 py-3 flex items-center gap-2 border-gray-200"
          >
            <Download className="h-4 w-4" />
            Import
          </Button>
          
          <Button 
            onClick={handleSaveAll}
            disabled={unsavedRows.size === 0 || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full px-6 py-3 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {unsavedRows.size > 0 ? `Save ${unsavedRows.size} Changes` : 'No Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}