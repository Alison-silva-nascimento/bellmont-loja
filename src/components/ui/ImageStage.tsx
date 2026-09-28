interface ImageStageProps {
  src?: string
  alt: string
  tone?: 'ink' | 'stone' | 'light' | 'amber'
  label?: string
  className?: string
}

export function ImageStage({ src, alt, tone = 'ink', label, className = '' }: ImageStageProps) {
  return (
    <div className={`image-stage image-stage--${tone} ${className}`}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="image-stage__monogram" aria-hidden="true">B</div>}
      {label && <span className="image-stage__label">{label}</span>}
    </div>
  )
}
