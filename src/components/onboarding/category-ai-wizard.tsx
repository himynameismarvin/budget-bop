'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DemographicsData } from './demographics-form'

interface CategoryAIWizardProps {
  demographics: DemographicsData
  onNext: (categories: CategoryData[]) => void
  onBack: () => void
}

export interface CategoryData {
  name: string
  group: string
  default_budget: number
}

export function CategoryAIWizard({ demographics, onNext, onBack }: CategoryAIWizardProps) {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateCategories()
  }, [])

  const generateCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demographics),
      })

      if (!response.ok) {
        throw new Error('Failed to generate categories')
      }

      const data = await response.json()
      setCategories(data.categories)
    } catch (err) {
      console.error('Error generating categories:', err)
      setError('Failed to generate budget categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateCategory = (index: number, field: keyof CategoryData, value: string | number) => {
    const updated = [...categories]
    updated[index] = { ...updated[index], [field]: value }
    setCategories(updated)
  }

  const addCategory = () => {
    setCategories([...categories, { name: '', group: 'Expenses', default_budget: 0 }])
  }

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    const validCategories = categories.filter(cat => cat.name.trim() !== '')
    if (validCategories.length === 0) {
      setError('Please add at least one category')
      return
    }
    onNext(validCategories)
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Generating personalized budget categories...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Your Budget Categories</CardTitle>
        <CardDescription>
          We've suggested categories based on your location and age. You can edit amounts, 
          add new categories, or remove ones you don't need.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateCategories}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Monthly Budget</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategory(index, 'name', e.target.value)}
                      placeholder="Category name"
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      value={category.group}
                      onChange={(e) => updateCategory(index, 'group', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Income">Income</option>
                      <option value="Expenses">Expenses</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={category.default_budget}
                      onChange={(e) => updateCategory(index, 'default_budget', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCategory(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={addCategory}>
            Add Category
          </Button>
          <Button variant="outline" onClick={generateCategories}>
            Regenerate Categories
          </Button>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Complete Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}