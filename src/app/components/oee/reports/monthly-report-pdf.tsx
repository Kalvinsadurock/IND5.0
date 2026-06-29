import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OEECalculation, Machine } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottom: '2px solid #10b981', // Green branding for monthly/periodic summaries matching MES theme
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 6,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    width: '22%',
    padding: 8,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCol: {
    width: '48%',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottom: '1px solid #f1f5f9',
  },
  infoLabel: {
    color: '#64748b',
  },
  infoValue: {
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    width: '100%',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f1f5f9',
    padding: 5,
  },
  col1: { width: '20%' },
  col2: { width: '16%', textAlign: 'right' },
  col3: { width: '16%', textAlign: 'right' },
  col4: { width: '16%', textAlign: 'right' },
  col5: { width: '16%', textAlign: 'right' },
  col6: { width: '16%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  },
  signatureLine: {
    marginTop: 30,
    borderTop: '1px solid #94a3b8',
    width: 120,
    textAlign: 'center',
    paddingTop: 4,
    color: '#64748b',
  },
})

interface MonthlyReportPDFProps {
  data: OEECalculation[]
  machine: Machine
  dateFrom: string
  dateTo: string
  plantName: string
}

export function MonthlyReportPDF({
  data,
  machine,
  dateFrom,
  dateTo,
  plantName,
}: MonthlyReportPDFProps) {
  const totalRecords = data.length
  const avgOEE = totalRecords > 0 ? data.reduce((s, r) => s + r.oee, 0) / totalRecords : 0
  const avgA = totalRecords > 0 ? data.reduce((s, r) => s + r.availability, 0) / totalRecords : 0
  const avgP = totalRecords > 0 ? data.reduce((s, r) => s + r.performance, 0) / totalRecords : 0
  const avgQ = totalRecords > 0 ? data.reduce((s, r) => s + r.quality, 0) / totalRecords : 0

  const totalDowntime = data.reduce((s, r) => s + r.total_downtime_min, 0)
  const plannedDowntime = data.reduce((s, r) => s + r.planned_downtime_min, 0)
  const operatingTime = data.reduce((s, r) => s + r.operating_time_min, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Periodic OEE Summary Report</Text>
          <Text style={styles.subtitle}>
            Plant: {plantName} • Machine: {machine.name} • Range: {dateFrom} to {dateTo}
          </Text>
        </View>

        {/* Overall KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators (Average)</Text>
          <View style={styles.grid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>OEE</Text>
              <Text style={styles.kpiValue}>{avgOEE.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Availability</Text>
              <Text style={styles.kpiValue}>{avgA.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Performance</Text>
              <Text style={styles.kpiValue}>{avgP.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Quality</Text>
              <Text style={styles.kpiValue}>{avgQ.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Metric Summaries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Shifts Checked</Text>
                <Text style={styles.infoValue}>{totalRecords}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Operating Time</Text>
                <Text style={styles.infoValue}>{operatingTime.toFixed(1)} min</Text>
              </View>
            </View>
            <View style={styles.summaryCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Downtime</Text>
                <Text style={styles.infoValue}>{totalDowntime.toFixed(1)} min</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Planned Downtime</Text>
                <Text style={styles.infoValue}>{plannedDowntime.toFixed(1)} min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shift History Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Performance Log</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Date</Text>
              <Text style={styles.col2}>OEE</Text>
              <Text style={styles.col3}>Avail</Text>
              <Text style={styles.col4}>Perf</Text>
              <Text style={styles.col5}>Qual</Text>
              <Text style={styles.col6}>Downtime</Text>
            </View>
            {data.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>No records found</Text>
              </View>
            ) : (
              data.slice(0, 20).map((row, idx) => (
                <View key={row.id || idx} style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {new Date(row.calculated_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.col2}>{row.oee.toFixed(1)}%</Text>
                  <Text style={styles.col3}>{row.availability.toFixed(1)}%</Text>
                  <Text style={styles.col4}>{row.performance.toFixed(1)}%</Text>
                  <Text style={styles.col5}>{row.quality.toFixed(1)}%</Text>
                  <Text style={styles.col6}>{row.total_downtime_min.toFixed(0)} min</Text>
                </View>
              ))
            )}
            {data.length > 20 && (
              <View style={styles.tableRow}>
                <Text style={{ color: '#64748b', fontStyle: 'italic', fontSize: 8 }}>
                  * Showing first 20 shifts. Total {data.length} shifts exported.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature Line */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
          <View>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 7, textAlign: 'center', marginTop: 3, color: '#64748b' }}>Operations Manager</Text>
          </View>
          <View>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 7, textAlign: 'center', marginTop: 3, color: '#64748b' }}>Plant Head Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>MES Unified OEE Module</Text>
          <Text>Compiled on {new Date().toLocaleDateString('en-IN')} • IATF 16949 Compliant</Text>
        </View>
      </Page>
    </Document>
  )
}
