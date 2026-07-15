'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { ArrowRight, Search, MapPin, Users, Mail } from 'lucide-react'
import SearchBar from '@/components/SearchBar'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
              <Search className="w-5 h-5 text-background" />
            </div>
            <span className="font-serif text-xl font-bold text-foreground">Sales Agent</span>
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#how-it-works" className="text-foreground hover:text-muted-foreground transition">How it works</a>
            <a href="#platforms" className="text-foreground hover:text-muted-foreground transition">Platforms</a>
            <Link href="/batches" className="text-foreground hover:text-muted-foreground transition">Approvals</Link>
            <Link href="/history" className="text-foreground hover:text-muted-foreground transition">History</Link>
            <ThemeSwitcher />
            <Link href="/search">
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                Start Searching
              </Button>
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline">Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
          <div className="md:hidden flex gap-2 items-center">
            <ThemeSwitcher />
            <Link href="/search">
              <Button size="sm" className="bg-foreground text-background">
                Search
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground leading-tight mb-6">
              Find Anyone, Anywhere
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Describe who you want to find. Our AI detects your intent, searches the right platforms, and returns results with sources.
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar />
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              Powered by Multiple Platforms
            </h2>
            <p className="text-lg text-muted-foreground">Our AI intelligently routes to the right data source</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Platform 1 */}
            <div className="bg-background p-6 rounded-lg border border-border">
              <MapPin className="w-8 h-8 text-foreground mb-3" />
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">Apify</h3>
              <p className="text-sm text-muted-foreground">
                Raw data collection. Find job openings and hiring data from public sources.
              </p>
            </div>

            {/* Platform 2 */}
            <div className="bg-background p-6 rounded-lg border border-border">
              <Users className="w-8 h-8 text-foreground mb-3" />
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">Origami</h3>
              <p className="text-sm text-muted-foreground">
                Research companies and people. Get verified contacts, roles, and profiles.
              </p>
            </div>

            {/* Platform 3 */}
            <div className="bg-background p-6 rounded-lg border border-border">
              <Search className="w-8 h-8 text-foreground mb-3" />
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">Apollo</h3>
              <p className="text-sm text-muted-foreground">
                Enrichment layer. Fill missing contact details, emails, and company info.
              </p>
            </div>

            {/* Platform 4 */}
            <div className="bg-background p-6 rounded-lg border border-border">
              <Mail className="w-8 h-8 text-foreground mb-3" />
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">ZeptoMail</h3>
              <p className="text-sm text-muted-foreground">
                Outbound emails. Compose and send personalized messages with approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { number: '1', title: 'Describe', desc: 'Tell us who you want to find' },
              { number: '2', title: 'AI Understands', desc: 'Intent detection routes to right platform' },
              { number: '3', title: 'Search & Enrich', desc: 'Results with sources and attribution' },
              { number: '4', title: 'Refine & Act', desc: 'Chat to narrow down and take action' },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-foreground text-background font-serif font-bold text-lg rounded-full flex items-center justify-center">
                  {step.number}
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-5xl font-bold mb-6">
            Start finding today
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Search, discover, and connect with anyone you need
          </p>
          <Link href="/search">
            <Button size="lg" className="bg-background text-foreground hover:bg-secondary">
              Begin Search
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Sales Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
