'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Budget Bop</h1>
          <p className="text-lg text-gray-600">Paste. Review. Decide.</p>
          <p className="text-sm text-gray-500 mt-2">
            Turn the once-a-month budgeting ritual into a five‑minute, clipboard‑powered web app
          </p>
        </div>
        
        <div>
          <Button 
            onClick={() => router.push('/auth/signin')}
            className="w-full"
          >
            Get Started
          </Button>
        </div>
      </div>
    </main>
  )
}