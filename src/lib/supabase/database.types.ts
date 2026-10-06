export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: number
          code: string | null
          slug: string
          name: string
          brand: string
          category: string
          subcategory: string | null
          description: string | null
          price: number | null
          compare_at_price: number | null
          status: 'draft' | 'active' | 'archived'
          featured: boolean
          new_arrival: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          code?: string | null
          slug: string
          name: string
          brand: string
          category: string
          subcategory?: string | null
          description?: string | null
          price?: number | null
          compare_at_price?: number | null
          status?: 'draft' | 'active' | 'archived'
          featured?: boolean
          new_arrival?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      product_variants: {
        Row: {
          id: number
          product_id: number
          sku: string
          color: string | null
          size: string | null
          volume: string | null
          options: Json
          price_override: number | null
          compare_at_price: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          product_id: number
          sku: string
          color?: string | null
          size?: string | null
          volume?: string | null
          options?: Json
          price_override?: number | null
          compare_at_price?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      inventory: {
        Row: {
          variant_id: number
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          variant_id: number
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'inventory_variant_id_fkey'
            columns: ['variant_id']
            isOneToOne: true
            referencedRelation: 'product_variants'
            referencedColumns: ['id']
          },
        ]
      }
      product_images: {
        Row: {
          id: number
          product_id: number
          variant_id: number | null
          storage_path: string
          alt_text: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: never
          product_id: number
          variant_id?: number | null
          storage_path: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: number
          variant_id: number
          movement_type: 'initial' | 'adjustment' | 'reservation' | 'release' | 'sale' | 'return'
          quantity_delta: number
          quantity_after: number
          reference_type: string | null
          reference_id: string | null
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'inventory_movements_variant_id_fkey'
            columns: ['variant_id']
            isOneToOne: false
            referencedRelation: 'product_variants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      apply_inventory_movement: {
        Args: {
          p_variant_id: number
          p_delta: number
          p_note: string | null
        }
        Returns: {
          variant_id: number
          quantity_on_hand: number
          quantity_reserved: number
          available_quantity: number
        }[]
      }
      set_primary_product_image: {
        Args: { p_product_id: number; p_image_id: number }
        Returns: {
          product_id: number
          image_id: number
          storage_path: string
          sort_order: number
          is_primary: boolean
        }[]
      }
      reorder_product_images: {
        Args: { p_product_id: number; p_image_ids: number[] }
        Returns: {
          product_id: number
          image_id: number
          storage_path: string
          sort_order: number
          is_primary: boolean
        }[]
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProductRow = Database['public']['Tables']['products']['Row']
export type ProductVariantRow = Database['public']['Tables']['product_variants']['Row']
export type InventoryRow = Database['public']['Tables']['inventory']['Row']
export type InventoryMovementRow = Database['public']['Tables']['inventory_movements']['Row']
export type ProductImageRow = Database['public']['Tables']['product_images']['Row']
