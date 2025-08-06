'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DemographicsForm, DemographicsData } from '@/components/onboarding/demographics-form'
import { CategoryAIWizard, CategoryData } from '@/components/onboarding/category-ai-wizard'
import { supabase } from '@/lib/supabase'

type OnboardingStep = 'demographics' | 'categories'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('demographics')
  const [demographics, setDemographics] = useState<DemographicsData | null>(null)
  const [saving, setSaving] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  const handleDemographicsNext = (data: DemographicsData) => {
    setDemographics(data)
    setCurrentStep('categories')
  }

  const handleCategoriesBack = () => {
    setCurrentStep('demographics')
  }

  const handleCategoriesNext = async (categories: CategoryData[]) => {
    if (!session?.user?.id || !demographics) return

    setSaving(true)
    try {
      // Save profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          country: demographics.country,
          province_state: demographics.province_state,
          age: demographics.age,
          onboarding_complete: true,
        })

      if (profileError) throw profileError

      // Save categories
      const categoriesWithUserId = categories.map(cat => ({
        user_id: session.user.id,
        name: cat.name,
        group_name: cat.group,
        default_budget: cat.default_budget,
      }))

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categoriesWithUserId)

      if (categoriesError) throw categoriesError

      // Create default budgets for current month
      const currentDate = new Date()
      const budgets = categories.map(cat => ({
        user_id: session.user.id,
        category_id: cat.name, // This will need to be updated with actual category IDs
        amount: cat.default_budget,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      }))

      // We'll handle budgets after getting category IDs
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving onboarding data:', error)
      alert('Failed to save your information. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full flex justify-center">
        {currentStep === 'demographics' && (
          <DemographicsForm onNext={handleDemographicsNext} />
        )}
        {currentStep === 'categories' && demographics && (
          <CategoryAIWizard
            demographics={demographics}
            onNext={handleCategoriesNext}
            onBack={handleCategoriesBack}
          />
        )}
      </div>
      
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Setting up your budget...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}