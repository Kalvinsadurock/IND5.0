import React, { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '../use-toast'
import type { OEECalculation, Machine } from '../types'

interface MonthlyDownloadButtonProps {
  data: OEECalculation[]
  machine: Machine
  dateFrom: string
  dateTo: string
  plantName: string
}

export function MonthlyDownloadButton({
  data,
  machine,
  dateFrom,
  dateTo,
  plantName,
}: MonthlyDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false)
  const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null)
  const [MonthlyReportPDF, setMonthlyReportPDF] = useState<any>(null)
  const { addToast } = useToast()

  useEffect(() => {
    setIsClient(true)
    // Dynamically import to avoid SSR errors during compilation
    Promise.all([
      import('@react-pdf/renderer'),
      import('./monthly-report-pdf'),
    ]).then(([pdfModule, docModule]) => {
      setPDFDownloadLink(() => pdfModule.PDFDownloadLink)
      setMonthlyReportPDF(() => docModule.MonthlyReportPDF)
    }).catch((err) => {
      console.error('Error loading PDF engine:', err)
    })
  }, [])

  if (!isClient || !PDFDownloadLink || !MonthlyReportPDF) {
    return (
      <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-900 text-slate-300" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  const fileName = `Periodic_OEE_Summary_${machine.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.pdf`

  return (
    <PDFDownloadLink
      document={
        <MonthlyReportPDF
          data={data}
          machine={machine}
          dateFrom={dateFrom}
          dateTo={dateTo}
          plantName={plantName}
        />
      }
      fileName={fileName}
      style={{ textDecoration: 'none', display: 'flex' }}
    >
      {({ loading }: { loading: boolean }) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
          disabled={loading}
          onClick={() => {
            if (!loading) {
              addToast({
                title: 'Summary Downloaded',
                description: 'Periodic OEE PDF report has been saved to your device.',
                variant: 'success',
              })
            }
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
