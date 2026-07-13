'use client'

import { MoreVertical, TrendingUp, Users, Mail } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  audience: string
  sent: number
  responses: number
  responseRate: number
  status: 'active' | 'draft' | 'completed'
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Q4 Enterprise Tech',
    audience: 'Enterprise SaaS companies',
    sent: 342,
    responses: 95,
    responseRate: 27.8,
    status: 'active',
  },
  {
    id: '2',
    name: 'Mid-Market Growth',
    audience: 'Mid-market B2B startups',
    sent: 218,
    responses: 62,
    responseRate: 28.4,
    status: 'active',
  },
  {
    id: '3',
    name: 'SMB Expansion',
    audience: 'Small business owners',
    sent: 156,
    responses: 38,
    responseRate: 24.4,
    status: 'completed',
  },
  {
    id: '4',
    name: 'Healthcare Initiative',
    audience: 'Healthcare tech leads',
    sent: 89,
    responses: 22,
    responseRate: 24.7,
    status: 'draft',
  },
  {
    id: '5',
    name: 'Fintech Partnership',
    audience: 'Fintech decision makers',
    sent: 267,
    responses: 71,
    responseRate: 26.6,
    status: 'completed',
  },
]

const statusStyles = {
  active: 'bg-green-100/20 text-green-700 border-green-200',
  draft: 'bg-yellow-100/20 text-yellow-700 border-yellow-200',
  completed: 'bg-blue-100/20 text-blue-700 border-blue-200',
}

export default function CampaignList({ onSelectCampaign }: { onSelectCampaign: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-sm text-muted-foreground font-medium">
        <div className="col-span-4">Campaign</div>
        <div className="col-span-2 flex items-center gap-1">
          <Mail className="w-4 h-4" />
          Sent
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <Users className="w-4 h-4" />
          Responses
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          Rate
        </div>
        <div className="col-span-2">Status</div>
      </div>

      {mockCampaigns.map((campaign) => (
        <div
          key={campaign.id}
          onClick={() => onSelectCampaign(campaign.id)}
          className="bg-background border border-border rounded-lg p-6 hover:border-foreground/30 transition cursor-pointer"
        >
          <div className="grid md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4">
              <h3 className="font-serif font-bold text-foreground mb-1">{campaign.name}</h3>
              <p className="text-sm text-muted-foreground">{campaign.audience}</p>
            </div>

            <div className="md:col-span-2">
              <div className="font-bold text-foreground">{campaign.sent}</div>
              <p className="text-xs text-muted-foreground">messages sent</p>
            </div>

            <div className="md:col-span-2">
              <div className="font-bold text-foreground">{campaign.responses}</div>
              <p className="text-xs text-muted-foreground">responses</p>
            </div>

            <div className="md:col-span-2">
              <div className="font-bold text-foreground">{campaign.responseRate}%</div>
              <p className="text-xs text-muted-foreground">response rate</p>
            </div>

            <div className="md:col-span-2 flex justify-between items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[campaign.status]}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>
              <button className="p-2 hover:bg-secondary rounded transition">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
