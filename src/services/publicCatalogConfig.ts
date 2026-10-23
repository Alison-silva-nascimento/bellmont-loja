export type PublicCatalogSource = 'local' | 'supabase'

export const resolvePublicCatalogSource = (value: string | undefined): PublicCatalogSource =>
  value?.trim().toLocaleLowerCase() === 'supabase' ? 'supabase' : 'local'
