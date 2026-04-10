import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, Check, Calculator, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/data/mockData';

/**
 * PaymentForm — Componente reutilizável para criar um novo pagamento.
 *
 * Usos:
 *  - ClientDetail.tsx: abre em modal com clienteId presente; o próprio componente
 *    insere a linha em `pagamentos_atraso` e dispara onSave após sucesso.
 *  - CadastrarPage.tsx: embute dentro de um form maior sem clienteId; o componente
 *    apenas controla os campos e expõe o estado via onChange para o pai persistir.
 */

export const IMPOSTOS_PADRAO = [
  'INSS',
  'P/C + IR/CS',
  'PIS/COFINS',
  'IRPJ/CSLL',
  'ISS',
  'ICMS',
] as const;

export const MONTH_OPTIONS = [
  { label: 'Janeiro 2026', value: '2026-01' },
  { label: 'Fevereiro 2026', value: '2026-02' },
  { label: 'Março 2026', value: '2026-03' },
  { label: 'Abril 2026', value: '2026-04' },
  { label: 'Maio 2026', value: '2026-05' },
  { label: 'Junho 2026', value: '2026-06' },
  { label: 'Julho 2026', value: '2026-07' },
  { label: 'Agosto 2026', value: '2026-08' },
  { label: 'Setembro 2026', value: '2026-09' },
  { label: 'Outubro 2026', value: '2026-10' },
  { label: 'Novembro 2026', value: '2026-11' },
  { label: 'Dezembro 2026', value: '2026-12' },
];

export interface PaymentFormValue {
  impostos: string[];
  impostoOutro: string;
  valorCompensacao: number;
  modoAutomatico: boolean;
  percentVitbank: number;
  percentMonetali: number;
  vitbank: number;
  monetali: number;
  vctoVitbank: string;
  vctoMonetali: string;
  mesReferencia: string;
}

export const emptyPaymentFormValue = (): PaymentFormValue => ({
  impostos: [],
  impostoOutro: '',
  valorCompensacao: 0,
  modoAutomatico: true,
  percentVitbank: 75,
  percentMonetali: 5,
  vitbank: 0,
  monetali: 0,
  vctoVitbank: '',
  vctoMonetali: '',
  mesReferencia: '2026-03',
});

/** Builds the concatenated imposto label: "INSS, P/C + IR/CS, Outro: XYZ" */
export const buildImpostoLabel = (v: PaymentFormValue): string => {
  const parts = [...v.impostos];
  if (v.impostoOutro.trim()) parts.push(`Outro: ${v.impostoOutro.trim()}`);
  return parts.join(', ');
};

interface PaymentFormProps {
  clienteId?: string;
  clienteNome?: string;
  initialValues?: Partial<PaymentFormValue>;
  /** Called on every state change — use when clienteId is absent (controlled mode). */
  onChange?: (value: PaymentFormValue) => void;
  /** Called after successful insert (only when clienteId is present). */
  onSave?: () => void;
  /** Called when user clicks Cancelar or X. */
  onCancel?: () => void;
  /** Hide the header (title + X) — useful when embedded inside a larger form. */
  hideHeader?: boolean;
  /** Hide the Cancelar/Salvar footer buttons — useful when parent controls the submit. */
  hideButtons?: boolean;
}

