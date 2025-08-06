'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionsTable } from '@/components/transactions/transactions-table';
import { supabase, Transaction } from '@/lib/supabase';
import { useAuth } from '@/components/providers';
import { HashedTransaction } from '@/lib/transaction-hash';
import { Plus, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<HashedTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadExpenseData();
    }
  }, [user]);

  const loadExpenseData = async () => {
    try {
      // Load expense transactions
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_income', false)
        .order('transaction_date', { ascending: false });

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

      // Convert transactions to HashedTransaction format
      const hashedTransactions: HashedTransaction[] = (transactionData || []).map(t => ({
        hash: t.hash || t.id,
        date: t.transaction_date,
        description: t.description,
        amount: Math.abs(t.amount) * -1, // Ensure expenses are negative
        account: accountData?.find(a => a.name)?.name,
        category: categoryData?.find(c => c.name)?.name,
        reference: t.vendor || '',
        isDuplicate: false,
        originalRow: {
          date: t.transaction_date,
          description: t.description,
          amount: t.amount.toString()
        }
      }));

      setTransactions(hashedTransactions);
      setCategories(categoryData?.map(c => c.name) || []);
      setAccounts(accountData?.map(a => a.name) || []);
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionUpdate = async (transaction: any) => {
    try {
      // Update transaction in database
      const { error } = await supabase
        .from('transactions')
        .update({
          description: transaction.description,
          amount: Math.abs(transaction.amount) * -1, // Keep negative for expenses
          transaction_date: transaction.date,
          vendor: transaction.reference
        })
        .eq('hash', transaction.hash);

      if (error) throw error;

      // Update local state
      setTransactions(prev => 
        prev.map(t => t.hash === transaction.hash ? { ...t, ...transaction } : t)
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleTransactionDelete = async (transactionHash: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('hash', transactionHash);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.hash !== transactionHash));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleBulkAdd = () => {
    // Navigate to import page
    window.location.href = '/import';
  };

  // Calculate expense statistics
  const totalExpenses = Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0));
  const thisMonthExpenses = Math.abs(transactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0));
  const avgMonthlyExpenses = totalExpenses / Math.max(1, new Date().getMonth() + 1);

  // Calculate category breakdown
  const categoryTotals: { [key: string]: number } = {};
  transactions.forEach(t => {
    if (t.category) {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    }
  });
  const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
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
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600">
                ${thisMonthExpenses.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingDown className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-2xl font-bold text-purple-600">
                ${avgMonthlyExpenses.toFixed(2)}
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

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Transactions</CardTitle>
          <CardDescription>
            All your expense transactions in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No expense transactions</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by importing your expense data.</p>
              <div className="mt-6">
                <Button onClick={handleBulkAdd} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Import Expense Transactions
                </Button>
              </div>
            </div>
          ) : (
            <TransactionsTable
              transactions={transactions}
              onTransactionUpdate={handleTransactionUpdate}
              onTransactionDelete={handleTransactionDelete}
              categories={categories}
              accounts={accounts}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}