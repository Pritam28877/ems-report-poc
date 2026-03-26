'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FormFieldRenderer } from './FormField'
import type { FormField, SSEFieldFilledData } from '@/lib/types'
import { Loader2, Send } from 'lucide-react'

interface DynamicFormProps {
  fields: FormField[]
  onSubmit: (data: Record<string, unknown>, fields: Array<{ field_key: string; field_value: string | null; ai_filled: boolean; ai_confidence: number }>) => Promise<void>
  isSubmitting?: boolean
  // Called from outside to fill a field via SSE
  fillFieldRef?: React.MutableRefObject<((data: SSEFieldFilledData) => void) | null>
  aiFilledFields?: Record<string, { confidence: number }>
}

export function DynamicForm({
  fields,
  onSubmit,
  isSubmitting = false,
  fillFieldRef,
  aiFilledFields = {},
}: DynamicFormProps) {
  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<Record<string, unknown>>({
    defaultValues: fields.reduce((acc, f) => {
      acc[f.key] = f.value ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '')
      return acc
    }, {} as Record<string, unknown>),
  })

  const values = watch()
  const [highlighted, setHighlighted] = useState<Record<string, boolean>>({})
  const [localAIFilled, setLocalAIFilled] = useState<Record<string, { confidence: number }>>(aiFilledFields)

  const fillField = useCallback(
    (data: SSEFieldFilledData) => {
      const { field, value, confidence } = data
      setValue(field, value ?? '')
      setLocalAIFilled((prev) => ({ ...prev, [field]: { confidence } }))
      setHighlighted((prev) => ({ ...prev, [field]: true }))
      setTimeout(() => {
        setHighlighted((prev) => ({ ...prev, [field]: false }))
      }, 1600)
    },
    [setValue]
  )

  // Expose fillField to parent via ref
  useEffect(() => {
    if (fillFieldRef) fillFieldRef.current = fillField
  }, [fillField, fillFieldRef])

  const handleFormSubmit = handleSubmit(async (data) => {
    const fieldPayload = fields.map((f) => ({
      field_key: f.key,
      field_value: data[f.key] !== undefined && data[f.key] !== null
        ? Array.isArray(data[f.key])
          ? JSON.stringify(data[f.key])
          : String(data[f.key])
        : null,
      ai_filled: Boolean(localAIFilled[f.key]),
      ai_confidence: localAIFilled[f.key]?.confidence ?? 0,
    }))
    await onSubmit(data, fieldPayload)
  })

  // Group fields (first 3 = patient info, rest = clinical)
  const patientFields = fields.filter((f) =>
    ['patient_name', 'patient_age', 'patient_gender', 'incident_time', 'location', 'paramedic_name'].includes(f.key)
  )
  const clinicalFields = fields.filter((f) => !patientFields.includes(f))

  const renderSection = (sectionFields: FormField[], title: string) => (
    <div className="space-y-1">
      <h3 className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <Separator className="mb-3" />
      <div className="grid gap-1 sm:grid-cols-2">
        <AnimatePresence>
          {sectionFields.map((field) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
            >
              <FormFieldRenderer
                field={field}
                value={values[field.key] as string | number | boolean | string[] | null}
                onChange={(v) => setValue(field.key, v)}
                isAIFilled={Boolean(localAIFilled[field.key])}
                aiConfidence={localAIFilled[field.key]?.confidence}
                error={errors[field.key]?.message as string | undefined}
                isHighlighted={highlighted[field.key]}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {patientFields.length > 0 && renderSection(patientFields, 'Patient Information')}
      {clinicalFields.length > 0 && renderSection(clinicalFields, 'Clinical Details')}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 text-sm font-semibold"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Report...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Report
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
