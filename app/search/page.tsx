'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import ChatPanel from '@/components/ChatPanel'
import DataTable from '@/components/DataTable'
import ConversationSidebar from '@/components/ConversationSidebar'
import { useBackendAuth } from '@/lib/useBackend'
import { listConversations, createConversation, deleteConversation, type Conversation } from '@/lib/api'
import { type TableSource } from '@/lib/table'
import { Search, ArrowLeft, Inbox, Shield, Table } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  const getAuth = useBackendAuth()

  // conversations (multi-session)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeCid, setActiveCid] = useState<string | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  // the conversation created for a ?q= search — its query auto-sends once
  const [queryConv, setQueryConv] = useState<{ cid: string; q: string } | null>(null)
  const bootstrapped = useRef(false)

  // side table panel
  const [table, setTable] = useState<{ id: number; source: TableSource } | null>(null)
  const tableId = useRef(0)
  const openTable = (source: TableSource) => setTable({ id: ++tableId.current, source })

  // resizable split (desktop): drag the divider to set the table panel's width
  const [tableWidth, setTableWidth] = useState(560)
  const splitRef = useRef<HTMLDivElement>(null)
  const onDrag = useCallback((e: MouseEvent) => {
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = rect.right - e.clientX
    setTableWidth(Math.max(320, Math.min(rect.width - 500, w)))
  }, [])
  const stopDrag = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
  }, [onDrag])
  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onDrag)
      window.addEventListener('mouseup', stopDrag)
    },
    [onDrag, stopDrag],
  )

  const refreshConversations = useCallback(async (): Promise<Conversation[]> => {
    const auth = await getAuth()
    if (!auth) return []
    const list = await listConversations(auth)
    setConversations(list)
    return list
  }, [getAuth])

  // bootstrap once: ?q= -> new chat that auto-sends; else open the most recent (or a new one)
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    ;(async () => {
      const auth = await getAuth()
      if (!auth) { setLoadingConvs(false); return }
      const list = await listConversations(auth)
      setConversations(list)
      if (query.trim()) {
        const cid = await createConversation(auth)
        if (cid) {
          setQueryConv({ cid, q: query })
          setActiveCid(cid)
          await refreshConversations()
        }
      } else if (list.length) {
        setActiveCid(list[0].id)
      } else {
        const cid = await createConversation(auth)
        if (cid) { setActiveCid(cid); await refreshConversations() }
      }
      setLoadingConvs(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onNew() {
    const auth = await getAuth()
    if (!auth) return
    const cid = await createConversation(auth)
    if (cid) {
      setTable(null) // a table belongs to a conversation's sandbox — don't carry it across
      setQueryConv(null)
      setActiveCid(cid)
      await refreshConversations()
    }
  }

  function onSelect(cid: string) {
    setTable(null)
    setQueryConv(null)
    setActiveCid(cid)
  }

  async function onDelete(cid: string) {
    const auth = await getAuth()
    if (!auth) return
    setTable(null)
    await deleteConversation(cid, auth)
    const list = await refreshConversations()
    if (cid === activeCid) {
      if (list.length) setActiveCid(list[0].id)
      else void onNew()
    }
  }

  async function onTurnComplete() {
    setQueryConv(null) // query turn done — don't re-send it if the chat remounts
    await refreshConversations()
  }

  const initialQuery = queryConv && queryConv.cid === activeCid ? queryConv.q : undefined

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
                <Search className="w-5 h-5 text-background" />
              </div>
              <span className="font-serif text-xl font-bold text-foreground">Sales Agent</span>
            </div>
          </Link>
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <Link href="/admin">
                <Button size="sm" variant="outline" className="gap-2">
                  <Shield className="w-4 h-4" /> Admin
                </Button>
              </Link>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => openTable({ kind: 'new' })}>
              <Table className="w-4 h-4" /> New table
            </Button>
            <Link href="/batches">
              <Button size="sm" variant="outline" className="gap-2">
                <Inbox className="w-4 h-4" /> Approvals
              </Button>
            </Link>
            <ThemeSwitcher />
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Home
              </Button>
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Sidebar + chat + optional resizable table */}
      <div ref={splitRef} className="flex-1 min-h-0 flex w-full">
        <div className="hidden md:block w-64 shrink-0 border-r border-border">
          <ConversationSidebar
            conversations={conversations}
            activeCid={activeCid}
            loading={loadingConvs}
            onSelect={onSelect}
            onNew={() => void onNew()}
            onDelete={(c) => void onDelete(c)}
          />
        </div>

        <div className={table ? 'hidden md:block flex-1 min-w-0 border-r border-border' : 'flex-1 min-w-0'}>
          {activeCid ? (
            <ChatPanel
              key={activeCid}
              cid={activeCid}
              initialQuery={initialQuery}
              onShowTable={openTable}
              onTurnComplete={() => void onTurnComplete()}
            />
          ) : (
            <div className="p-8 text-muted-foreground">Loading…</div>
          )}
        </div>

        {table && activeCid && (
          <>
            <div
              onMouseDown={startDrag}
              title="Drag to resize"
              className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-foreground/40 transition-colors"
            />
            <div
              className="w-full md:w-[var(--table-w)] min-w-0 shrink-0"
              style={{ ['--table-w' as string]: `${tableWidth}px` } as React.CSSProperties}
            >
              <DataTable key={table.id} cid={activeCid} source={table.source} onClose={() => setTable(null)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <SearchContent />
    </Suspense>
  )
}
