import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface CategorySuggestion {
  name: string
  group: string
  default_budget: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { country, province_state, age } = await request.json()

    if (!country || !province_state || !age) {
      return NextResponse.json(
        { error: 'Missing required demographics data' },
        { status: 400 }
      )
    }

    // Call OpenAI GPT-4o-mini
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text())
      return NextResponse.json(
        { error: 'Failed to generate categories' },
        { status: 500 }
      )
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content received from AI' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let categories: CategorySuggestion[]
    try {
      categories = JSON.parse(content)
    } catch (error) {
      console.error('Failed to parse AI response:', content)
      // Fallback categories
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