const PaymentForm = ({
  clienteId,
  clienteNome,
  initialValues,
  onChange,
  onSave,
  onCancel,
  hideHeader = false,
  hideButtons = false,
}: PaymentFormProps) => {
  const [v, setV] = useState<PaymentFormValue>(() => ({
    ...emptyPaymentFormValue(),
    ...initialValues,
  }));
  const [submitting, setSubmitting] = useState(false);

  // Propagate state changes up when embedded (controlled) mode
  useEffect(() => {
    onChange?.(v);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<PaymentFormValue>) => setV(prev => ({ ...prev, ...p }));

  const toggleImposto = (imposto: string) => {
    setV(prev => ({
      ...prev,
      impostos: prev.impostos.includes(imposto)
        ? prev.impostos.filter(i => i !== imposto)
        : [...prev.impostos, imposto],
    }));
  };

  // ─── Cálculo automático VitBank/Monetali ──────────────────────
  const computed = useMemo(() => {
    const comp = v.valorCompensacao || 0;
    const pctVb = Math.max(0, Math.min(100, v.percentVitbank || 0));
    const pctMon = Math.max(0, Math.min(100, v.percentMonetali || 0));

    if (v.modoAutomatico) {
      const vb = Math.round(comp * (pctVb / 100) * 100) / 100;
      const mn = Math.round(comp * (pctMon / 100) * 100) / 100;
      return {
        pctVb,
        pctMon,
        vitbank: vb,
        monetali: mn,
        soma: Math.round((vb + mn) * 100) / 100,
      };
    }
    return {
      pctVb,
      pctMon,
      vitbank: v.vitbank || 0,
      monetali: v.monetali || 0,
      soma: Math.round(((v.vitbank || 0) + (v.monetali || 0)) * 100) / 100,
    };
  }, [v.valorCompensacao, v.percentVitbank, v.modoAutomatico, v.vitbank, v.monetali]);

  // Keep the canonical vitbank/monetali in the value object up to date when auto
  useEffect(() => {
    if (v.modoAutomatico) {
      if (v.vitbank !== computed.vitbank || v.monetali !== computed.monetali) {
        setV(prev => ({ ...prev, vitbank: computed.vitbank, monetali: computed.monetali }));
      }
    }
  }, [v.modoAutomatico, computed.vitbank, computed.monetali]); // eslint-disable-line react-hooks/exhaustive-deps

  const somaDiferenteDaCompensacao =
    !v.modoAutomatico &&
    v.valorCompensacao > 0 &&
    Math.abs(computed.soma - v.valorCompensacao) > 0.01;

  // ─── Validation ───────────────────────────────────────────────
  const validate = (): string | null => {
    if (v.impostos.length === 0 && !v.impostoOutro.trim())
      return 'Selecione pelo menos um imposto.';
    if (!v.valorCompensacao || v.valorCompensacao <= 0)
      return 'Valor Compensação é obrigatório e deve ser maior que zero.';
    if (!v.vctoVitbank && !v.vctoMonetali)
      return 'Informe ao menos uma data de vencimento (VitBank ou Monetali).';
    if (!v.modoAutomatico && somaDiferenteDaCompensacao)
      return `Soma VitBank + Monetali (${formatCurrency(computed.soma)}) deve bater com o valor de compensação (${formatCurrency(v.valorCompensacao)}).`;
    if (!v.mesReferencia) return 'Mês de referência é obrigatório.';
    return null;
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (!clienteId) {
      // When absent, parent handles saving — just nudge via onChange (already up to date)
      toast.error('Cliente não informado — fluxo deve ser tratado pelo formulário pai.');
      return;
    }
    setSubmitting(true);
    try {
      const impostoLabel = buildImpostoLabel(v);
      const comp = v.valorCompensacao;
      const vb = computed.vitbank;
      const mn = computed.monetali;
      const vctos = [v.vctoVitbank, v.vctoMonetali].filter(Boolean).sort();
      const dataVencimento = vctos[0] || new Date().toISOString().split('T')[0];

      const { error: pagErr } = await supabase
        .from('pagamentos_atraso')
        .insert({
          cliente_id: clienteId,
          descricao: impostoLabel,
          valor: comp,
          valor_compensacao: comp,
          imposto: impostoLabel,
          vitbank: vb,
          vcto_vitbank: v.vctoVitbank || null,
          monetali: mn,
          vcto_monetali: v.vctoMonetali || null,
          mes_referencia: v.mesReferencia,
          data_vencimento: dataVencimento,
          status: 'em_aberto',
        });

      if (pagErr) throw new Error(pagErr.message);

      toast.success('Pagamento cadastrado com sucesso');
      onSave?.();
    } catch (e: any) {
      console.error('PaymentForm save error:', e);
      toast.error(`Erro ao cadastrar pagamento: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────
  const inputCls =
    'w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors';
  const inputMonoCls = `${inputCls} font-mono`;
  const readonlyCls =
    'w-full px-3 py-2 bg-muted/40 border border-border/30 rounded-lg text-sm font-mono text-muted-foreground cursor-not-allowed';
  const labelCls = 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1';

  return (
    <div className="space-y-5">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold font-display">Novo Pagamento</h3>
            {clienteNome && (
              <p className="text-xs text-muted-foreground mt-0.5">Cliente: {clienteNome}</p>
            )}
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* ═══ Impostos (seleção múltipla) ═══ */}
      <div>
        <label className={labelCls}>Impostos</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {IMPOSTOS_PADRAO.map(imp => {
            const checked = v.impostos.includes(imp);
            return (
              <button
                key={imp}
                type="button"
                onClick={() => toggleImposto(imp)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                  checked
                    ? 'bg-primary/15 border-primary/40 text-foreground'
                    : 'bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
                aria-pressed={checked}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                    checked ? 'bg-primary border-primary' : 'border-border'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                {imp}
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Outro (texto livre)
          </label>
          <input
            type="text"
            value={v.impostoOutro}
            onChange={e => patch({ impostoOutro: e.target.value })}
            placeholder="Ex: Taxa Municipal, contribuição especial..."
            className={inputCls}
          />
        </div>
        {(v.impostos.length > 0 || v.impostoOutro.trim()) && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Selecionado: <span className="font-mono">{buildImpostoLabel(v)}</span>
          </p>
        )}
      </div>

      {/* ═══ Valor Compensação ═══ */}
      <div>
        <label className={labelCls}>Valor Compensação (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={v.valorCompensacao || ''}
          onChange={e => patch({ valorCompensacao: parseFloat(e.target.value) || 0 })}
          placeholder="0,00"
          className={inputMonoCls}
        />
      </div>

      {/* ═══ Cálculo automático ═══ */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Cálculo VitBank / Monetali
          </p>
        </div>

        {/* Toggle automático/manual */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => patch({ modoAutomatico: true })}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              v.modoAutomatico
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Usar cálculo automático
          </button>
          <button
            type="button"
            onClick={() => patch({ modoAutomatico: false })}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              !v.modoAutomatico
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Digitar manualmente
          </button>
        </div>

        {v.modoAutomatico ? (
          <>
            {/* Percentages */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  % VitBank
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={v.percentVitbank}
                    onChange={e =>
                      patch({
                        percentVitbank: Math.max(
                          0,
                          Math.min(100, parseFloat(e.target.value) || 0)
                        ),
                      })
                    }
                    className={`${inputMonoCls} pr-7`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  % Monetali
                </label>
                <div className="relative">
                  <input
                    type="text"
              type="number"
              step="1"
              min="0"
              max="100"
              value={v.percentMonetali}
              onChange={e =>
                patch({
                  percentMonetali: Math.max(
                    0,
                    Math.min(100, parseFloat(e.target.value) || 0)
                  ),
                })
              }
              className={`${inputMonoCls} pr-7`}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Calculated values */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-partial/10 border border-partial/25 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">VitBank</p>
                <p className="text-sm font-mono font-bold text-partial">
                  {formatCurrency(computed.vitbank)}
                </p>
              </div>
              <div className="bg-recovered/10 border border-recovered/25 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monetali</p>
                <p className="text-sm font-mono font-bold text-recovered">
                  {formatCurrency(computed.monetali)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Manual inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  VitBank (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={v.vitbank || ''}
                  onChange={e => patch({ vitbank: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className={inputMonoCls}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Monetali (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={v.monetali || ''}
                  onChange={e => patch({ monetali: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className={inputMonoCls}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Soma VitBank + Monetali</span>
              <span
                className={`font-mono font-bold ${
                  somaDiferenteDaCompensacao ? 'text-overdue' : 'text-recovered'
                }`}
              >
                {formatCurrency(computed.soma)}
              </span>
            </div>
            {somaDiferenteDaCompensacao && (
              <div className="flex items-start gap-2 text-[11px] text-overdue bg-overdue/10 border border-overdue/20 rounded-lg px-2 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Diferença de {formatCurrency(Math.abs(computed.soma - v.valorCompensacao))} entre a soma e o valor de compensação.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Datas de vencimento ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Vcto VitBank</label>
          <input
            type="date"
            value={v.vctoVitbank}
            onChange={e => patch({ vctoVitbank: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Vcto Monetali</label>
          <input
            type="date"
            value={v.vctoMonetali}
            onChange={e => patch({ vctoMonetali: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* ═══ Mês de referência ═══ */}
      <div>
        <label className={labelCls}>Mês de Referência</label>
        <select
          value={v.mesReferencia}
          onChange={e => patch({ mesReferencia: e.target.value })}
          className={inputCls}
        >
          {MONTH_OPTIONS.map(m => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* ═══ Footer buttons ═══ */}
      {!hideButtons && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Salvar Pagamento
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
