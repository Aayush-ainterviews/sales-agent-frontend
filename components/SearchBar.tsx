'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Search, ArrowRight } from 'lucide-react'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  const quickSearches = [
    'VP of Sales at tech companies in San Francisco',
    'Hiring managers in healthcare industry',
    'Marketing directors in NYC startups',
    'CTOs of Series B companies',
  ]

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person, company, or hiring contact..."
            className="w-full pl-14 pr-14 py-4 text-lg bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 pr-2 flex items-center"
            disabled={!query.trim()}
          >
            <div className="p-2 hover:bg-secondary rounded-md transition disabled:opacity-50">
              <ArrowRight className="w-5 h-5 text-foreground" />
            </div>
          </button>
        </div>
      </form>

      {/* Quick searches */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-3">Try a quick search:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {quickSearches.map((search, idx) => (
            <button
              key={idx}
              onClick={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
              className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition border border-border"
            >
              {search}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
