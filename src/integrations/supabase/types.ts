export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          automatico: boolean | null
          cliente_id: string
          created_at: string | null
          criado_por: string | null
          descricao: string
          id: string
          tipo: string
        }
        Insert: {
          automatico?: boolean | null
          cliente_id: string
          created_at?: string | null
          criado_por?: string | null
          descricao: string
          id?: string
          tipo: string
        }
        Update: {
          automatico?: boolean | null
          cliente_id?: string
          created_at?: string | null
          criado_por?: string | null
          descricao?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          dias_atraso_max: number | null
          dias_inadimplente: number | null
          diretor: string | null
          email: string | null
          executivo_responsavel: string | null
          id: string
          juros_total: number | null
          nome: string
          qtd_pagamentos_atraso: number | null
          regional: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
          valor_inadimplente_total: number | null
          valor_recuperado_total: number | null
          valor_total_atraso: number | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dias_atraso_max?: number | null
          dias_inadimplente?: number | null
          diretor?: string | null
          email?: string | null
          executivo_responsavel?: string | null
          id?: string
          juros_total?: number | null
          nome: string
          qtd_pagamentos_atraso?: number | null
          regional?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_inadimplente_total?: number | null
          valor_recuperado_total?: number | null
          valor_total_atraso?: number | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dias_atraso_max?: number | null
          dias_inadimplente?: number | null
          diretor?: string | null
          email?: string | null
          executivo_responsavel?: string | null
          id?: string
          juros_total?: number | null
          nome?: string
          qtd_pagamentos_atraso?: number | null
          regional?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_inadimplente_total?: number | null
          valor_recuperado_total?: number | null
          valor_total_atraso?: number | null
        }
        Relationships: []
      }
      contas_a_receber: {
        Row: {
          anotacoes: string | null
          boleto_vitbank: number | null
          cliente_id: string
          comentarios: Json
          created_at: string | null
          data_cobranca: string | null
          data_pagamento: string | null
          data_pagamento_efetivo: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string | null
          dias_atraso: number | null
          faturamento_ref: string | null
          forma_pagamento: string | null
          id: string
          imposto: string | null
          is_inadimplente: boolean | null
          juros: number | null
          mes_recuperacao: string | null
          mes_referencia: string | null
          monetali: number | null
          motivo: string | null
          origem_dado: string | null
          pgto_boleto: string | null
          pgto_monetali: string | null
          pgto_pix: string | null
          pgto_vitbank: string | null
          pix_monetali: number | null
          status: string | null
          status_planilha: string | null
          sync_hash: string | null
          updated_at: string | null
          valor: number
          valor_compensacao: number | null
          valor_inadimplente: number | null
          valor_pago_efetivo: number | null
          valor_pago_monetali: number | null
          valor_pago_vitbank: number | null
          vcto_boleto: string | null
          vcto_monetali: string | null
          vcto_pix: string | null
          vcto_vitbank: string | null
          vitbank: number | null
        }
        Insert: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Update: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id?: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
        ]
      }
      flags_cliente: {
        Row: {
          cliente_id: string
          cor: string | null
          created_at: string | null
          id: string
          nome_flag: string
        }
        Insert: {
          cliente_id: string
          cor?: string | null
          created_at?: string | null
          id?: string
          nome_flag: string
        }
        Update: {
          cliente_id?: string
          cor?: string | null
          created_at?: string | null
          id?: string
          nome_flag?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
        ]
      }
      flags_disponiveis: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      importacoes_manuais: {
        Row: {
          arquivo_nome: string
          arquivo_tamanho_bytes: number | null
          detalhes: Json
          finalizado_em: string | null
          id: string
          iniciado_em: string
          mapeamento_colunas: Json
          preset: string | null
          qtd_atualizados: number
          qtd_erros: number
          qtd_ignorados: number
          qtd_inseridos: number
          qtd_linhas_planilha: number
          status: string
          tipo_destino: string
          usuario_id: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_tamanho_bytes?: number | null
          detalhes?: Json
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          mapeamento_colunas?: Json
          preset?: string | null
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_linhas_planilha?: number
          status?: string
          tipo_destino: string
          usuario_id?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_tamanho_bytes?: number | null
          detalhes?: Json
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          mapeamento_colunas?: Json
          preset?: string | null
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_linhas_planilha?: number
          status?: string
          tipo_destino?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_manuais_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          id: string
          observacao: string | null
          periodo: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          id?: string
          observacao?: string | null
          periodo: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor: number
        }
        Update: {
          id?: string
          observacao?: string | null
          periodo?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_atraso: {
        Row: {
          anotacoes: string | null
          boleto_vitbank: number | null
          cliente_id: string
          comentarios: Json
          created_at: string | null
          data_cobranca: string | null
          data_pagamento: string | null
          data_pagamento_efetivo: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string | null
          dias_atraso: number | null
          faturamento_ref: string | null
          forma_pagamento: string | null
          id: string
          imposto: string | null
          is_inadimplente: boolean | null
          juros: number | null
          mes_recuperacao: string | null
          mes_referencia: string | null
          monetali: number | null
          motivo: string | null
          origem_dado: string | null
          pgto_boleto: string | null
          pgto_monetali: string | null
          pgto_pix: string | null
          pgto_vitbank: string | null
          pix_monetali: number | null
          status: string | null
          status_planilha: string | null
          sync_hash: string | null
          updated_at: string | null
          valor: number
          valor_compensacao: number | null
          valor_inadimplente: number | null
          valor_pago_efetivo: number | null
          valor_pago_monetali: number | null
          valor_pago_vitbank: number | null
          vcto_boleto: string | null
          vcto_monetali: string | null
          vcto_pix: string | null
          vcto_vitbank: string | null
          vitbank: number | null
        }
        Insert: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Update: {
          anotacoes?: string | null
          boleto_vitbank?: number | null
          cliente_id?: string
          comentarios?: Json
          created_at?: string | null
          data_cobranca?: string | null
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dias_atraso?: number | null
          faturamento_ref?: string | null
          forma_pagamento?: string | null
          id?: string
          imposto?: string | null
          is_inadimplente?: boolean | null
          juros?: number | null
          mes_recuperacao?: string | null
          mes_referencia?: string | null
          monetali?: number | null
          motivo?: string | null
          origem_dado?: string | null
          pgto_boleto?: string | null
          pgto_monetali?: string | null
          pgto_pix?: string | null
          pgto_vitbank?: string | null
          pix_monetali?: number | null
          status?: string | null
          status_planilha?: string | null
          sync_hash?: string | null
          updated_at?: string | null
          valor?: number
          valor_compensacao?: number | null
          valor_inadimplente?: number | null
          valor_pago_efetivo?: number | null
          valor_pago_monetali?: number | null
          valor_pago_vitbank?: number | null
          vcto_boleto?: string | null
          vcto_monetali?: string | null
          vcto_pix?: string | null
          vcto_vitbank?: string | null
          vitbank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_atraso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_atraso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
        ]
      }
      premissas: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recuperacoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_recebimento: string
          forma_pagamento: string | null
          id: string
          mes_referencia: string | null
          pagamento_id: string | null
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_recebimento: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          pagamento_id?: string | null
          valor?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_recebimento?: string
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string | null
          pagamento_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recuperacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_com_totais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos_atraso"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          detalhes: Json
          finalizado_em: string | null
          fonte: string
          id: string
          iniciado_em: string
          qtd_atualizados: number
          qtd_erros: number
          qtd_ignorados: number
          qtd_inseridos: number
          qtd_processados: number
          status: string
          triggered_by: string | null
        }
        Insert: {
          detalhes?: Json
          finalizado_em?: string | null
          fonte: string
          id?: string
          iniciado_em?: string
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_processados?: number
          status?: string
          triggered_by?: string | null
        }
        Update: {
          detalhes?: Json
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string
          qtd_atualizados?: number
          qtd_erros?: number
          qtd_ignorados?: number
          qtd_inseridos?: number
          qtd_processados?: number
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      clientes_com_totais: {
        Row: {
          cnpj: string | null
          created_at: string | null
          deleted_at: string | null
          dias_atraso_max: number | null
          dias_inadimplente: number | null
          diretor: string | null
          email: string | null
          encargos_monetali: number | null
          encargos_vitbank: number | null
          executivo_responsavel: string | null
          id: string | null
          inadimplente_monetali: number | null
          inadimplente_vitbank: number | null
          juros_total: number | null
          nome: string | null
          qtd_em_aberto: number | null
          qtd_pagamentos_atraso: number | null
          recuperado_monetali: number | null
          recuperado_vitbank: number | null
          regional: string | null
          status: string | null
          telefone: string | null
          total_monetali: number | null
          total_vitbank: number | null
          updated_at: string | null
          valor_inadimplente_total: number | null
          valor_recuperado_total: number | null
          valor_total_atraso: number | null
        }
        Relationships: []
      }
      vw_inadimplencia_aberta: {
        Row: {
          anotacoes: string | null
          cliente: string | null
          imposto: string | null
          status: string | null
          status_planilha: string | null
          valor_compensacao: number | null
          valor_inadimplente: number | null
          vcto_boleto: string | null
        }
        Relationships: []
      }
      vw_recuperacao_mensal: {
        Row: {
          mes_recuperacao: string | null
          qtd_pagamentos: number | null
          total_recuperado: number | null
          total_inadimplente: number | null
          qtd_clientes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
