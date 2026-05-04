import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedFeriados: Set<string> | null = null;
let promiseLoad: Promise<Set<string>> | null = null;

async function carregarFeriados(): Promise<Set<string>> {
  if (cachedFeriados) return cachedFeriados;
  if (promiseLoad) return promiseLoad;
  promiseLoad = (async () => {
    const { data, error } = await supabase
      .from('feriados_nacionais')
      .select('data');
    if (error) {
      // Não fatal — frontend continua sem regra de feriados (apenas fim-de-semana
      // não é considerado, mas o SQL ainda aplica a regra completa).
      console.warn('[useFeriados] erro ao carregar feriados:', error);
      cachedFeriados = new Set<string>();
      return cachedFeriados;
    }
    cachedFeriados = new Set<string>(((data ?? []) as Array<{ data: string }>).map(r => r.data));
    return cachedFeriados;
  })();
  return promiseLoad;
}

export function useFeriados() {
  const [feriados, setFeriados] = useState<Set<string> | null>(cachedFeriados);
  const [loading, setLoading] = useState<boolean>(!cachedFeriados);

  useEffect(() => {
    if (cachedFeriados) {
      setFeriados(cachedFeriados);
      setLoading(false);
      return;
    }
    let cancelled = false;
    carregarFeriados().then(f => {
      if (!cancelled) {
        setFeriados(f);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { feriados, loading };
}

/**
 * Helper síncrono — assume que feriados já foram carregados via useFeriados.
 * Retorna a próxima data útil >= input (segunda a sexta, não-feriado-nacional).
 * Se input já é dia útil, retorna o próprio input.
 *
 * Aceita Date ou string ISO ('YYYY-MM-DD'). String é interpretada como meio-dia
 * local pra evitar problemas de fuso na conversão.
 */
export function proximoDiaUtilSync(d: Date | string, feriados: Set<string>): Date {
  let date: Date;
  if (typeof d === 'string') {
    // Pega só a parte de data (YYYY-MM-DD) e força meio-dia
    const dateOnly = d.length >= 10 ? d.slice(0, 10) : d;
    date = new Date(dateOnly + 'T12:00:00');
  } else {
    date = new Date(d);
  }
  for (let i = 0; i < 14; i++) {
    const dow = date.getDay();
    const iso = date.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) return date;
    date.setDate(date.getDate() + 1);
  }
  return date; // fallback
}
