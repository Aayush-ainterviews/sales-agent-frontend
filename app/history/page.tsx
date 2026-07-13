'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Search, ArrowLeft, Clock, Trash2 } from 'lucide-react'

export default function HistoryPage() {
  const searchHistory = [
    { query: 'VP of Sales at tech companies in San Francisco', date: '2024-01-15', resultCount: 3 },
    { query: 'Hiring managers in healthcare industry', date: '2024-01-14', resultCount: 5 },
    { query: 'Marketing directors in NYC startups', date: '2024-01-13', resultCount: 2 },
    { query: 'CTOs of Series B companies', date: '2024-01-12', resultCount: 4 },
    { query: 'Founder contact email', date: '2024-01-11', resultCount: 1 },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
                <Search className="w-5 h-5 text-background" />
              </div>
              <span className="font-serif text-xl font-bold text-foreground">Sales Agent</span>
            </div>
          </Link>
          <div className="flex gap-2 items-center">
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Search History</h1>
          <p className="text-muted-foreground">Your recent searches</p>
        </div>

        {searchHistory.length > 0 ? (
          <div className="space-y-3">
            {searchHistory.map((item, idx) => (
              <div key={idx} className="bg-background border border-border rounded-lg p-4 hover:border-foreground/30 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/search?q=${encodeURIComponent(item.query)}`}>
                      <h3 className="font-medium text-foreground hover:underline cursor-pointer">
                        {item.query}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {item.date}
                      </span>
                      <span>{item.resultCount} results found</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/search?q=${encodeURIComponent(item.query)}`}>
                      <Button size="sm" variant="outline">
                        Search Again
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No search history yet</p>
            <Link href="/search">
              <Button>Start Searching</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
