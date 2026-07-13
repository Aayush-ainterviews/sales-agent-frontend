'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Search, ArrowLeft, Trash2 } from 'lucide-react'

export default function SavedPage() {
  const savedResults = [
    {
      id: 'origami-1',
      title: 'Sarah Chen',
      company: 'TechCorp Inc',
      role: 'VP of Sales',
      location: 'San Francisco, CA',
      platform: 'origami',
      savedDate: '2024-01-15'
    },
    {
      id: 'apify-1',
      title: 'VP of Sales - Tech Company',
      company: 'TechCorp Inc',
      role: 'VP of Sales',
      location: 'San Francisco, CA',
      platform: 'apify',
      savedDate: '2024-01-14'
    }
  ]

  const platformColors = {
    apify: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
    origami: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
    apollo: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
    zeptomail: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  }

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
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Saved Results</h1>
          <p className="text-muted-foreground">Bookmarked profiles and opportunities</p>
        </div>

        {savedResults.length > 0 ? (
          <div className="space-y-4">
            {savedResults.map((result) => (
              <div key={result.id} className="bg-background border border-border rounded-lg p-6 hover:border-foreground/30 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link href={`/result/${result.id}`}>
                      <h3 className="font-serif text-lg font-bold text-foreground hover:underline cursor-pointer">
                        {result.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">Saved {result.savedDate}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${platformColors[result.platform as keyof typeof platformColors]}`}>
                    {result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm">
                  {result.company && (
                    <div>
                      <p className="text-muted-foreground text-xs">Company</p>
                      <p className="text-foreground font-medium">{result.company}</p>
                    </div>
                  )}
                  {result.role && (
                    <div>
                      <p className="text-muted-foreground text-xs">Role</p>
                      <p className="text-foreground font-medium">{result.role}</p>
                    </div>
                  )}
                  {result.location && (
                    <div>
                      <p className="text-muted-foreground text-xs">Location</p>
                      <p className="text-foreground font-medium">{result.location}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link href={`/result/${result.id}`}>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="ml-auto gap-2 text-red-600 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No saved results yet</p>
            <Link href="/search">
              <Button>Start Searching</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
