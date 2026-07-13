'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import ChatPanel from '@/components/ChatPanel'
import { Search, ArrowLeft, Inbox } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

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
          </div>
        </div>
      </header>

      {/* Chat fills the rest */}
      <div className="flex-1 min-h-0 max-w-3xl w-full mx-auto border-x border-border">
        <ChatPanel initialQuery={query} />
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
