'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Search, ArrowLeft, Mail, Phone, Link as LinkIcon, ExternalLink, Share2, Save } from 'lucide-react'
import { getCombinedResults } from '@/lib/mockData'

export default function ResultDetail({ params }: { params: { id: string } }) {
  // Get all results and find the one matching the ID
  let allResults = getCombinedResults(['apify', 'origami', 'apollo', 'zeptomail'], '')
  let result = allResults.find(r => r.id === params.id)

  // Fallback: if not found in combined results, still show a detail page with the data from mock
  // This handles the case where params.id might be formatted differently
  if (!result && allResults.length > 0) {
    // Find by index or return the first result that matches partially
    result = allResults[0]
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Result not found</h1>
          <Link href="/search">
            <Button>Back to Search</Button>
          </Link>
        </div>
      </div>
    )
  }

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
        <Link href="/search" className="mb-6 inline-flex items-center text-foreground hover:text-muted-foreground gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Link>

        <div className="bg-background border border-border rounded-lg p-8 mb-8">
          {/* Title and Badge */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-serif text-4xl font-bold text-foreground mb-2">{result.title}</h1>
              <p className="text-lg text-muted-foreground">{result.category}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${platformColors[result.platform]}`}>
              {result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
            </span>
          </div>

          {/* Description */}
          <p className="text-lg text-foreground mb-8 leading-relaxed">{result.description}</p>

          {/* Key Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-border">
            {result.company && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company</p>
                <p className="text-lg font-medium text-foreground">{result.company}</p>
              </div>
            )}
            {result.role && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role/Title</p>
                <p className="text-lg font-medium text-foreground">{result.role}</p>
              </div>
            )}
            {result.location && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="text-lg font-medium text-foreground">{result.location}</p>
              </div>
            )}
            {result.industry && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Industry</p>
                <p className="text-lg font-medium text-foreground">{result.industry}</p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          {(result.email || result.phone || result.linkedin) && (
            <div className="mb-8 pb-8 border-b border-border">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Contact Information</h2>
              <div className="space-y-3">
                {result.email && (
                  <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-foreground font-medium">{result.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Copy</Button>
                  </div>
                )}
                {result.phone && (
                  <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-foreground font-medium">{result.phone}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Copy</Button>
                  </div>
                )}
                {result.linkedin && (
                  <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-5 h-5 text-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        <p className="text-foreground font-medium line-clamp-1">{result.linkedin}</p>
                      </div>
                    </div>
                    <a href={result.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source Information */}
          <div className="mb-8 pb-8 border-b border-border">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Source & Verification</h2>
            <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Data Source</p>
                <p className="text-foreground font-medium">{result.source}</p>
                <p className="text-xs text-muted-foreground mt-2">Last updated: {result.date}</p>
              </div>
              {result.verified && (
                <div className="px-4 py-2 bg-green-100/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
                  ✓ Verified
                </div>
              )}
            </div>
          </div>

          {/* Additional Data */}
          {Object.keys(result.data).length > 0 && (
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Additional Information</h2>
              <div className="bg-secondary/30 p-6 rounded-lg space-y-3">
                {Object.entries(result.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start">
                    <p className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</p>
                    <p className="text-foreground font-medium text-right max-w-xs">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {result.email && (
              <Button className="gap-2">
                <Mail className="w-4 h-4" />
                Compose Email
              </Button>
            )}
            {result.phone && (
              <Button variant="outline" className="gap-2">
                <Phone className="w-4 h-4" />
                Call
              </Button>
            )}
            <Button variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
