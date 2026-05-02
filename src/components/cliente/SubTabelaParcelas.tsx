import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MoreVertical, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useParcelamento, type ParcelaRow } from '@/hooks/useParcelamento';
import type { Payment } from '@/data/mockData';

interface Props {
  paymentId: string;
  refreshKey?: number; // muda pra forçar re-fetch externo
  onMarkPaidParcela: (parcela: Payment, side: 'vitbank' | 'monetali') => void;
  onEditPaidParcela: (parcela: Payment, side: 'vitbank' | 'monetali') => void;
  onDesfazerParcelamento: (paymentId: string) => void;
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR');
}

type StatusParcela = 'Pago' | 'Parcial' | 'Em aberto' | 'Vencido';

function calcStatus(p: ParcelaRow): StatusParcela {
  const vbPago = !!(p as any).pgto_vitbank;
  const monPago = !!(p as any).pgto_monetali;
  const temVB = (Number(p.vitbank) || 0) > 0;
  const temMon = (Number(p.monetali) || 0) > 0;

  if (temVB && temMon) {
    if (vbPago && monPago) return 'Pago';
    if (vbPago || monPago) return 'Parcial';
  } else if (temVB && vbPago) return 'Pago';
  else if (temMon && monPago) return 'Pago';

  // Verificar vencido
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vctos: Date[] = [];
  if (temVB && !vbPago && p.vcto_vitbank) vctos.push(new Date(p.vcto_vitbank));
  if (temMon && !monPago && p.vcto_monetali) vctos.push(new Date(p.vcto_monetali));
  for (const v of vctos) {
    if (!isNaN(v.getTime()) && v < hoje) return 'Vencido';
  }
  return 'Em aberto';
}

