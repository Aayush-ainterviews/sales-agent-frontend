'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Zap, Plus, BarChart3, Settings, LogOut } from 'lucide-react'
import CampaignList from '@/components/CampaignList'

export default function DashboardPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <span className="font-serif text-xl font-bold text-foreground">Outreach</span>
          </Link>
          <div className="flex gap-2 items-center">
            <ThemeSwitcher />
            <button className="p-2 hover:bg-secondary rounded transition">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 hover:bg-secondary rounded transition">
              <LogOut className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {showCreateCampaign ? (
            <CreateCampaignForm onClose={() => setShowCreateCampaign(false)} />
          ) : (
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
                    Campaigns
                  </h1>
                  <p className="text-muted-foreground">
                    Manage and optimize your outreach campaigns
                  </p>
                </div>
                <Button
                  onClick={() => setShowCreateCampaign(true)}
                  className="bg-foreground text-background hover:bg-foreground/90 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Button>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Campaigns', value: '12', icon: BarChart3 },
                  { label: 'Active', value: '5', icon: Zap },
                  { label: 'Total Outreach', value: '1,245', icon: BarChart3 },
                  { label: 'Response Rate', value: '28%', icon: BarChart3 },
                ].map((stat, idx) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={idx}
                      className="bg-background border border-border rounded-lg p-6 hover:border-foreground/20 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <Icon className="w-5 h-5 text-foreground/50" />
                      </div>
                      <p className="font-serif text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  )
                })}
              </div>

              {/* Campaigns List */}
              <CampaignList onSelectCampaign={setSelectedCampaign} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function CreateCampaignForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    targetAudience: '',
    objective: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Campaign created:', formData)
    onClose()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="font-serif text-3xl font-bold text-foreground mb-6">Create New Campaign</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Q4 Enterprise Outreach"
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Target Audience
          </label>
          <textarea
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            placeholder="Describe your ideal customers (industry, company size, role, etc.)"
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Campaign Objective
          </label>
          <textarea
            value={formData.objective}
            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            placeholder="What do you want to achieve? (e.g., schedule demos, generate leads, etc.)"
            rows={3}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90">
            Create Campaign
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
