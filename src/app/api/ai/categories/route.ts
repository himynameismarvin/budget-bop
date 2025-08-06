import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CategorySuggestion {
  name: string
  group: string
  default_budget: number
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header to verify user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { country, province_state, age } = await request.json()

    if (!country || !province_state || !age) {
      return NextResponse.json(
        { error: 'Missing required demographics data' },
        { status: 400 }
      )
    }

    // Try GitHub API first, then fall back to default categories
    let categories: CategorySuggestion[]
    
    try {
      // Call GitHub Models API (free tier)
      const githubResponse = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor helping create budget categories. Return only valid JSON with an array of budget categories. Each category should have: name (string), group (string: "Income" or "Expenses"), and default_budget (number). Provide realistic budget amounts in local currency for the given demographics.'
            },
            {
              role: 'user',
              content: `Generate budget categories for someone living in ${province_state}, ${country}, age ${age}. Include both income and expense categories relevant to their location and life stage. Provide 15-20 categories total with realistic monthly budget amounts.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (githubResponse.ok) {
        const githubData = await githubResponse.json()
        const content = githubData.choices[0]?.message?.content

        if (content) {
          try {
            categories = JSON.parse(content)
          } catch (parseError) {
            console.warn('Failed to parse AI response, using defaults')
            categories = getDefaultCategories(country)
          }
        } else {
          categories = getDefaultCategories(country)
        }
      } else {
        console.warn('GitHub API failed, using defaults')
        categories = getDefaultCategories(country)
      }
    } catch (aiError) {
      console.warn('AI API error, using defaults:', aiError)
      categories = getDefaultCategories(country)
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getDefaultCategories(country: string): CategorySuggestion[] {
  const currencyMultiplier = country === 'United States' ? 1 : country === 'Canada' ? 1.3 : 1

  return [
    // Income
    { name: 'Salary', group: 'Income', default_budget: 5000 * currencyMultiplier },
    { name: 'Freelance', group: 'Income', default_budget: 1000 * currencyMultiplier },
    { name: 'Investment Income', group: 'Income', default_budget: 200 * currencyMultiplier },
    
    // Essential Expenses
    { name: 'Rent/Mortgage', group: 'Expenses', default_budget: 1500 * currencyMultiplier },
    { name: 'Utilities', group: 'Expenses', default_budget: 200 * currencyMultiplier },
    { name: 'Groceries', group: 'Expenses', default_budget: 600 * currencyMultiplier },
    { name: 'Transportation', group: 'Expenses', default_budget: 300 * currencyMultiplier },
    { name: 'Insurance', group: 'Expenses', default_budget: 250 * currencyMultiplier },
    { name: 'Phone/Internet', group: 'Expenses', default_budget: 100 * currencyMultiplier },
    
    // Discretionary Expenses
    { name: 'Dining Out', group: 'Expenses', default_budget: 300 * currencyMultiplier },
    { name: 'Entertainment', group: 'Expenses', default_budget: 200 * currencyMultiplier },
    { name: 'Shopping', group: 'Expenses', default_budget: 250 * currencyMultiplier },
    { name: 'Healthcare', group: 'Expenses', default_budget: 150 * currencyMultiplier },
    { name: 'Personal Care', group: 'Expenses', default_budget: 100 * currencyMultiplier },
    { name: 'Subscriptions', group: 'Expenses', default_budget: 50 * currencyMultiplier },
    
    // Savings & Investments
    { name: 'Emergency Fund', group: 'Expenses', default_budget: 500 * currencyMultiplier },
    { name: 'Retirement', group: 'Expenses', default_budget: 800 * currencyMultiplier },
    { name: 'Investments', group: 'Expenses', default_budget: 400 * currencyMultiplier },
  ]
}