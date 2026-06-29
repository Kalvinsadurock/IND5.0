import React, { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '../use-toast'
import type { OEECalculation, Machine, DowntimeEvent } from '../types'

interface PDFDownloadButtonProps {
  oee: OEECalculation
  machine: Machine
  downtimeEvents: DowntimeEvent[]
  shiftType: string
  operatorName: string
}

export function PDFDownloadButton({
  oee,
  machine,
  downtimeEvents,
  shiftType,
  operatorName,
}: PDFDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false)
  const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null)
  const [ShiftReportPDF, setShiftReportPDF] = useState<any>(null)
  const { addToast } = useToast()

  useEffect(() => {
    setIsClient(true)
    // Dynamically import @react-pdf/renderer to avoid SSR issues
    Promise.all([
      import('@react-pdf/renderer'),
      import('./shift-report-pdf'),
    ]).then(([pdfModule, docModule]) => {
      setPDFDownloadLink(() => pdfModule.PDFDownloadLink)
      setShiftReportPDF(() => docModule.ShiftReportPDF)
    }).catch((err) => {
      console.error('Error loading PDF engine:', err)
    })
  }, [])

  if (!isClient || !PDFDownloadLink || !ShiftReportPDF) {
    return (
      <Button variant="outline" className="flex-1 gap-2 border-slate-700 bg-slate-900 text-slate-300" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading PDF Engine
      </Button>
    )
  }

  const fileName = `OEE_Report_${machine.name.replace(/\s+/g, '_')}_Shift_${shiftType}_${new Date(oee.calculated_at).toISOString().split('T')[0]}.pdf`

  return (
    <PDFDownloadLink
      document={
        <ShiftReportPDF
          oee={oee}
          machine={machine}
          downtimeEvents={downtimeEvents}
          shiftType={shiftType}
          operatorName={operatorName}
        />
      }
      fileName={fileName}
      style={{ textDecoration: 'none', display: 'flex', flex: 1 }}
    >
      {({ loading }: { loading: boolean }) => (
        <Button
          variant="outline"
          className="w-full gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
          disabled={loading}
          onClick={() => {
            if (!loading) {
              addToast({
                title: 'Report Downloaded',
                description: 'PDF report has been saved to your device.',
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
              Download Report
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
