export interface SearchResult {
  id: string
  platform: 'apify' | 'origami' | 'apollo' | 'zeptomail'
  title: string
  description: string
  category: string
  company?: string
  email?: string
  linkedin?: string
  phone?: string
  location?: string
  industry?: string
  role?: string
  source: string
  verified?: boolean
  date: string
  data: Record<string, any>
}

const apifyResults: SearchResult[] = [
  {
    id: 'apify-1',
    platform: 'apify',
    title: 'VP of Sales - Tech Company',
    description: 'Open VP of Sales position at growing B2B SaaS company. 5+ years sales leadership required.',
    category: 'Job Posting',
    company: 'TechCorp Inc',
    location: 'San Francisco, CA',
    industry: 'Software/SaaS',
    role: 'VP of Sales',
    source: 'LinkedIn Jobs',
    date: '2024-01-10',
    data: {
      salary: '$150k-200k + equity',
      jobType: 'Full-time',
      experience: '5+ years',
      url: 'https://linkedin.com/jobs/view/123456'
    }
  },
  {
    id: 'apify-2',
    platform: 'apify',
    title: 'Senior Sales Manager - Healthcare',
    description: 'Seeking experienced Sales Manager to lead enterprise sales team in healthcare sector.',
    category: 'Job Posting',
    company: 'HealthTech Solutions',
    location: 'New York, NY',
    industry: 'Healthcare/Tech',
    role: 'Senior Sales Manager',
    source: 'LinkedIn Jobs',
    date: '2024-01-09',
    data: {
      salary: '$120k-150k + bonus',
      jobType: 'Full-time',
      experience: '7+ years',
      url: 'https://linkedin.com/jobs/view/123457'
    }
  },
  {
    id: 'apify-3',
    platform: 'apify',
    title: 'Sales Development Rep - Startup',
    description: 'SDR role at early-stage startup. Work with VP of Sales to build outbound strategy.',
    category: 'Job Posting',
    company: 'StartupXYZ',
    location: 'Remote',
    industry: 'Software/Startup',
    role: 'Sales Development Rep',
    source: 'LinkedIn Jobs',
    date: '2024-01-08',
    data: {
      salary: '$50k-70k + commission',
      jobType: 'Full-time',
      experience: '1+ years',
      url: 'https://linkedin.com/jobs/view/123458'
    }
  },
]

const origamiResults: SearchResult[] = [
  {
    id: 'origami-1',
    platform: 'origami',
    title: 'Sarah Chen',
    description: 'VP of Sales at TechCorp Inc. 10+ years in B2B SaaS sales leadership.',
    category: 'Professional Profile',
    company: 'TechCorp Inc',
    role: 'VP of Sales',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/sarahchen',
    email: 'sarah.chen@techcorp.com',
    source: 'Origami Research',
    verified: true,
    date: '2024-01-15',
    data: {
      expertise: ['B2B Sales', 'Enterprise Sales', 'Team Leadership'],
      yearsInRole: 3,
      previousRoles: ['Senior Sales Manager', 'Account Executive'],
      education: 'MBA from Stanford'
    }
  },
  {
    id: 'origami-2',
    platform: 'origami',
    title: 'TechCorp Inc',
    description: 'B2B SaaS company providing enterprise software solutions. Founded 2010.',
    category: 'Company Profile',
    company: 'TechCorp Inc',
    location: 'San Francisco, CA',
    industry: 'Software/SaaS',
    linkedin: 'https://linkedin.com/company/techcorp-inc',
    source: 'Origami Research',
    verified: true,
    date: '2024-01-15',
    data: {
      founded: 2010,
      employees: '500-1000',
      funding: '$50M Series C',
      website: 'www.techcorp.com',
      decisionMakers: ['Sarah Chen (VP Sales)', 'John Smith (CEO)', 'Emily Wang (CFO)']
    }
  },
  {
    id: 'origami-3',
    platform: 'origami',
    title: 'John Smith',
    description: 'CEO and Founder of TechCorp Inc. Led the company from startup to $50M+ revenue.',
    category: 'Professional Profile',
    company: 'TechCorp Inc',
    role: 'CEO',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/johnsmith',
    email: 'john@techcorp.com',
    source: 'Origami Research',
    verified: true,
    date: '2024-01-15',
    data: {
      expertise: ['Startup Building', 'Enterprise Sales', 'Product Strategy'],
      yearsInRole: 10,
      previousCompanies: ['Acme Corp', 'StartupABC'],
      education: 'BS Computer Science from MIT'
    }
  },
]

const apolloResults: SearchResult[] = [
  {
    id: 'apollo-1',
    platform: 'apollo',
    title: 'Sarah Chen - Enriched',
    description: 'Additional contact information for VP of Sales at TechCorp Inc.',
    category: 'Enriched Contact',
    company: 'TechCorp Inc',
    email: 'sarah.chen@techcorp.com',
    phone: '+1 (415) 555-0123',
    linkedin: 'https://linkedin.com/in/sarahchen',
    source: 'Apollo Enrichment',
    verified: true,
    date: '2024-01-15',
    data: {
      emailConfidence: 0.95,
      phoneConfidence: 0.85,
      verified: true,
      lastUpdated: '2024-01-15'
    }
  },
]

const zeptomailResults: SearchResult[] = [
  {
    id: 'zeptomail-1',
    platform: 'zeptomail',
    title: 'Draft: Sales Partnership',
    description: 'Draft email to Sarah Chen regarding sales partnership opportunity.',
    category: 'Email Draft',
    company: 'TechCorp Inc',
    source: 'ZeptoMail Draft',
    date: '2024-01-15',
    data: {
      to: 'sarah.chen@techcorp.com',
      subject: 'Partnership Opportunity with TechCorp',
      body: `Hi Sarah,

I hope this email finds you well. I came across TechCorp's impressive growth in the B2B SaaS space and would like to explore potential partnership opportunities.

With our platform's proven track record in enterprise sales enablement, I believe we could add significant value to your sales organization.

Would you be open to a brief 15-minute call next week?

Best regards`,
      status: 'draft',
      readyToSend: true
    }
  },
]

export function getMockResults(platform: string, _query: string): SearchResult[] {
  switch (platform) {
    case 'apify':
      return apifyResults
    case 'origami':
      return origamiResults
    case 'apollo':
      return apolloResults
    case 'zeptomail':
      return zeptomailResults
    default:
      return origamiResults
  }
}

export function getCombinedResults(platforms: string[], _query: string): SearchResult[] {
  const results: SearchResult[] = []
  for (const platform of platforms) {
    results.push(...getMockResults(platform, _query))
  }
  return results
}
