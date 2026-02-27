export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      stations: {
        Row: {
          id: string
          name: string
          code: string
          lat: number
          lng: number
          unit: string
          status: string
          network_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['stations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['stations']['Insert']>
      }
      networks: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: Partial<Database['public']['Tables']['networks']['Insert']>
      }
      sensors: {
        Row: { id: string; station_id: string; parameter: string; brand: string; model: string; serial: string; status: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['sensors']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['sensors']['Insert']>
      }
      raw_data: {
        Row: { id: string; station_id: string; sensor_id: string; timestamp: string; value: number; created_at: string }
        Insert: Omit<Database['public']['Tables']['raw_data']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: never
      }
      validated_data: {
        Row: { id: string; raw_data_id: string; is_valid: boolean; justification: string; operator_id: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['validated_data']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['validated_data']['Insert']>
      }
      alerts: {
        Row: { id: string; station_id: string; parameter: string; type: string; message: string | null; severity: string; read: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at' | 'read'> & { id?: string; created_at?: string; read?: boolean }
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      audit_logs: {
        Row: { id: string; action: string; user_id: string; timestamp: string; metadata: Json }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'> & { id?: string; timestamp?: string }
        Update: never
      }
      users: {
        Row: { id: string; email: string; name: string; unit: string; status: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      roles: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      user_roles: {
        Row: { user_id: string; role_id: string }
        Insert: { user_id: string; role_id: string }
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
      }
      availability_metrics: {
        Row: { station_id: string; date: string; percentage: number }
        Insert: { station_id: string; date: string; percentage: number }
        Update: Partial<Database['public']['Tables']['availability_metrics']['Insert']>
      }
      iqair_results: {
        Row: { station_id: string; timestamp: string; value: number }
        Insert: { station_id: string; timestamp: string; value: number }
        Update: Partial<Database['public']['Tables']['iqair_results']['Insert']>
      }
    }
  }
}
