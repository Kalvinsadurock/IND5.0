import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OEECalculation, Machine, DowntimeEvent } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottom: '2px solid #10b981', // emerald color matching MES theme
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 15,
  },
  kpiCard: {
    width: '22%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f1f5f9',
    padding: 6,
  },
  col1: { width: '35%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '25%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  },
  signatureLine: {
    marginTop: 40,
    borderTop: '1px solid #94a3b8',
    width: 150,
    textAlign: 'center',
    paddingTop: 5,
    color: '#64748b',
  },
})

interface ShiftReportPDFProps {
  oee: OEECalculation
  machine: Machine
  downtimeEvents: DowntimeEvent[]
  shiftType: string
  operatorName: string
}

export function ShiftReportPDF({
  oee,
  machine,
  downtimeEvents,
  shiftType,
  operatorName,
}: ShiftReportPDFProps) {
  const dateStr = new Date(oee.calculated_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>OEE Shift Report</Text>
          <Text style={styles.subtitle}>
            Machine: {machine.name} • Shift {shiftType} • Date: {dateStr}
          </Text>
        </View>

        {/* KPI Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.grid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>OEE</Text>
              <Text style={styles.kpiValue}>{oee.oee.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Availability</Text>
              <Text style={styles.kpiValue}>{oee.availability.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Performance</Text>
              <Text style={styles.kpiValue}>{oee.performance.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Quality</Text>
              <Text style={styles.kpiValue}>{oee.quality.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Shift Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Production Summary</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operator Name</Text>
            <Text style={styles.infoValue}>{operatorName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ideal Cycle Time</Text>
            <Text style={styles.infoValue}>{machine.ideal_cycle_time_sec} sec</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operating Time</Text>
            <Text style={styles.infoValue}>{(oee.operating_time_min || 0).toFixed(1)} min</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Planned Duration</Text>
            <Text style={styles.infoValue}>{(oee.planned_downtime_min + oee.operating_time_min + oee.total_downtime_min - oee.planned_downtime_min).toFixed(1)} min</Text>
          </View>
        </View>

        {/* Downtime Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downtime Logs</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Reason</Text>
              <Text style={styles.col2}>Type</Text>
              <Text style={styles.col3}>Start Time</Text>
              <Text style={styles.col4}>Duration</Text>
            </View>
            {downtimeEvents.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>No downtime logged this shift</Text>
              </View>
            ) : (
              downtimeEvents.map((event, idx) => (
                <View key={event.id || idx} style={styles.tableRow}>
                  <Text style={styles.col1}>{event.notes || 'Downtime'}</Text>
                  <Text style={styles.col2}>{event.is_planned ? 'Planned' : 'Unplanned'}</Text>
                  <Text style={styles.col3}>
                    {new Date(event.start_time).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.col4}>{(event.duration_min || 0).toFixed(1)} min</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Signature Line */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 }}>
          <View>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 4, color: '#64748b' }}>Operator Signature</Text>
          </View>
          <View>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 4, color: '#64748b' }}>Supervisor Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>MES Unified OEE Module</Text>
          <Text>Audit-ready compliant with IATF 16949 requirements</Text>
        </View>
      </Page>
    </Document>
  )
}
