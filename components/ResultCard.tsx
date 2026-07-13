'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExternalLink, Mail, Phone, Save } from 'lucide-react'
import type { SearchResult } from '@/lib/mockData'

interface ResultCardProps {
  result: SearchResult
}

export default function ResultCard({ result }: ResultCardProps) {
  const platformColors = {
    apify: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
    origami: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
    apollo: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
    zeptomail: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  }

  const platformLabels = {
    apify: 'Apify - Job Data',
    origami: 'Origami - Profile',
    apollo: 'Apollo - Enriched',
    zeptomail: 'ZeptoMail - Email',
  }

  return (
    <div className="bg-background border border-border rounded-lg p-6 hover:border-foreground/30 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-serif text-xl font-bold text-foreground">
            {result.title}
          </h3>
          <p className="text-sm text-muted-foreground">{result.category}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${platformColors[result.platform]}`}>
          {platformLabels[result.platform]}
        </span>
      </div>

      <p className="text-foreground mb-4 line-clamp-2">{result.description}</p>

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
        {result.industry && (
          <div>
            <p className="text-muted-foreground text-xs">Industry</p>
            <p className="text-foreground font-medium">{result.industry}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <span>Source: {result.source}</span>
        {result.verified && <span className="px-2 py-1 bg-green-100/10 text-green-600 dark:text-green-400 rounded">Verified</span>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href={`/result/${result.id}`} className="inline-block">
          <Button size="sm" variant="outline" className="gap-2">
            View Details
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
        {result.email && (
          <Button size="sm" variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Button>
        )}
        {result.phone && (
          <Button size="sm" variant="outline" className="gap-2">
            <Phone className="w-4 h-4" />
            Call
          </Button>
        )}
        <Button size="sm" variant="outline" className="ml-auto gap-2">
          <Save className="w-4 h-4" />
          Save
        </Button>
      </div>
    </div>
  )
}
