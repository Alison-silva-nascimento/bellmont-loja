import { FitnessHighlights, PerfumeEssentials } from '../sections/CategoryShowcase'
import { Hero } from '../sections/Hero'
import { NewDrop } from '../sections/NewDrop'
import { WhatsAppGroup } from '../sections/WhatsAppGroup'

export function Home() { return <div className="home-page"><Hero /><NewDrop /><PerfumeEssentials /><FitnessHighlights /><WhatsAppGroup /></div> }
