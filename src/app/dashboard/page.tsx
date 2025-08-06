'use client'

import { useAuth } from '@/components/providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    } else {
      loadUserData()
    }
  }, [user])

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
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const incomeCategories = categories.filter(cat => cat.group_name === 'Income')
  const expenseCategories = categories.filter(cat => cat.group_name === 'Expenses')
  const totalIncome = incomeCategories.reduce((sum, cat) => sum + (cat.default_budget || 0), 0)
  const totalExpenses = expenseCategories.reduce((sum, cat) => sum + (cat.default_budget || 0), 0)
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budget Bop Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalIncome.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netSavings.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${Number(savingsRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {savingsRate}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Income Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incomeCategories.map(category => (
                  <div key={category.id} className="flex justify-between">
                    <span>{category.name}</span>
                    <span className="font-medium">${category.default_budget.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expenseCategories.map(category => (
                  <div key={category.id} className="flex justify-between">
                    <span>{category.name}</span>
                    <span className="font-medium">${category.default_budget.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <span>View Analytics</span>
                  <span className="text-xs opacity-60">Coming Soon</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  disabled
                >
                  <span className="text-lg">⚙️</span>
                  <span>Settings</span>
                  <span className="text-xs opacity-60">Coming Soon</span>
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <div className="text-sm text-gray-500">
                  Phase 0.3 (Import MVP) Complete ✅
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}