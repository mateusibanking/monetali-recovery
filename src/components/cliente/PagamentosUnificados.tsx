import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import type { Payment, PaymentStatus } from '@/data/mockData';
import { calcularJurosEMulta } from '@/lib/calculos';

interface Premissas {
  taxaJurosDia: number;
  multaAtraso: number;
}

interface Props {
  payments: Payment[];
  premissas: Premissas;
  onMarkPaid: (paymentId: string, side: 'vitbank' | 'monetali') => void;
  onEditPaid: (paymentId: string, side: 'vitbank' | 'monetali') => void;
  onEditPayment: (payment: Payment) => void;
  onDeletePayment: (payment: Payment) => void;
  loading?: boolean;
  emptyMessage?: string;
}

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR');
}

function formatCompetencia(mesRef: string | null | undefined, fallback?: string | null): string {
  const candidato = mesRef || fallback;
  if (!candidato) return '—';
  const m = /^(\d{4})-(\d{2})/.exec(candidato);
  if (m) return `${m[2]}/${m[1]}`;
  const dt = new Date(candidato);
  if (isNaN(dt.getTime())) return candidato;
  return `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

type LadoCalc = {
  base: number;
  juros: number;
  multa: number;
  encargos: number;
  totalCorrigido: number;
  pago: boolean;
  noPrazo: boolean;
  diasAtraso: number;
};

function calcularLado(
  valor: number | undefined,
  vencimento: string | null | undefined,
  pagamento: string | null | undefined,
  taxaJurosDia: number,
  multaAtraso: number,
): LadoCalc {
  const base = valor || 0;
  const pago = !!pagamento;

  if (!base) {
    return { base: 0, juros: 0, multa: 0, encargos: 0, totalCorrigido: 0, pago, noPrazo: true, diasAtraso: 0 };
  }
  if (pago) {
    return { base, juros: 0, multa: 0, encargos: 0, totalCorrigido: base, pago: true, noPrazo: false, diasAtraso: 0 };
  }
  if (!vencimento) {
    return { base, juros: 0, multa: 0, encargos: 0, totalCorrigido: base, pago: false, noPrazo: true, diasAtraso: 0 };
  }
  const r = calcularJurosEMulta(base, vencimento, taxaJurosDia, multaAtraso);
  const noPrazo = r.dias === 0;
  return {
    base,
    juros: r.juros,
    multa: r.multa,
    encargos: r.total,
    totalCorrigido: Math.round((base + r.total) * 100) / 100,
    pago: false,
    noPrazo,
    diasAtraso: r.dias,
  };
}

function statusBadgeStyle(status: PaymentStatus): string {
  switch (status) {
    case 'Pago':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Parcial':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Parcelado':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'Vencido':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Pendente':
    default:
      return 'bg-rose-100 text-rose-800 border-rose-200';
  }
}

function valorCorrigidoColor(lado: LadoCalc): string {
  if (lado.pago) return 'text-emerald-600';
  if (lado.encargos > 0) return 'text-red-600';
  return 'text-muted-foreground';
}

const PagamentosUnificados: React.FC<Props> = ({
  payments,
  premissas,
  onMarkPaid,
  onEditPaid,
  onEditPayment,
  onDeletePayment,
  loading,
  emptyMessage = 'Nenhum pagamento registrado.',
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const linhas = useMemo(() => {
    return payments.map(p => {
      const vb = calcularLado(p.vitbank, p.vctoVitbank, p.pgtoVitbank, premissas.taxaJurosDia, premissas.multaAtraso);
      const mon = calcularLado(p.monetali, p.vctoMonetali, p.pgtoMonetali, premissas.taxaJurosDia, premissas.multaAtraso);
      const totalGeral = Math.round((vb.totalCorrigido + mon.totalCorrigido) * 100) / 100;
      return { p, vb, mon, totalGeral };
    });
  }, [payments, premissas.taxaJurosDia, premissas.multaAtraso]);

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Carregando pagamentos...</div>;
  }

  if (linhas.length === 0) {
    return <div className="py-8 text-center text-muted-foreground text-sm">{emptyMessage}</div>;
  }

  const toggle = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50 text-left bg-secondary/20">
            <th className="px-2 py-2 w-8"></th>
            <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Imposto</th>
            <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Competência</th>
            <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right">Valor Comp.</th>
            <th className="px-3 py-2 font-semibold text-blue-600 uppercase tracking-wider text-right">Total VitBank</th>
            <th className="px-3 py-2 font-semibold text-emerald-600 uppercase tracking-wider text-right">Total Monetali</th>
            <th className="px-3 py-2 font-semibold text-foreground uppercase tracking-wider text-right">Total Geral</th>
            <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ p, vb, mon, totalGeral }) => {
            const open = !!expanded[p.id];
            const isParcelado = p.status === 'Parcelado';
            const rowBg = vb.pago && mon.pago
              ? 'bg-emerald-50/30'
              : (vb.encargos > 0 || mon.encargos > 0)
                ? 'bg-red-50/20'
                : '';
            return (
              <React.Fragment key={p.id}>
                <tr className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${rowBg}`}>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => toggle(p.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                      aria-label={open ? 'Recolher' : 'Expandir'}
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {p.imposto != null && Number(p.imposto) > 0
                      ? formatCurrency(Number(p.imposto))
                      : (p.descricao || '—')}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {formatCompetencia(p.mesReferencia, p.dataVencimento)}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-right">
                    {formatCurrency(p.valorCompensacao || p.valor || 0)}
                  </td>
                  <td className={`px-3 py-2.5 font-mono font-semibold text-right ${valorCorrigidoColor(vb)}`}>
                    {vb.base > 0 ? formatCurrency(vb.totalCorrigido) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 font-mono font-semibold text-right ${valorCorrigidoColor(mon)}`}>
                    {mon.base > 0 ? formatCurrency(mon.totalCorrigido) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-bold text-right">
                    {formatCurrency(totalGeral)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
                {open && (
                  <tr className={`border-b border-border/30 ${rowBg}`}>
                    <td colSpan={8} className="px-3 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <LadoCard
                          titulo="VitBank"
                          accent="text-blue-600"
                          accentBg="border-blue-200 bg-blue-50/40"
                          lado={vb}
                          vencimento={p.vctoVitbank}
                          pagamento={p.pgtoVitbank}
                          valorPago={p.valorPagoVitbank ?? null}
                          taxaJurosDia={premissas.taxaJurosDia}
                          multaAtraso={premissas.multaAtraso}
                          onMark={() => onMarkPaid(p.id, 'vitbank')}
                          onEdit={() => onEditPaid(p.id, 'vitbank')}
                          esconderAcoes={isParcelado}
                          parcelado={isParcelado}
                        />
                        <LadoCard
                          titulo="Monetali"
                          accent="text-emerald-600"
                          accentBg="border-emerald-200 bg-emerald-50/40"
                          lado={mon}
                          vencimento={p.vctoMonetali}
                          pagamento={p.pgtoMonetali}
                          valorPago={p.valorPagoMonetali ?? null}
                          taxaJurosDia={premissas.taxaJurosDia}
                          multaAtraso={premissas.multaAtraso}
                          onMark={() => onMarkPaid(p.id, 'monetali')}
                          onEdit={() => onEditPaid(p.id, 'monetali')}
                          esconderAcoes={isParcelado}
                          parcelado={isParcelado}
                        />
                      </div>

                      <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-3 border-t border-border/40">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total Geral: </span>
                          <span className="font-mono font-bold text-foreground">{formatCurrency(totalGeral)}</span>
                          {isParcelado && (
                            <span className="ml-3 text-xs text-violet-700">
                              (este pagamento foi parcelado — totais consolidados nas parcelas)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditPayment(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Editar pagamento"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Editar pagamento
                          </button>
                          <button
                            onClick={() => onDeletePayment(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                            title="Excluir pagamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface LadoCardProps {
  titulo: string;
  accent: string;
  accentBg: string;
  lado: LadoCalc;
  vencimento: string | null | undefined;
  pagamento: string | null | undefined;
  valorPago: number | null;
  taxaJurosDia: number;
  multaAtraso: number;
  onMark: () => void;
  onEdit: () => void;
  esconderAcoes: boolean;
  parcelado?: boolean;
}

const LadoCard: React.FC<LadoCardProps> = ({
  titulo,
  accent,
  accentBg,
  lado,
  vencimento,
  pagamento,
  valorPago,
  taxaJurosDia,
  multaAtraso,
  onMark,
  onEdit,
  esconderAcoes,
  parcelado,
}) => {
  const semValor = lado.base === 0;
  return (
    <div className={`rounded-xl border p-4 ${accentBg} ${parcelado ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold uppercase tracking-wider ${accent}`}>{titulo}</h4>
        {parcelado ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-violet-100 text-violet-800 border-violet-200">
            Parcelado
          </span>
        ) : (lado.pago && <CheckCircle2 className="h-4 w-4 text-emerald-600" />)}
      </div>

      {semValor ? (
        <p className="text-xs text-muted-foreground italic">Sem valor para esta empresa.</p>
      ) : (
        <>
          <div className="space-y-1.5 text-xs">
            <Row label="Valor original" value={formatCurrency(lado.base)} mono />
            <Row
              label="Juros + Multa"
              value={lado.encargos > 0 ? formatCurrency(lado.encargos) : '—'}
              mono
              valueClass={lado.encargos > 0 ? 'text-red-600' : 'text-muted-foreground'}
              hint={
                lado.encargos > 0
                  ? `${lado.diasAtraso}d × ${taxaJurosDia}%/dia + multa ${multaAtraso}% (1x)`
                  : undefined
              }
            />
            <Row
              label="Valor corrigido"
              value={formatCurrency(lado.totalCorrigido)}
              mono
              valueClass={`font-bold ${valorCorrigidoColor(lado)}`}
            />
          </div>

          <div className="my-3 border-t border-border/30" />

          <div className="space-y-1.5 text-xs">
            <Row label="Vcto" value={formatDate(vencimento)} mono />
            <Row label="Pgto" value={formatDate(pagamento)} mono valueClass={pagamento ? 'text-emerald-700 font-semibold' : ''} />
            <Row
              label="Valor pago"
              value={valorPago != null && valorPago > 0 ? formatCurrency(valorPago) : '—'}
              mono
            />
          </div>

          {!esconderAcoes && (
            <div className="mt-4 flex items-center gap-2">
              {!lado.pago ? (
                <button
                  onClick={onMark}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Marcar como pago
                </button>
              ) : (
                <button
                  onClick={onEdit}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                >
                  Editar pagamento
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  valueClass?: string;
  hint?: string;
}> = ({ label, value, mono, valueClass, hint }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-muted-foreground">{label}:</span>
    <span className={`${mono ? 'font-mono' : ''} ${valueClass || 'text-foreground'}`}>
      {value}
      {hint && <span className="ml-1 text-[10px] text-muted-foreground">({hint})</span>}
    </span>
  </div>
);

export default PagamentosUnificados;
