import type { ReactNode } from 'react'

interface ImageStageProps {
  src?: string
  alt: string
  tone?: 'ink' | 'stone' | 'light' | 'amber'
  label?: string
  className?: string
  children?: ReactNode
}

export function ImageStage({ src, alt, tone = 'ink', label, className = '', children }: ImageStageProps) {
  return (
    <div className={`image-stage image-stage--${tone} ${className}`}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="image-stage__monogram" aria-hidden="true">B</div>}
      {children && <div className="image-stage__overlay">{children}</div>}
      {label && <span className="image-stage__label">{label}</span>}
    </div>
  )
}
