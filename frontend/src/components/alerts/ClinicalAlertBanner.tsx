'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SSEAlertData } from '@/lib/types'

interface ClinicalAlertBannerProps {
  alert: SSEAlertData
  requiresAcknowledgment?: boolean
  onAcknowledge?: () => void
}

export function ClinicalAlertBanner({
  alert,
  requiresAcknowledgment = false,
  onAcknowledge,
}: ClinicalAlertBannerProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const isCritical = alert.severity === 'critical'

  const handleAcknowledge = () => {
    setAcknowledged(true)
    onAcknowledge?.()
  }

  return (
    <AnimatePresence>
      {!acknowledged && (
        <motion.div
          initial={{ opacity: 0, y: -20, scaleY: 0.8 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`alert-pulse relative w-full overflow-hidden rounded-xl border ${
            isCritical
              ? 'border-destructive/50 bg-gradient-to-r from-red-950/80 to-red-900/50'
              : 'border-orange-500/50 bg-gradient-to-r from-orange-950/80 to-orange-900/50'
          }`}
        >
          {/* Pulsing left bar */}
          <div
            className={`absolute left-0 top-0 h-full w-1 ${
              isCritical ? 'bg-destructive' : 'bg-orange-500'
            }`}
          />

          <div className="flex items-start gap-4 px-6 py-4">
            {/* Icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isCritical ? 'bg-destructive/20' : 'bg-orange-500/20'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${isCritical ? 'text-destructive' : 'text-orange-400'}`}
              />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${
                    isCritical
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}
                >
                  {alert.severity}
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {alert.type}
                </h3>
              </div>
              <p className="mt-1 text-sm text-white/80">{alert.message}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {requiresAcknowledgment && !acknowledged && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcknowledge}
                  className={`gap-1.5 text-xs ${
                    isCritical
                      ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                      : 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Acknowledge
                </Button>
              )}
              {!requiresAcknowledgment && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleAcknowledge}
                  className="h-7 w-7 text-white/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {acknowledged && requiresAcknowledgment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-950/30 px-4 py-2 text-sm text-green-400"
        >
          <CheckCircle className="h-4 w-4" />
          Alert acknowledged: {alert.type}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
