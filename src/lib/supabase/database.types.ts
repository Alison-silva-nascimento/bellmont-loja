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
          brand: string | null
          category: string
          subcategory: string | null
          description: string | null
          price: number | null
          compare_at_price: number | null
          sales_mode: 'ASSISTED_PURCHASE' | 'INQUIRY_ONLY' | 'DISABLED'
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
          brand?: string | null
          category: string
          subcategory?: string | null
          description?: string | null
          price?: number | null
          compare_at_price?: number | null
          sales_mode?: 'ASSISTED_PURCHASE' | 'INQUIRY_ONLY' | 'DISABLED'
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
      orders: {
        Row: {
          id: number
          public_id: string
          order_number: string
          record_type: 'commercial_order' | 'assistance_request'
          source: 'website' | 'whatsapp_assisted'
          customer_user_id: string | null
          buyer_name: string
          buyer_phone: string
          buyer_email: string | null
          currency: 'BRL'
          items_subtotal: number
          discount_total: number
          shipping_total: number
          grand_total: number
          paid_total: number
          commercial_status: 'draft' | 'pending_payment' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'expired'
          payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded'
          fulfillment_status: 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'not_applicable'
          idempotency_key: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          public_id?: string
          order_number: string
          record_type?: 'commercial_order' | 'assistance_request'
          source: 'website' | 'whatsapp_assisted'
          customer_user_id?: string | null
          buyer_name: string
          buyer_phone: string
          buyer_email?: string | null
          currency?: 'BRL'
          items_subtotal?: number
          discount_total?: number
          shipping_total?: number
          grand_total?: number
          paid_total?: number
          commercial_status?: 'draft' | 'pending_payment' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'expired'
          payment_status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded'
          fulfillment_status?: 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'not_applicable'
          idempotency_key: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          product_id: number
          variant_id: number
          product_code: string | null
          variant_sku: string
          product_name: string
          brand: string | null
          category: string
          color: string | null
          size: string | null
          volume: string | null
          quantity: number
          unit_price: number
          discount_total: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: never
          order_id: number
          product_id: number
          variant_id: number
          product_code?: string | null
          variant_sku: string
          product_name: string
          brand?: string | null
          category: string
          color?: string | null
          size?: string | null
          volume?: string | null
          quantity: number
          unit_price: number
          discount_total?: number
          line_total: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_variant_fkey'
            columns: ['product_id', 'variant_id']
            isOneToOne: false
            referencedRelation: 'product_variants'
            referencedColumns: ['product_id', 'id']
          },
        ]
      }
      order_addresses: {
        Row: {
          id: number
          order_id: number
          address_type: 'shipping' | 'billing'
          recipient_name: string
          recipient_phone: string | null
          postal_code: string
          street: string
          street_number: string
          complement: string | null
          neighborhood: string
          city: string
          state_code: string
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: never
          order_id: number
          address_type?: 'shipping' | 'billing'
          recipient_name: string
          recipient_phone?: string | null
          postal_code: string
          street: string
          street_number: string
          complement?: string | null
          neighborhood: string
          city: string
          state_code: string
          reference?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_addresses']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_addresses_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_payments: {
        Row: {
          id: number
          order_id: number
          provider: string
          external_transaction_id: string | null
          payment_method: 'pix' | 'credit_card' | 'manual'
          amount_requested: number
          amount_confirmed: number
          status: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded'
          idempotency_key: string
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          order_id: number
          provider: string
          external_transaction_id?: string | null
          payment_method: 'pix' | 'credit_card' | 'manual'
          amount_requested: number
          amount_confirmed?: number
          status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded'
          idempotency_key: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_payments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_shipments: {
        Row: {
          id: number
          order_id: number
          provider: string | null
          carrier: string | null
          service: string | null
          external_quote_id: string | null
          confirmed_shipping_amount: number | null
          estimated_business_days: number | null
          tracking_code: string | null
          status: 'not_quoted' | 'quoted' | 'label_pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'failed'
          quoted_at: string | null
          quote_expires_at: string | null
          shipped_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          order_id: number
          provider?: string | null
          carrier?: string | null
          service?: string | null
          external_quote_id?: string | null
          confirmed_shipping_amount?: number | null
          estimated_business_days?: number | null
          tracking_code?: string | null
          status?: 'not_quoted' | 'quoted' | 'label_pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'failed'
          quoted_at?: string | null
          quote_expires_at?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_shipments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_shipments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_status_history: {
        Row: {
          id: number
          order_id: number
          previous_status: string | null
          new_status: string
          change_type: 'commercial' | 'payment' | 'fulfillment' | 'shipment' | 'system'
          actor_type: 'system' | 'admin' | 'payment_webhook' | 'shipping_webhook'
          actor_user_id: string | null
          reason: string | null
          technical_reference: string | null
          created_at: string
        }
        Insert: {
          id?: never
          order_id: number
          previous_status?: string | null
          new_status: string
          change_type: 'commercial' | 'payment' | 'fulfillment' | 'shipment' | 'system'
          actor_type: 'system' | 'admin' | 'payment_webhook' | 'shipping_webhook'
          actor_user_id?: string | null
          reason?: string | null
          technical_reference?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_status_history']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'order_status_history_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_reservations: {
        Row: {
          id: number
          order_id: number
          order_item_id: number
          variant_id: number
          quantity: number
          status: 'active' | 'consumed' | 'released' | 'expired'
          idempotency_key: string
          expires_at: string
          consumed_at: string | null
          released_at: string | null
          created_at: string
        }
        Insert: {
          id?: never
          order_id: number
          order_item_id: number
          variant_id: number
          quantity: number
          status?: 'active' | 'consumed' | 'released' | 'expired'
          idempotency_key: string
          expires_at: string
          consumed_at?: string | null
          released_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['inventory_reservations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'inventory_reservations_order_item_variant_fkey'
            columns: ['order_id', 'order_item_id', 'variant_id']
            isOneToOne: false
            referencedRelation: 'order_items'
            referencedColumns: ['order_id', 'id', 'variant_id']
          },
          {
            foreignKeyName: 'inventory_reservations_variant_id_fkey'
            columns: ['variant_id']
            isOneToOne: false
            referencedRelation: 'product_variants'
            referencedColumns: ['id']
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          id: number
          order_payment_id: number | null
          provider: string
          external_event_id: string
          event_type: string
          external_transaction_id: string | null
          processing_status: 'received' | 'processing' | 'processed' | 'failed' | 'ignored'
          received_at: string
          processed_at: string | null
          sanitized_error: string | null
        }
        Insert: {
          id?: never
          order_payment_id?: number | null
          provider: string
          external_event_id: string
          event_type: string
          external_transaction_id?: string | null
          processing_status?: 'received' | 'processing' | 'processed' | 'failed' | 'ignored'
          received_at?: string
          processed_at?: string | null
          sanitized_error?: string | null
        }
        Update: Partial<Database['public']['Tables']['payment_webhook_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'payment_webhook_events_order_payment_id_fkey'
            columns: ['order_payment_id']
            isOneToOne: false
            referencedRelation: 'order_payments'
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
      get_public_variant_availability: {
        Args: Record<PropertyKey, never>
        Returns: {
          product_code: string
          variant_sku: string
          available: boolean
          availability_status: 'available' | 'out_of_stock' | 'unconfirmed'
        }[]
      }
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
      prepare_inventory_batch: {
        Args: {
          p_batch_key: string
          p_reference: string
          p_operations: Json
        }
        Returns: {
          batch_id: number
          batch_status: 'prepared' | 'in_progress' | 'completed'
          manifest_hash: string
          operation_count: number
          target_total: number
        }[]
      }
      apply_inventory_batch_operation: {
        Args: {
          p_batch_key: string
          p_operation_key: string
        }
        Returns: {
          batch_id: number
          operation_id: number
          operation_status: 'applied' | 'already_applied'
          variant_id: number
          sku: string
          quantity_on_hand: number
          quantity_reserved: number
          available_quantity: number
          applied_delta: number
          movement_id: number
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
export type OrderRow = Database['public']['Tables']['orders']['Row']
export type OrderItemRow = Database['public']['Tables']['order_items']['Row']
export type OrderAddressRow = Database['public']['Tables']['order_addresses']['Row']
export type OrderPaymentRow = Database['public']['Tables']['order_payments']['Row']
export type OrderShipmentRow = Database['public']['Tables']['order_shipments']['Row']
export type OrderStatusHistoryRow = Database['public']['Tables']['order_status_history']['Row']
export type InventoryReservationRow = Database['public']['Tables']['inventory_reservations']['Row']
export type PaymentWebhookEventRow = Database['public']['Tables']['payment_webhook_events']['Row']
