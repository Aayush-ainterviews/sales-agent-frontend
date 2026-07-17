'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import ChatPanel from '@/components/ChatPanel'
import DataTable from '@/components/DataTable'
import BatchApprovalPanel from '@/components/BatchApprovalPanel'
import ConversationSidebar from '@/components/ConversationSidebar'
import { useBackendAuth } from '@/lib/useBackend'
import { listConversations, createConversation, deleteConversation, type Conversation } from '@/lib/api'
import { type TableSource } from '@/lib/table'
import { Search, ArrowLeft, Inbox, Shield, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const { user, isLoaded } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  const getAuth = useBackendAuth()

  // conversations (multi-session)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeCid, setActiveCid] = useState<string | null>(null)
  // set the active chat AND put it in the URL, so a refresh reopens the same one
  const setActive = useCallback(
    (cid: string) => {
      setActiveCid(cid)
      router.replace(`/search?c=${cid}`)
    },
    [router],
  )
  const [loadingConvs, setLoadingConvs] = useState(true)
  // the conversation created for a ?q= search — its query auto-sends once
  const [queryConv, setQueryConv] = useState<{ cid: string; q: string } | null>(null)
  const bootstrapped = useRef(false)

  // collapsible + resizable conversation sidebar (Claude-style)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(256)

  // side panel: an editable table OR a batch approval (only one open at a time)
  const [table, setTable] = useState<{ id: number; source: TableSource } | null>(null)
  const [batchPanelId, setBatchPanelId] = useState<string | null>(null)
  const tableId = useRef(0)
  const openTable = (source: TableSource) => {
    setBatchPanelId(null)
    setTable({ id: ++tableId.current, source })
  }
  const openBatch = (id: string) => {
    setTable(null)
    setBatchPanelId(id)
  }
  const rightOpen = !!table || !!batchPanelId
  const closeRight = () => {
    setTable(null)
    setBatchPanelId(null)
  }

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

  // sidebar resize (left edge): width = mouse X from the split's left
  const onDragSidebar = useCallback((e: MouseEvent) => {
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    setSidebarWidth(Math.max(200, Math.min(460, e.clientX - rect.left)))
  }, [])
  const stopDragSidebar = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onDragSidebar)
    window.removeEventListener('mouseup', stopDragSidebar)
  }, [onDragSidebar])
  const startDragSidebar = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onDragSidebar)
      window.addEventListener('mouseup', stopDragSidebar)
    },
    [onDragSidebar, stopDragSidebar],
  )

  const refreshConversations = useCallback(async (): Promise<Conversation[]> => {
    const auth = await getAuth()
    if (!auth) return []
    const list = await listConversations(auth)
    setConversations(list)
    return list
  }, [getAuth])

  // bootstrap once, but ONLY after Clerk is loaded — on a hard refresh the auth isn't ready
  // on first mount, so getAuth() would return null and we'd bail to a blank screen forever.
  useEffect(() => {
    if (!isLoaded || bootstrapped.current) return
    bootstrapped.current = true
    ;(async () => {
      const auth = await getAuth()
      if (!auth) { setLoadingConvs(false); return }
      const wantCid = searchParams.get('c') || ''
      const list = await listConversations(auth)
      setConversations(list)
      if (query.trim()) {
        // arriving from a home search -> a brand-new chat that auto-sends the query
        const cid = await createConversation(auth)
        if (cid) {
          setQueryConv({ cid, q: query })
          setActive(cid)
          await refreshConversations()
        }
      } else if (wantCid && list.some((x) => x.id === wantCid)) {
        setActive(wantCid)              // refresh -> reopen the same chat + its history
      } else if (list.length) {
        setActive(list[0].id)            // otherwise the most recently active
      } else {
        const cid = await createConversation(auth)
        if (cid) { setActive(cid); await refreshConversations() }
      }
      setLoadingConvs(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  async function onNew() {
    const auth = await getAuth()
    if (!auth) return
    const cid = await createConversation(auth)
    if (cid) {
      closeRight() // panels belong to a conversation's context — don't carry them across
      setQueryConv(null)
      setActive(cid)
      await refreshConversations()
    }
  }

  function onSelect(cid: string) {
    closeRight()
    setQueryConv(null)
    setActive(cid)
  }

  async function onDelete(cid: string) {
    const auth = await getAuth()
    if (!auth) return
    closeRight()
    await deleteConversation(cid, auth)
    const list = await refreshConversations()
    if (cid === activeCid) {
      if (list.length) setActive(list[0].id)
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? 'Hide chats' : 'Show chats'}
              className="p-2 rounded-lg hover:bg-secondary text-foreground transition"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <Link href="/">
              <div className="flex items-center gap-2 hover:opacity-80 transition">
                <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
                  <Search className="w-5 h-5 text-background" />
                </div>
                <span className="font-serif text-xl font-bold text-foreground">Sales Agent</span>
              </div>
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <Link href="/admin">
                <Button size="sm" variant="outline" className="gap-2">
                  <Shield className="w-4 h-4" /> Admin
                </Button>
              </Link>
            )}
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

      {/* Sidebar (collapsible + resizable) + chat + optional resizable table */}
      <div ref={splitRef} className="flex-1 min-h-0 flex w-full">
        {sidebarOpen && (
          <>
            <div className="hidden md:block shrink-0 border-r border-border" style={{ width: sidebarWidth }}>
              <ConversationSidebar
                conversations={conversations}
                activeCid={activeCid}
                loading={loadingConvs}
                onSelect={onSelect}
                onNew={() => void onNew()}
                onDelete={(c) => void onDelete(c)}
              />
            </div>
            <div
              onMouseDown={startDragSidebar}
              title="Drag to resize"
              className="hidden md:block w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-foreground/40 transition-colors"
            />
          </>
        )}

        <div className={rightOpen ? 'hidden md:block flex-1 min-w-0 border-r border-border' : 'flex-1 min-w-0'}>
          {activeCid ? (
            <ChatPanel
              key={activeCid}
              cid={activeCid}
              initialQuery={initialQuery}
              onShowTable={openTable}
              onOpenBatch={openBatch}
              onTurnComplete={() => void onTurnComplete()}
            />
          ) : (
            <div className="p-8 text-muted-foreground">Loading…</div>
          )}
        </div>

        {rightOpen && activeCid && (
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
              {table ? (
                <DataTable key={table.id} cid={activeCid} source={table.source} onClose={() => setTable(null)} />
              ) : batchPanelId ? (
                <BatchApprovalPanel
                  key={batchPanelId}
                  batchId={batchPanelId}
                  onClose={() => setBatchPanelId(null)}
                  onResolved={() => void refreshConversations()}
                />
              ) : null}
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
