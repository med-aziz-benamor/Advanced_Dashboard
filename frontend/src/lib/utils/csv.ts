type Primitive = string | number | boolean | null | undefined

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function flattenRow(input: Record<string, unknown>, prefix = ''): Record<string, Primitive> {
  const result: Record<string, Primitive> = {}

  for (const key of Object.keys(input)) {
    const value = input[key]
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (Array.isArray(value)) {
      result[fullKey] = value.map((item) => (isObject(item) ? JSON.stringify(item) : String(item))).join('; ')
      continue
    }

    if (isObject(value)) {
      const nested = flattenRow(value, fullKey)
      Object.assign(result, nested)
      continue
    }

    result[fullKey] = value as Primitive
  }

  return result
}

function escapeCsv(value: Primitive): string {
  const raw = value == null ? '' : String(value)
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function downloadCsv(filename: string, rows: Record<string, any>[]): void {
  const flattened = rows.map((row) => flattenRow(row))
  const columnSet = new Set<string>()
  flattened.forEach((row) => {
    Object.keys(row).forEach((key) => columnSet.add(key))
  })

  const columns = Array.from(columnSet)
  if (columns.length === 0) {
    columns.push('empty')
  }

  const lines: string[] = []
  lines.push(columns.map((col) => escapeCsv(col)).join(','))

  for (const row of flattened) {
    const line = columns.map((col) => escapeCsv(row[col])).join(',')
    lines.push(line)
  }

  if (flattened.length === 0) {
    lines.push('')
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
