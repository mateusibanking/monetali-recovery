import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface DadosMes {
  mes: string;               // '2026-01'
  mesLabel: string;           // 'Jan'

  recebido_vitbank: number;
  recebido_monetali: number;
  recebido_total: number;
  qtd_recebidos: number;

  pendente_vitbank: number;
  pendente_monetali: number;
  pendente_total: number;
  qtd_pendentes: number;

  vencido_vitbank: number;
  vencido_monetali: number;
  vencido_total: number;
  qtd_vencidos: number;
}

interface UseEvolucaoReturn {
  data: DadosMes[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Return YYYY-MM-DD for the first day of a month */
const mesStart = (ano: number, mes: number) =>
  `${ano}-${String(mes).padStart(2, '0')}-01`;

/** Return YYYY-MM-DD for the first day of the NEXT month */
const mesEnd = (ano: number, mes: number) => {
  if (mes === 12) return `${ano + 1}-01-01`;
  return `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
};

type PagRow = {
  id: string;
  vitbank: number | null;
  monetali: number | null;
  vcto_vitbank: string | null;
  pgto_vitbank: string | null;
  vcto_monetali: string | null;
  pgto_monetali: string | null;
};

export function useEvolucao(ano: number = 2026): UseEvolucaoReturn {
  const [data, setData] = useState<DadosMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvolucao = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ALL active payments for the year in one query (efficient)
      const anoStart = `${ano}-01-01`;
      const anoEnd = `${ano + 1}-01-01`;

      const { data: pagamentos, error: pagErr } = await supabase
        .from('pagamentos_atraso')
        .select('id, vitbank, monetali, vcto_vitbank, pgto_vitbank, vcto_monetali, pgto_monetali')
        .is('deleted_at', null);

      if (pagErr) throw pagErr;

      const pags = (pagamentos ?? []) as PagRow[];
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const result: DadosMes[] = [];

      for (let m = 1; m <= 12; m++) {
        const start = mesStart(ano, m);
        const end = mesEnd(ano, m);
        const mesStr = `${ano}-${String(m).padStart(2, '0')}`;

        let rec_vb = 0, rec_mn = 0, qtd_rec = 0;
        let pen_vb = 0, pen_mn = 0, qtd_pen = 0;
        let ven_vb = 0, ven_mn = 0, qtd_ven = 0;

        // Track unique payment IDs per category
        const recIds = new Set<string>();
        const penIds = new Set<string>();
        const venIds = new Set<string>();

        for (const p of pags) {
          const vb = Number(p.vitbank) || 0;
          const mn = Number(p.monetali) || 0;

          // --- RECEBIDOS: pagamento feito no mês ---
          const pgtoVb = p.pgto_vitbank;
          const pgtoMn = p.pgto_monetali;
          let isRecebido = false;

          if (pgtoVb && pgtoVb >= start && pgtoVb < end && vb > 0) {
            rec_vb += vb;
            isRecebido = true;
          }
          if (pgtoMn && pgtoMn >= start && pgtoMn < end && mn > 0) {
            rec_mn += mn;
            isRecebido = true;
          }
          if (isRecebido) recIds.add(p.id);

          // --- PENDENTES: vencimento no mês, ainda não pago ---
          const vctoVb = p.vcto_vitbank;
          const vctoMn = p.vcto_monetali;
          let isPendente = false;

          if (vctoVb && vctoVb >= start && vctoVb < end && !pgtoVb && vb > 0) {
            pen_vb += vb;
            isPendente = true;
          }
          if (vctoMn && vctoMn >= start && vctoMn < end && !pgtoMn && mn > 0) {
            pen_mn += mn;
            isPendente = true;
          }
          if (isPendente) penIds.add(p.id);

          // --- VENCIDOS: vencimento antes do fim do mês E antes de hoje, não pago ---
          const limiteVen = end < hoje ? end : hoje; // vencido até hoje OU até fim do mês (o que for menor)
          let isVencido = false;

          if (vctoVb && vctoVb < limiteVen && !pgtoVb && vb > 0 && vctoVb >= start) {
            ven_vb += vb;
            isVencido = true;
          }
          if (vctoMn && vctoMn < limiteVen && !pgtoMn && mn > 0 && vctoMn >= start) {
            ven_mn += mn;
            isVencido = true;
          }
          if (isVencido) venIds.add(p.id);
        }

        result.push({
          mes: mesStr,
          mesLabel: MES_LABELS[m - 1],
          recebido_vitbank: Math.round(rec_vb * 100) / 100,
          recebido_monetali: Math.round(rec_mn * 100) / 100,
          recebido_total: Math.round((rec_vb + rec_mn) * 100) / 100,
          qtd_recebidos: recIds.size,
          pendente_vitbank: Math.round(pen_vb * 100) / 100,
          pendente_monetali: Math.round(pen_mn * 100) / 100,
          pendente_total: Math.round((pen_vb + pen_mn) * 100) / 100,
          qtd_pendentes: penIds.size,
          vencido_vitbank: Math.round(ven_vb * 100) / 100,
          vencido_monetali: Math.round(ven_mn * 100) / 100,
          vencido_total: Math.round((ven_vb + ven_mn) * 100) / 100,
          qtd_vencidos: venIds.size,
        });
      }

      setData(result);
    } catch (err: any) {
      console.error('useEvolucao fetch error:', err);
      setError(err.message || 'Erro ao carregar evolução');
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => {
    fetchEvolucao();
  }, [fetchEvolucao]);

  return { data, loading, error, refetch: fetchEvolucao };
}