function statusBadge(s: StatusParcela): string {
  switch (s) {
    case 'Pago': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Parcial': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Vencido': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

// Mapear ParcelaRow do banco -> objeto Payment-like que os modais existentes consomem
function parcelaToPayment(p: ParcelaRow): Payment {
  const r = p as any;
  return {
    id: p.id,
    valor: Number(r.valor) || 0,
    dataVencimento: r.data_vencimento || r.vcto_vitbank || r.vcto_monetali || '',
    descricao: r.descricao || `Parcela ${p.numero_parcela ?? ''}`,
    status: 'Pendente',
    vitbank: Number(p.vitbank) || 0,
    vctoVitbank: r.vcto_vitbank || null,
    pgtoVitbank: r.pgto_vitbank || null,
    valorPagoVitbank: Number(r.valor_pago_vitbank) || 0,
    monetali: Number(p.monetali) || 0,
    vctoMonetali: r.vcto_monetali || null,
    pgtoMonetali: r.pgto_monetali || null,
    valorPagoMonetali: Number(r.valor_pago_monetali) || 0,
    imposto: Number(r.imposto) || 0,
    valorCompensacao: Number(r.valor_compensacao) || 0,
    juros: Number(r.juros) || 0,
    mesReferencia: r.mes_referencia || null,
    dataCobranca: r.data_cobranca || null,
    dataPagamento: r.data_pagamento || null,
    isInadimplente: r.is_inadimplente ?? true,
    valorPagoEfetivo: Number(r.valor_pago_efetivo) || 0,
    valorInadimplente: Number(r.valor_inadimplente) || 0,
    dataPagamentoEfetivo: r.data_pagamento_efetivo || null,
    mesRecuperacao: r.mes_recuperacao || null,
  } as Payment;
}

const SubTabelaParcelas: React.FC<Props> = ({
  paymentId,
  refreshKey,
  onMarkPaidParcela,
  onEditPaidParcela,
  onDesfazerParcelamento,
}) => {
  const { buscarParcelas } = useParcelamento();
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDesfazer, setConfirmDesfazer] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchParcelas = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await buscarParcelas(paymentId);
      setParcelas(rows);
    } finally {
      setLoading(false);
    }
  }, [paymentId, buscarParcelas]);

  useEffect(() => {
    fetchParcelas();
  }, [fetchParcelas, refreshKey]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!openMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openMenu]);

  // Totais
  const totalVB = parcelas.reduce((s, p) => s + (Number(p.vitbank) || 0), 0);
  const totalMon = parcelas.reduce((s, p) => s + (Number(p.monetali) || 0), 0);
  const pagoVB = parcelas.reduce((s, p) => s + (Number((p as any).valor_pago_vitbank) || 0), 0);
  const pagoMon = parcelas.reduce((s, p) => s + (Number((p as any).valor_pago_monetali) || 0), 0);

  const handleAcao = (parcela: ParcelaRow, action: 'mark-vb' | 'mark-mon' | 'edit-vb' | 'edit-mon') => {
    setOpenMenu(null);
    const pay = parcelaToPayment(parcela);
    if (action === 'mark-vb') onMarkPaidParcela(pay, 'vitbank');
    else if (action === 'mark-mon') onMarkPaidParcela(pay, 'monetali');
    else if (action === 'edit-vb') onEditPaidParcela(pay, 'vitbank');
    else if (action === 'edit-mon') onEditPaidParcela(pay, 'monetali');
  };

  if (loading) {
    return (
      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando parcelas...
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-violet-700">— Parcelas ({parcelas.length}) —</h5>

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-[11px]">
          <thead className="bg-secondary/30">
            <tr>
              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold uppercase tracking-wider w-8">#</th>
              <th className="px-2 py-1.5 text-left text-blue-700 font-semibold uppercase tracking-wider">Vcto VB</th>
              <th className="px-2 py-1.5 text-left text-blue-700 font-semibold uppercase tracking-wider">Pgto VB</th>
              <th className="px-2 py-1.5 text-right text-blue-700 font-semibold uppercase tracking-wider">Valor VB</th>
              <th className="px-2 py-1.5 text-right text-blue-700 font-semibold uppercase tracking-wider">Pago VB</th>
              <th className="px-2 py-1.5 text-left text-emerald-700 font-semibold uppercase tracking-wider">Vcto Mon</th>
              <th className="px-2 py-1.5 text-left text-emerald-700 font-semibold uppercase tracking-wider">Pgto Mon</th>
              <th className="px-2 py-1.5 text-right text-emerald-700 font-semibold uppercase tracking-wider">Valor Mon</th>
              <th className="px-2 py-1.5 text-right text-emerald-700 font-semibold uppercase tracking-wider">Pago Mon</th>
              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
              <th className="px-2 py-1.5 text-center text-muted-foreground font-semibold uppercase tracking-wider w-10">Ações</th>
            </tr>
          </thead>
          <tbody>
            {parcelas.map((p, idx) => {
              const r = p as any;
              const vbPago = !!r.pgto_vitbank;
              const monPago = !!r.pgto_monetali;
              const temVB = (Number(p.vitbank) || 0) > 0;
              const temMon = (Number(p.monetali) || 0) > 0;
              const status = calcStatus(p);
              const numero = p.numero_parcela ?? (idx + 1);
              return (
                <tr key={p.id} className="border-t border-border/40 hover:bg-secondary/20">
                  <td className="px-2 py-1.5 font-mono text-muted-foreground">{numero}</td>
                  <td className="px-2 py-1.5 font-mono">{formatDate(r.vcto_vitbank)}</td>
                  <td className={`px-2 py-1.5 font-mono ${vbPago ? 'text-emerald-700 font-semibold' : 'text-muted-foreground'}`}>{formatDate(r.pgto_vitbank)}</td>
                  <td className="px-2 py-1.5 font-mono text-right">{temVB ? formatCurrency(Number(p.vitbank) || 0) : '—'}</td>
                  <td className={`px-2 py-1.5 font-mono text-right ${vbPago ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                    {temVB ? formatCurrency(Number(r.valor_pago_vitbank) || 0) : '—'}
                  </td>
                  <td className="px-2 py-1.5 font-mono">{formatDate(r.vcto_monetali)}</td>
                  <td className={`px-2 py-1.5 font-mono ${monPago ? 'text-emerald-700 font-semibold' : 'text-muted-foreground'}`}>{formatDate(r.pgto_monetali)}</td>
                  <td className="px-2 py-1.5 font-mono text-right">{temMon ? formatCurrency(Number(p.monetali) || 0) : '—'}</td>
                  <td className={`px-2 py-1.5 font-mono text-right ${monPago ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                    {temMon ? formatCurrency(Number(r.valor_pago_monetali) || 0) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusBadge(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                      aria-label="Ações"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {openMenu === p.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 z-30 w-44 bg-card border border-border rounded-lg shadow-xl py-1 text-left">
                        {temVB && !vbPago && (
                          <button onClick={() => handleAcao(p, 'mark-vb')} className="block w-full px-3 py-1.5 text-xs text-left hover:bg-muted">Marcar VB como pago</button>
                        )}
                        {temMon && !monPago && (
                          <button onClick={() => handleAcao(p, 'mark-mon')} className="block w-full px-3 py-1.5 text-xs text-left hover:bg-muted">Marcar Mon como pago</button>
                        )}
                        {temVB && vbPago && (
                          <button onClick={() => handleAcao(p, 'edit-vb')} className="block w-full px-3 py-1.5 text-xs text-left hover:bg-muted">Editar / Desmarcar VB</button>
                        )}
                        {temMon && monPago && (
                          <button onClick={() => handleAcao(p, 'edit-mon')} className="block w-full px-3 py-1.5 text-xs text-left hover:bg-muted">Editar / Desmarcar Mon</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer com totais */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          <strong>Total parcelas:</strong>{' '}
          <span className="text-blue-700 font-mono font-semibold">VB {formatCurrency(totalVB)}</span>{' '}
          <span className="text-muted-foreground/70">({formatCurrency(pagoVB)} pago)</span>{' '}
          <span className="mx-1">|</span>{' '}
          <span className="text-emerald-700 font-mono font-semibold">Mon {formatCurrency(totalMon)}</span>{' '}
          <span className="text-muted-foreground/70">({formatCurrency(pagoMon)} pago)</span>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDesfazer(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition-colors self-start md:self-auto"
        >
          <Trash2 className="h-3.5 w-3.5" /> Desfazer Parcelamento
        </button>
      </div>

      {/* AlertDialog de confirmação */}
      {confirmDesfazer && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmDesfazer(false)}
        >
          <div
            className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold">Desfazer parcelamento?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Isso vai apagar todas as <strong>{parcelas.length}</strong> parcelas e restaurar
                  o pagamento original ao status anterior.
                </p>
                <p className="text-xs text-red-700 mt-2 bg-red-50 border border-red-100 rounded p-2">
                  ⚠️ Pagamentos já marcados como pagos nas parcelas serão perdidos.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setConfirmDesfazer(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDesfazer(false); onDesfazerParcelamento(paymentId); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Sim, desfazer parcelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubTabelaParcelas;
