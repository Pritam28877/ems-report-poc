'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchReports, fetchReport, createReport, updateReport } from '@/lib/api'
import type { CreateReportBody } from '@/lib/types'

export const REPORTS_KEY = ['reports'] as const

export function useReports(params?: {
  status?: string
  incident_type?: string
  search?: string
  page?: number
  per_page?: number
}) {
  return useQuery({
    queryKey: [...REPORTS_KEY, params],
    queryFn: () => fetchReports(params),
  })
}

export function useReport(id: number | null) {
  return useQuery({
    queryKey: [...REPORTS_KEY, id],
    queryFn: () => fetchReport(id!),
    enabled: id !== null && id > 0,
  })
}

export function useCreateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateReportBody) => createReport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY })
    },
  })
}

export function useUpdateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<CreateReportBody> & { status?: string } }) =>
      updateReport(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY })
      qc.invalidateQueries({ queryKey: [...REPORTS_KEY, variables.id] })
    },
  })
}
