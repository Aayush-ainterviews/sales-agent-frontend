'use client'

import { Suspense, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import ChatPanel from '@/components/ChatPanel'
import DataTable from '@/components/DataTable'
import { type TableSource } from '@/lib/table'
import { Search, ArrowLeft, Inbox, Shield, Table } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  // the open table (id keys the panel so a new source remounts it cleanly); null = closed
  const [table, setTable] = useState<{ id: number; source: TableSource } | null>(null)
  const tableId = useRef(0)
  const openTable = (source: TableSource) => setTable({ id: ++tableId.current, source })

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
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
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => openTable({ kind: 'new' })}>
              <Table className="w-4 h-4" />
              New table
            </Button>
            <Link href="/batches">
              <Button size="sm" variant="outline" className="gap-2">
                <Inbox className="w-4 h-4" />
                Approvals
              </Button>
            </Link>
            <ThemeSwitcher />
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Chat + optional side table (side-by-side on desktop; table takes over on mobile) */}
      <div className="flex-1 min-h-0 flex w-full">
        <div
          className={
            table
              ? 'hidden md:block flex-1 min-w-0 border-r border-border'
              : 'max-w-3xl w-full mx-auto border-x border-border'
          }
        >
          <ChatPanel initialQuery={query} onShowTable={openTable} />
        </div>
        {table && (
          <div className="flex-1 min-w-0">
            <DataTable key={table.id} source={table.source} onClose={() => setTable(null)} />
          </div>
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
