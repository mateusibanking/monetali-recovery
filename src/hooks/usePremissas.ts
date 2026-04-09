import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Premissas } from '@/data/premissas';
import type { DbPremissa } from '@/lib/supabaseMappers';
import { calcularJurosEMulta } from '@/lib/calculos';

interface RecalcResult {
  pagamentosAtualizados: number;
  clientesAtualizados: number;
}

interface UsePremissasReturn {
  data: Premissas;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatePremissa: (chave: string, valor: string) => Promise<boolean>;
  recalcularJuros: () => Promise<RecalcResult>;
}

const DEFAULT_PREMISSAS: Premissas = {
  taxaJurosDia: 0.033,
  taxaJurosMes: 1.0,
  multaAtraso: 2.0,
  diasCarencia: 5,
  diasEscalacaoJuridica: 90,
  emailRemetente: 'cobranca@monetali.com.br',
  templates: [],
};

const chaveToField: Record<string, keyof Premissas> = {
  'taxa_juros_dia': 'taxaJurosDia',
  'taxa_juros_mes': 'taxaJurosMes',
  'multa_atraso': 'multaAtraso',
  'dias_carencia': 'diasCarencia',
  'dias_escalacao_juridico': 'diasEscalacaoJuridica',
  'email_remetente': 'emailRemetente',
};

export function usePremissas(): UsePremissasReturn {
  const [data, setData] = useState<Premissas>(DEFAULT_PREMISSAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPremissas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: err } = await supabase
        .from('premissas')
        .select('*');

      if (err) throw err;

      const premissas = { ...DEFAULT_PREMISSAS };
      (rows as DbPremissa[]).forEach(row => {
        const field = chaveToField[row.chave];
        if (field) {
          const numFields = ['taxaJurosDia', 'taxaJurosMes', 'multaAtraso', 'diasCarencia', 'diasEscalacaoJuridica'];
          if (numFields.includes(field)) {
            (premissas as any)[field] = parseFloat(row.valor) || 0;
          } else {
            (premissas as any)[field] = row.valor;
          }
        }
      });

      setData(premissas);
    } catch (err: any) {
      console.error('usePremissas fetch error:', err);
      setError(err.message || 'Erro ao carregar premissas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPremissas();
  }, [fetchPremissas]);

  const updatePremissa = async (chave: string, valor: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('premissas')
        .update({ valor, updated_by: 'Usuário' })
        .eq('chave', chave);

      if (err) throw err;
      await fetchPremissas();
      return true;
    } catch (err: any) {
      console.error('usePremissas update error:', err);
      return false;
    }
  };

  const recalcularJuros = async (): Promise<RecalcResult> => {
    try {
      // 1. Read current premissas from DB (fresh)
      const { data: rows, error: premErr } = await supabase
        .from('premissas')
        .select('chave, valor');
      if (premErr) throw new Error(premErr.message);

      const premMap: Record<string, number> = {};
      (rows as { chave: string; valor: string }[]).forEach(r => {
        premMap[r.chave] = parseFloat(r.valor) || 0;
      });
      const taxaJurosDia = premMap['taxa_juros_dia'] ?? 0.033;
      const multaAtraso = premMap['multa_atraso'] ?? 2.0;

      // 2. Fetch overdue payments: em_aberto, no payment date, vencimento < today
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: pagamentos, error: pagErr } = await supabase
        .from('pagamentos_atraso')
        .select('id, cliente_id, vitbank, vcto_vitbank, monetali, vcto_monetali, data_vencimento')
        .eq('status', 'em_aberto')
        .is('data_pagamento', null)
        .is('deleted_at', null)
        .lt('data_vencimento', hoje);

      if (pagErr) throw new Error(pagErr.message);

      type PagRow = {
        id: string;
        cliente_id: string;
        vitbank: number | null;
        vcto_vitbank: string | null;
        monetali: number | null;
        vcto_monetali: string | null;
        data_vencimento: string;
      };

      const pags = pagamentos as PagRow[];
      if (pags.length === 0) return { pagamentosAtualizados: 0, clientesAtualizados: 0 };

      // 3. Calculate juros + multa for each payment using the centralized util.
      //    Regra: multa é fixa (1x), juros crescem por dia.
      const hojeDate = new Date(hoje);
      const clienteIds = new Set<string>();
      let updatedCount = 0;

      for (const p of pags) {
        // VitBank side
        const vb = Number(p.vitbank) || 0;
        const rVb = calcularJurosEMulta(vb, p.vcto_vitbank, taxaJurosDia, multaAtraso, hojeDate);

        // Monetali side
        const mon = Number(p.monetali) || 0;
        const rMon = calcularJurosEMulta(mon, p.vcto_monetali, taxaJurosDia, multaAtraso, hojeDate);

        const totalJuros = Math.round((rVb.total + rMon.total) * 100) / 100;

        // 4. Update the payment
        const { error: upErr } = await supabase
          .from('pagamentos_atraso')
          .update({ juros: totalJuros })
          .eq('id', p.id);

        if (!upErr) {
          updatedCount++;
          clienteIds.add(p.cliente_id);
        }
      }

      // 5. Client totais (valor_total_atraso, juros_total, etc) are auto-synced
      // via the sync_cliente_totais() trigger on pagamentos_atraso. No extra work needed.

      return { pagamentosAtualizados: updatedCount, clientesAtualizados: clienteIds.size };
    } catch (err: any) {
      console.error('recalcularJuros error:', err);
      throw new Error(err?.message || 'Erro ao recalcular juros');
    }
  };

  return { data, loading, error, refetch: fetchPremissas, updatePremissa, recalcularJuros };
}
