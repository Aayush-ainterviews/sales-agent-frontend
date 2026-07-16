// Parse/serialize tabular data (JSON array-of-objects, or CSV/TSV) for the editable
// DataTable. All cell values are handled as strings for uniform editing; nested values
// are JSON-stringified on load.

export type Row = Record<string, string>
export interface Grid {
  columns: string[]
  rows: Row[]
}

// Where the DataTable panel gets its data.
export type TableSource =
  | { kind: 'file'; path: string }          // load + save back to a sandbox file
  | { kind: 'grid'; name: string; grid: Grid } // data lifted from a rendered markdown table
  | { kind: 'new' }                          // blank table the user fills in

// --- markdown table extraction (so "Show in table" works on tables the agent renders) ---

function stripMd(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$2') // [text](url) -> url (the useful data)
    .replace(/[*`_]/g, '')
    .trim()
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

const isSeparator = (line: string) => /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes('-')

// Find every GFM table in a markdown string, each with the nearest preceding heading/bold
// as its title. Returns editable grids.
export function parseMarkdownTables(md: string): { title: string; grid: Grid }[] {
  const lines = md.split('\n')
  const out: { title: string; grid: Grid }[] = []
  let lastHeading = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const h = line.match(/^#{1,6}\s+(.*)$/) || line.match(/^\*\*(.+)\*\*:?$/)
    if (h) { lastHeading = stripMd(h[1]); continue }
    if (line.startsWith('|') && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const header = splitRow(line).map(stripMd)
      const columns: string[] = []
      header.forEach((c, k) => {
        let name = c || `col${k + 1}`
        while (columns.includes(name)) name += '_'
        columns.push(name)
      })
      const rows: Row[] = []
      let j = i + 2
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        const cells = splitRow(lines[j])
        const row: Row = {}
        columns.forEach((c, k) => { row[c] = stripMd(cells[k] ?? '') })
        rows.push(row)
        j++
      }
      if (rows.length) out.push({ title: lastHeading || 'Table', grid: { columns, rows } })
      i = j - 1
    }
  }
  return out
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function fromJson(data: unknown): Grid {
  let arr: unknown[]
  if (Array.isArray(data)) arr = data
  else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const key = ['leads', 'rows', 'data', 'results', 'items'].find((k) => Array.isArray(obj[k]))
    arr = key ? (obj[key] as unknown[]) : [data]
  } else arr = [data]

  const columns: string[] = []
  const rows: Row[] = []
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      for (const k of Object.keys(o)) if (!columns.includes(k)) columns.push(k)
    }
  }
  if (columns.length === 0) columns.push('value')
  for (const item of arr) {
    const row: Row = {}
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>
      for (const c of columns) row[c] = cellToString(o[c])
    } else {
      row[columns[0]] = cellToString(item)
      for (const c of columns.slice(1)) row[c] = ''
    }
    rows.push(row)
  }
  return { columns, rows }
}

// RFC-4180-ish CSV/TSV parser: handles quoted fields, escaped quotes, embedded newlines.
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === delim) { row.push(field); field = ''; i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    field += c; i++
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function fromDelimited(text: string, delim: string): Grid {
  const cells = parseDelimited(text, delim).filter((r) => r.length && !(r.length === 1 && r[0] === ''))
  if (cells.length === 0) return { columns: ['value'], rows: [] }
  const columns = cells[0].map((c, i) => c || `col${i + 1}`)
  const rows: Row[] = cells.slice(1).map((r) => {
    const row: Row = {}
    columns.forEach((c, i) => { row[c] = r[i] ?? '' })
    return row
  })
  return { columns, rows }
}

export function parseTabular(text: string, path: string): Grid {
  const low = path.toLowerCase()
  if (low.endsWith('.tsv')) return fromDelimited(text, '\t')
  if (low.endsWith('.csv')) return fromDelimited(text, ',')
  try {
    return fromJson(JSON.parse(text))
  } catch {
    return fromDelimited(text, ',') // fall back to CSV for unknown extensions
  }
}

function escCsv(v: string, delim: string): string {
  return new RegExp(`["${delim === '\t' ? '\\t' : delim}\\n]`).test(v)
    ? '"' + v.replace(/"/g, '""') + '"'
    : v
}

export function toDelimited(grid: Grid, delim: string): string {
  const line = (vals: string[]) => vals.map((v) => escCsv(v, delim)).join(delim)
  return [line(grid.columns), ...grid.rows.map((r) => line(grid.columns.map((c) => r[c] ?? '')))].join('\n')
}

export function toCsv(grid: Grid): string {
  return toDelimited(grid, ',')
}

// Serialize back to the source file's format (JSON stays JSON; csv/tsv stay delimited).
export function serialize(grid: Grid, path: string): string {
  const low = path.toLowerCase()
  if (low.endsWith('.tsv')) return toDelimited(grid, '\t')
  if (low.endsWith('.csv')) return toDelimited(grid, ',')
  const objs = grid.rows.map((r) => {
    const o: Record<string, string> = {}
    for (const c of grid.columns) o[c] = r[c] ?? ''
    return o
  })
  return JSON.stringify(objs, null, 2)
}
