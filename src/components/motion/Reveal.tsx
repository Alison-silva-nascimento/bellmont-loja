import { motion, useReducedMotion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

export function Reveal({ children, className = '', delay = 0 }: PropsWithChildren<{ className?: string; delay?: number }>) {
  const reduced = useReducedMotion()
  return (
    <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-8%' }} transition={{ duration: reduced ? 0 : .7, delay, ease: [.22, 1, .36, 1] }}>
      {children}
    </motion.div>
  )
}
