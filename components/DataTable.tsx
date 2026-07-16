'use client'

import { useEffect, useState } from 'react'
import { Loader2, X, Plus, Trash2, Download, Save, Table as TableIcon, ExternalLink } from 'lucide-react'
import { useBackendAuth } from '@/lib/useBackend'
import { fetchFileText, writeFile } from '@/lib/api'
import { parseTabular, serialize, toCsv, type Grid, type Row, type TableSource } from '@/lib/table'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'table'

// If a cell value is a URL or email, return an openable href (else null).
function linkHref(v: string): string | null {
  const s = v.trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^www\.[^\s]+$/i.test(s)) return 'https://' + s
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s
  return null
}

// Side panel: a fully editable grid over a sandbox file, a table lifted from the chat, or
// a blank new table. Edit cells, add/delete rows & columns, Save back, or Export CSV.
// Parent keys this by source so a new source remounts it (clean state, single load).
export default function DataTable({
  cid,
  source,
  onClose,
}: {
  cid: string
  source: TableSource
  onClose: () => void
}) {
  const getAuth = useBackendAuth()
  const [grid, setGrid] = useState<Grid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const fileName =
    source.kind === 'file' ? source.path.split('/').pop() || 'table'
    : source.kind === 'grid' ? `${slug(source.name)}.csv`
    : 'new-table.csv'
  const savePath =
    source.kind === 'file' ? source.path
    : source.kind === 'grid' ? `uploads/${slug(source.name)}.csv`
    : 'uploads/new-table.csv'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        if (source.kind === 'new') {
          if (!cancelled) setGrid({ columns: ['Column 1'], rows: [{ 'Column 1': '' }] })
          return
        }
        if (source.kind === 'grid') {
          if (!cancelled) setGrid({ columns: [...source.grid.columns], rows: source.grid.rows.map((r) => ({ ...r })) })
          return
        }
        const auth = await getAuth()
        if (cancelled) return
        if (!auth) { setError('not signed in'); return }
        const text = await fetchFileText(cid, auth, source.path)
        if (cancelled) return
        if (text == null) { setError('could not read file'); return }
        setGrid(parseTabular(text, source.path))
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- edits (immutable updates) ---
  const setCell = (ri: number, col: string, val: string) =>
    setGrid((g) => (g ? { ...g, rows: g.rows.map((r, i) => (i === ri ? { ...r, [col]: val } : r)) } : g))

  const addRow = () =>
    setGrid((g) => {
      if (!g) return g
      const row: Row = {}
      g.columns.forEach((c) => { row[c] = '' })
      return { ...g, rows: [...g.rows, row] }
    })

  const deleteRow = (ri: number) =>
    setGrid((g) => (g ? { ...g, rows: g.rows.filter((_, i) => i !== ri) } : g))

  const addColumn = () =>
    setGrid((g) => {
      if (!g) return g
      let n = g.columns.length + 1
      let name = `Column ${n}`
      while (g.columns.includes(name)) name = `Column ${++n}`
      return { columns: [...g.columns, name], rows: g.rows.map((r) => ({ ...r, [name]: '' })) }
    })

  const deleteColumn = (col: string) =>
    setGrid((g) => {
      if (!g) return g
      return {
        columns: g.columns.filter((c) => c !== col),
        rows: g.rows.map((r) => {
          const { [col]: _drop, ...rest } = r
          return rest
        }),
      }
    })

  const renameColumn = (oldName: string, newName: string) =>
    setGrid((g) => {
      if (!g) return g
      const name = newName.trim()
      if (!name || name === oldName || g.columns.includes(name)) return g
      return {
        columns: g.columns.map((c) => (c === oldName ? name : c)),
        rows: g.rows.map((r) => {
          const { [oldName]: val, ...rest } = r
          return { ...rest, [name]: val ?? '' }
        }),
      }
    })

  // --- save / export ---
  async function save() {
    if (!grid) return
    setSaving(true)
    setNote('')
    try {
      const auth = await getAuth()
      if (!auth) { setNote('not signed in'); return }
      const ok = await writeFile(cid, auth, savePath, serialize(grid, savePath))
      setNote(ok ? `Saved to ${savePath}` : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    if (!grid) return
    const blob = new Blob([toCsv(grid)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\.(json|tsv)$/i, '.csv').replace(/(\.csv)?$/i, '.csv')
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* header */}
      <div className="border-b border-border p-3 flex items-center gap-2 shrink-0">
        <TableIcon className="w-5 h-5 text-foreground" />
        <div className="min-w-0">
          <div className="font-serif font-bold text-foreground truncate">{fileName}</div>
          {grid && (
            <div className="text-xs text-muted-foreground">
              {grid.rows.length} rows · {grid.columns.length} cols
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => void save()}
            disabled={saving || !grid}
            className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
          <button
            onClick={exportCsv}
            disabled={!grid}
            className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={onClose} title="Close" className="p-1.5 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {note && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border shrink-0">{note}</div>
      )}

      {/* grid */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : error ? (
          <p className="p-4 text-sm text-red-500">{error}</p>
        ) : grid ? (
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-secondary">
              <tr>
                <th className="w-10 border border-border px-1 py-1 text-xs text-muted-foreground font-normal">#</th>
                {grid.columns.map((col) => (
                  <th key={col} className="border border-border p-0 min-w-[8rem]">
                    <div className="flex items-center">
                      <input
                        defaultValue={col}
                        onBlur={(e) => renameColumn(col, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="flex-1 min-w-0 bg-transparent px-2 py-1.5 font-medium text-foreground focus:outline-none focus:bg-background"
                      />
                      <button
                        onClick={() => deleteColumn(col)}
                        title="Delete column"
                        className="px-1 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="border border-border px-1">
                  <button onClick={addColumn} title="Add column" className="p-1 text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row, ri) => (
                <tr key={ri} className="group">
                  <td className="border border-border px-1 text-center text-xs text-muted-foreground align-middle">
                    <span className="group-hover:hidden">{ri + 1}</span>
                    <button
                      onClick={() => deleteRow(ri)}
                      title="Delete row"
                      className="hidden group-hover:inline text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  {grid.columns.map((col) => {
                    const href = linkHref(row[col] ?? '')
                    return (
                      <td key={col} className="border border-border p-0">
                        <div className="flex items-center min-w-[8rem]">
                          <input
                            value={row[col] ?? ''}
                            onChange={(e) => setCell(ri, col, e.target.value)}
                            className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-foreground focus:outline-none focus:bg-secondary"
                          />
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              title={`Open ${row[col]}`}
                              className="px-1 shrink-0 text-blue-600 dark:text-blue-400 hover:opacity-70"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="border border-border" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* footer */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={addRow}
          disabled={!grid}
          className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add row
        </button>
      </div>
    </div>
  )
}
