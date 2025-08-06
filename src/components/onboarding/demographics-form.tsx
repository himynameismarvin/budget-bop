'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DemographicsFormProps {
  onNext: (data: DemographicsData) => void
}

export interface DemographicsData {
  country: string
  province_state: string
  age: number
}

export function DemographicsForm({ onNext }: DemographicsFormProps) {
  const [formData, setFormData] = useState<DemographicsData>({
    country: '',
    province_state: '',
    age: 0,
  })
  const [errors, setErrors] = useState<Partial<DemographicsData>>({})

  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Other'
  ]

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ]

  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ]

  const getProvinceStates = () => {
    if (formData.country === 'United States') return usStates
    if (formData.country === 'Canada') return canadianProvinces
    return []
  }

  const validateForm = () => {
    const newErrors: Partial<DemographicsData> = {}
    
    if (!formData.country) newErrors.country = 'Country is required'
    if (!formData.province_state) newErrors.province_state = 'Province/State is required'
    if (!formData.age || formData.age < 13 || formData.age > 120) {
      newErrors.age = 'Age must be between 13 and 120'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onNext(formData)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Tell us about yourself</CardTitle>
        <CardDescription>
          This helps us suggest relevant budget categories for your region and life stage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => {
                setFormData({ ...formData, country: value, province_state: '' })
                setErrors({ ...errors, country: undefined })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-600">{errors.country}</p>
            )}
          </div>

          {formData.country && (
            <div className="space-y-2">
              <Label htmlFor="province_state">
                {formData.country === 'United States' ? 'State' : 'Province/Region'}
              </Label>
              {formData.country === 'United States' || formData.country === 'Canada' ? (
                <Select
                  value={formData.province_state}
                  onValueChange={(value) => {
                    setFormData({ ...formData, province_state: value })
                    setErrors({ ...errors, province_state: undefined })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select your ${formData.country === 'United States' ? 'state' : 'province'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getProvinceStates().map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="province_state"
                  value={formData.province_state}
                  onChange={(e) => {
                    setFormData({ ...formData, province_state: e.target.value })
                    setErrors({ ...errors, province_state: undefined })
                  }}
                  placeholder="Enter your province/region"
                />
              )}
              {errors.province_state && (
                <p className="text-sm text-red-600">{errors.province_state}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min="13"
              max="120"
              value={formData.age || ''}
              onChange={(e) => {
                setFormData({ ...formData, age: parseInt(e.target.value) || 0 })
                setErrors({ ...errors, age: undefined })
              }}
              placeholder="Enter your age"
            />
            {errors.age && (
              <p className="text-sm text-red-600">{errors.age}</p>
            )}
          </div>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}