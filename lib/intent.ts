export type PlatformType = 'apify' | 'origami' | 'apollo' | 'zeptomail'

export interface IntentResult {
  platform: PlatformType
  intent: string
  query: string
  enrichmentNeeded: boolean
}

export function detectIntent(query: string): IntentResult {
  const lowerQuery = query.toLowerCase()

  // Job/opening detection -> Apify
  const jobKeywords = ['job', 'opening', 'hiring', 'role', 'position', 'recruiter', 'recruiting', 'roles at', 'positions at']
  if (jobKeywords.some(kw => lowerQuery.includes(kw))) {
    return {
      platform: 'apify',
      intent: 'find_jobs',
      query,
      enrichmentNeeded: false
    }
  }

  // Email detection -> Origami (with potential Apollo enrichment)
  const emailKeywords = ['email', 'contact', 'reach', 'phone']
  if (emailKeywords.some(kw => lowerQuery.includes(kw))) {
    return {
      platform: 'origami',
      intent: 'find_contact',
      query,
      enrichmentNeeded: true
    }
  }

  // Outreach/email composition -> ZeptoMail
  const emailCompositionKeywords = ['send', 'compose', 'draft', 'email', 'message', 'reach out']
  if (emailCompositionKeywords.some(kw => lowerQuery.includes(kw)) && 
      (lowerQuery.includes('send') || lowerQuery.includes('compose') || lowerQuery.includes('draft'))) {
    return {
      platform: 'zeptomail',
      intent: 'compose_email',
      query,
      enrichmentNeeded: false
    }
  }

  // Company/person research -> Origami
  const researchKeywords = ['who', 'company', 'founder', 'ceo', 'works at', 'runs', 'find', 'research', 'about', 'profile']
  if (researchKeywords.some(kw => lowerQuery.includes(kw))) {
    return {
      platform: 'origami',
      intent: 'research_company_person',
      query,
      enrichmentNeeded: true
    }
  }

  // Default to Origami (company/person research)
  return {
    platform: 'origami',
    intent: 'research_company_person',
    query,
    enrichmentNeeded: true
  }
}
