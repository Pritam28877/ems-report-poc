'use client'

import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIFilledBadge } from './AIFilledBadge'
import type { FormField as FormFieldType } from '@/lib/types'

interface FormFieldProps {
  field: FormFieldType
  value: string | number | boolean | string[] | null | undefined
  onChange: (value: string | number | boolean | string[]) => void
  isAIFilled?: boolean
  aiConfidence?: number
  error?: string
  isHighlighted?: boolean
}

export function FormFieldRenderer({
  field,
  value,
  onChange,
  isAIFilled,
  aiConfidence,
  error,
  isHighlighted,
}: FormFieldProps) {
  const labelEl = (
    <div className="flex items-center gap-2">
      <Label htmlFor={field.key} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {isAIFilled && <AIFilledBadge confidence={aiConfidence} />}
    </div>
  )

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.key}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )

      case 'number':
        return (
          <Input
            id={field.key}
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={field.key}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="min-h-[100px] resize-y"
          />
        )

      case 'select':
        return (
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger id={field.key}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect': {
        const selected = Array.isArray(value) ? value : []
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5 text-sm transition-colors hover:border-primary/50"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, opt])
                    } else {
                      onChange(selected.filter((s) => s !== opt))
                    }
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        )
      }

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.key}
              checked={typeof value === 'boolean' ? value : false}
              onCheckedChange={(checked) => onChange(Boolean(checked))}
            />
            <Label htmlFor={field.key} className="text-sm text-muted-foreground font-normal cursor-pointer">
              {field.label}
            </Label>
          </div>
        )

      case 'datetime':
        return (
          <Input
            id={field.key}
            type="datetime-local"
            value={typeof value === 'string' ? value.slice(0, 16) : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      default:
        return (
          <Input
            id={field.key}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <motion.div
      layout
      className={`space-y-2 rounded-lg p-3 transition-all ${
        isHighlighted ? 'field-highlight' : ''
      }`}
    >
      {field.type !== 'checkbox' && labelEl}
      {renderInput()}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </motion.div>
  )
}
