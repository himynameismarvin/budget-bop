'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineEditableTable, EditableTransaction } from '@/components/transactions/inline-editable-table';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/components/providers';
import { HashedTransaction } from '@/lib/transaction-hash';
import { Plus, TrendingDown, DollarSign, Calendar, PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM format

  useEffect(() => {
    if (user) {
      loadExpenseData();
    }
  }, [user, selectedMonth]);

  const loadExpenseData = async () => {
    try {
      // Load expense transactions for selected month with category and account names
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      
      const { data: transactionData } = await supabase
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

      setTransactions(editableTransactions);
      setCategories(categoryData?.map(c => c.name) || []);
      setAccounts(accountData?.map(a => a.name) || []);
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSave = async (transaction: EditableTransaction): Promise<string | void> => {
    try {
      // Only save if transaction has meaningful data
      if (!transaction.vendor || !transaction.amount) {
        return;
      }

      // Convert month format to full date (first day of month) - use selected month if no date specified
      const fullDate = transaction.date ? `${transaction.date}-01` : `${selectedMonth}-01`;
      const amountValue = transaction.amount ? parseInt(transaction.amount.toString()) * -1 : 0; // Store as negative integer

      // Get category ID if category is selected
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

      // Get account ID if account is selected
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

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        // Return the new ID so the table can track it
        // (The table component will handle updating the local state)
        return data.id;
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

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        // Update local state - keep the transaction data for display
        setTransactions(prev => 
          prev.map(t => t.id === transaction.id 
            ? { ...transaction, isNew: false }
            : t
          )
        );
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
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

      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleBulkAdd = () => {
    // Navigate to import page
    window.location.href = '/import';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
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

  const formatMonthDisplay = (monthString: string) => {
    const date = new Date(monthString + '-01');
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
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-600" />
            Expenses
          </h1>
          <p className="text-gray-600">Track and manage your expenses</p>
        </div>
        <Button onClick={handleBulkAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Bulk Add
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-48 text-center text-lg font-semibold"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
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

      {/* Inline Editable Transactions Table */}
      <InlineEditableTable
        title="Expense Transactions"
        categories={categories}
        accounts={accounts}
        onTransactionSave={handleTransactionSave}
        onTransactionDelete={handleTransactionDelete}
        initialTransactions={transactions}
        onTransactionsChange={setTransactions}
        defaultMonth={selectedMonth}
      />
    </div>
  );
}