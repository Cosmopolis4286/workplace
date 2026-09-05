// Exportación de datos a archivo — consolida el patrón Blob→createObjectURL
// →click→revokeObjectURL que antes vivía triplicado (reports.vue, sales.vue,
// useAnalytics.ts) y la construcción manual de CSV con comillas que vivía
// duplicada (StockReportModal.vue, inventory.vue).

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function dateStamp(): string {
  return new Date().toISOString().split('T')[0]
}

export function useDataExport() {
  function exportJSON(name: string, data: unknown) {
    if (data === null || data === undefined) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${name}-${dateStamp()}.json`)
  }

  function exportCSV(name: string, rows: Record<string, string | number>[]) {
    if (rows.length === 0) return
    const csv = [
      Object.keys(rows[0]).join(','),
      ...rows.map((row) => Object.values(row).map((v) => `"${v}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, `${name}-${dateStamp()}.csv`)
  }

  return { exportJSON, exportCSV }
}
