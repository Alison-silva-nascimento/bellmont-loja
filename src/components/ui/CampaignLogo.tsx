type CampaignLogoProps = {
  variant: 'streetwear' | 'fitness' | 'fragrances'
}

const identities = {
  streetwear: { brand: 'BELLMONT', signature: 'STREETWEAR' },
  fitness: { brand: 'IMPÉRIO FIT', signature: 'FITNESS STYLE' },
  fragrances: { brand: 'BELLMONT', signature: 'FRAGRANCES' },
}

function BellmontStreetMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="7" y="12" width="50" height="45" rx="1" />
    <path d="M17 13 23 5l9 8 9-8 6 8" />
    <path d="M23 25v22h11c6 0 9-2.7 9-6.3 0-3.2-2.2-5.3-6.2-5.8 3.1-.7 4.8-2.4 4.8-4.8 0-3.1-2.7-5.1-7.8-5.1H23Zm7 5h3.5c1.8 0 2.8.7 2.8 2s-1 2.1-2.8 2.1H30V30Zm0 8.5h4.6c2 0 3.1.7 3.1 2.1 0 1.5-1.1 2.3-3.1 2.3H30v-4.4Z" className="campaign-logo__fill" />
  </svg>
}

function ImperioFitMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 5 54 16l-4.5 29L32 59 14.5 45 10 16 32 5Z" />
    <path d="M23 21v23M33 21v23M33 21h11M33 31h9" />
    <path d="m18 49 28-34" className="campaign-logo__accent" />
  </svg>
}

function BellmontFragranceMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="34" r="24" />
    <path d="M19 13 24 6l8 7 8-7 5 7" />
    <path d="M25 24v22h9.5c5.6 0 8.5-2.6 8.5-6.1 0-3-2.1-5-5.8-5.6 2.8-.7 4.4-2.3 4.4-4.6 0-3-2.5-4.7-7.2-4.7H25Zm6 4.8h3c1.7 0 2.6.7 2.6 1.9 0 1.3-.9 2-2.6 2h-3v-3.9Zm0 8h3.9c1.8 0 2.8.7 2.8 2.1 0 1.4-1 2.2-2.8 2.2H31v-4.3Z" className="campaign-logo__fill" />
    <path d="M48 24c4 3 4 7 0 10M52 21c6 5 6 11 0 16" className="campaign-logo__accent" />
  </svg>
}

export function CampaignLogo({ variant }: CampaignLogoProps) {
  const identity = identities[variant]
  const Mark = variant === 'streetwear' ? BellmontStreetMark : variant === 'fitness' ? ImperioFitMark : BellmontFragranceMark

  return <div className={`campaign-logo campaign-logo--${variant}`} aria-label={`${identity.brand} ${identity.signature}`}>
    <span className="campaign-logo__mark"><Mark /></span>
    <span className="campaign-logo__wordmark">
      <b>{identity.brand}</b>
      <small>{identity.signature}</small>
    </span>
  </div>
}
