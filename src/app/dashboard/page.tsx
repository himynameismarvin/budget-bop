'use client'

import { useAuth } from '@/components/providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    } else {
      loadUserData()
    }
  }, [user, selectedMonth])

  const loadUserData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (!profileData?.onboarding_complete) {
        router.push('/onboarding')
        return
      }

      setProfile(profileData)

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)

      setCategories(categoriesData || [])

      // Load transactions for selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      
      const { data: transactionData } = await supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id(name, group_name)
        `)
        .eq('user_id', user?.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      setTransactions(transactionData || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  // Calculate statistics from actual transaction data
  const { totalIncome, totalExpenses, netSavings, savingsRate, incomeTransactions, expenseTransactions } = useMemo(() => {
    const income = transactions
      .filter(t => t.is_income === true)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.is_income === false)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const net = income - expenses;
    const rate = income > 0 ? ((net / income) * 100).toFixed(1) : 0;
    
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      const categoryName = t.categories?.name || 'Uncategorized';
      const amount = Math.abs(t.amount);
      
      if (t.is_income) {
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount;
      } else {
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount;
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: net,
      savingsRate: rate,
      incomeTransactions: incomeByCategory,
      expenseTransactions: expenseByCategory
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="h-6 w-6 text-purple-600" />
            Dashboard
          </h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Month Income</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalIncome.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Month Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Savings</p>
              <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netSavings.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <PieChart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Savings Rate</p>
              <p className={`text-2xl font-bold ${Number(savingsRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {savingsRate}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Income by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(incomeTransactions)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">{category}</span>
                    <span className="text-green-600 font-bold">${amount.toFixed(2)}</span>
                  </div>
                ))}
              {Object.keys(incomeTransactions).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No income transactions this month</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(expenseTransactions)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">{category}</span>
                    <span className="text-red-600 font-bold">${amount.toFixed(2)}</span>
                  </div>
                ))}
              {Object.keys(expenseTransactions).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <TrendingDown className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No expense transactions this month</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => router.push('/income')}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <TrendingUp className="h-6 w-6" />
              <span>Manage Income</span>
            </Button>
            <Button 
              onClick={() => router.push('/expenses')}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <TrendingDown className="h-6 w-6" />
              <span>Manage Expenses</span>
            </Button>
            <Button 
              onClick={() => router.push('/import')}
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg">📥</span>
              <span>Import Transactions</span>
            </Button>
            <Button 
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
              disabled
            >
              <span className="text-lg">📊</span>
              <span>Analytics</span>
              <span className="text-xs opacity-60">Coming Soon</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}