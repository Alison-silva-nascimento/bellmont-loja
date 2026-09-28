import { Link } from 'react-router-dom'

type BrandMarkProps = {
  light?: boolean
  brand?: 'bellmont' | 'imperio-fit'
}

export function BrandMark({ light = false, brand = 'bellmont' }: BrandMarkProps) {
  const isImperioFit = brand === 'imperio-fit'
  const label = isImperioFit ? 'IMPÉRIO FIT' : 'BELLMONT'
  const destination = isImperioFit ? '/imperio-fit' : '/'

  return <Link className={`brand-mark${isImperioFit ? ' brand-mark--imperio' : ''}${light ? ' is-light' : ''}`} to={destination} aria-label={`${label} — início`}>{label}</Link>
}
