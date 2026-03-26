'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportTable } from '@/components/reports/ReportTable'
import { useReports } from '@/hooks/useReports'
import { useDebounce } from '@/hooks/useDebounce'

export default function ReportsPage() {
  const [search, setSearch] = useState('')
  const [incidentType, setIncidentType] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 350)

  const { data, isLoading, isError, refetch } = useReports({
    search: debouncedSearch || undefined,
    incident_type: incidentType === 'all' ? undefined : incidentType,
    status: status === 'all' ? undefined : status,
    page,
    per_page: 20,
  })

  const reports = data?.reports ?? []
  const totalPages = data?.total_pages ?? 1

  const clearFilters = () => {
    setSearch('')
    setIncidentType('all')
    setStatus('all')
    setPage(1)
  }

  const hasFilters = search || incidentType !== 'all' || status !== 'all'

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h2 className="text-2xl font-bold text-foreground">
          Medical <span className="text-gradient-cyan">Reports</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} total reports` : 'Loading...'}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search patient, location..."
                  className="pl-9"
                />
              </div>

              <Select value={incidentType} onValueChange={(v) => { setIncidentType(v); setPage(1) }}>
                <SelectTrigger className="w-44">
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Incident type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trauma">Trauma</SelectItem>
                  <SelectItem value="cardiac">Cardiac</SelectItem>
                  <SelectItem value="respiratory">Respiratory</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Reports{' '}
              {data && (
                <span className="font-normal text-muted-foreground">
                  ({reports.length} of {data.total})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed to load reports</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <ReportTable reports={reports} isLoading={isLoading} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
