import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Payment } from '@/data/mockData';
import { useParcelamento, type EmpresaParcelamento, type Parcela } from '@/hooks/useParcelamento';

interface Props {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}

const TOLERANCIA = 1.0; // R$ 1,00 de tolerância na soma
const OPCOES_PARCELAS = [2, 3, 4, 5, 6, 8, 10, 12];

interface ParcelaForm {
  vctoVB: string;
  valorVB: number;
  vctoMon: string;
  valorMon: number;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addMonths(isoDate: string, months: number): string {
  const dt = new Date(isoDate);
  if (isNaN(dt.getTime())) return isoDate;
  dt.setMonth(dt.getMonth() + months);
  return dt.toISOString().split('T')[0];
}

function maiorData(a: string | null | undefined, b: string | null | undefined): string {
  const da = a ? new Date(a) : null;
  const db = b ? new Date(b) : null;
  if (da && db) return (da >= db ? da : db).toISOString().split('T')[0];
  if (da) return da.toISOString().split('T')[0];
  if (db) return db.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

function dividirIgualmente(total: number, n: number): number[] {
  if (n <= 0) return [];
  const valor = round2(total / n);
  const arr = Array(n).fill(valor);
  // Ajuste de centavos na última parcela
  const soma = round2(valor * n);
  arr[n - 1] = round2(arr[n - 1] + (total - soma));
  return arr;
}

const ModalParcelamento: React.FC<Props> = ({ payment, onClose, onSuccess }) => {
  const { criarParcelamento, processando } = useParcelamento();

  const valorVBOriginal = Number(payment.vitbank) || 0;
  const valorMonOriginal = Number(payment.monetali) || 0;
  const temVB = valorVBOriginal > 0;
  const temMon = valorMonOriginal > 0;

  // Empresa default: ambos se ambos têm valor; senão a única que tem
  const empresaDefault: EmpresaParcelamento =
    temVB && temMon ? 'ambos' : temVB ? 'vitbank' : 'monetali';

  const [empresa, setEmpresa] = useState<EmpresaParcelamento>(empresaDefault);
  const [n, setN] = useState<number>(4);
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);

  // Recalcular parcelas quando muda empresa ou número
  useEffect(() => {
    const dataInicial = maiorData(payment.vctoVitbank, payment.vctoMonetali);
    const valoresVB = empresa !== 'monetali' ? dividirIgualmente(valorVBOriginal, n) : Array(n).fill(0);
    const valoresMon = empresa !== 'vitbank' ? dividirIgualmente(valorMonOriginal, n) : Array(n).fill(0);

    const novas: ParcelaForm[] = [];
    for (let i = 0; i < n; i++) {
      const dt = addMonths(dataInicial, i + 1);
      novas.push({
        vctoVB: dt,
        valorVB: valoresVB[i],
        vctoMon: dt,
        valorMon: valoresMon[i],
      });
    }
    setParcelas(novas);
  }, [empresa, n, valorVBOriginal, valorMonOriginal, payment.vctoVitbank, payment.vctoMonetali]);

  const somaVB = useMemo(() => round2(parcelas.reduce((s, p) => s + (Number(p.valorVB) || 0), 0)), [parcelas]);
  const somaMon = useMemo(() => round2(parcelas.reduce((s, p) => s + (Number(p.valorMon) || 0), 0)), [parcelas]);

  const diffVB = round2(somaVB - valorVBOriginal);
  const diffMon = round2(somaMon - valorMonOriginal);

  const validVB = empresa === 'monetali' || Math.abs(diffVB) <= TOLERANCIA;
  const validMon = empresa === 'vitbank' || Math.abs(diffMon) <= TOLERANCIA;
  const podeCriar = validVB && validMon && !processando;

  const updateParcela = (idx: number, field: keyof ParcelaForm, value: string | number) => {
    setParcelas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleCriar = async () => {
    const config = {
      pagamento_id: payment.id,
      empresa,
      parcelas: parcelas.map(p => {
        const parc: Parcela = {};
        if (empresa !== 'monetali') {
          parc.valor_vitbank = round2(Number(p.valorVB) || 0);
          parc.data_vitbank = p.vctoVB;
        }
        if (empresa !== 'vitbank') {
          parc.valor_monetali = round2(Number(p.valorMon) || 0);
          parc.data_monetali = p.vctoMon;
        }
        return parc;
      }),
    };
    const res = await criarParcelamento(config);
    if (res.sucesso) {
      onSuccess();
      onClose();
    }
  };

  const showVB = empresa !== 'monetali';
  const showMon = empresa !== 'vitbank';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-lg font-semibold font-display">Lançar Parcelamento</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contexto do pagamento original */}
          <div className="bg-secondary/30 border border-border/30 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">Pagamento original:</span>
              <span className="font-medium text-foreground">{payment.descricao || '—'}</span>
              {payment.mesReferencia && <span className="text-muted-foreground">— {payment.mesReferencia}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">Valor original VitBank:</span>
              <span className="font-mono text-foreground">{formatCurrency(valorVBOriginal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-36 shrink-0">Valor original Monetali:</span>
              <span className="font-mono text-foreground">{formatCurrency(valorMonOriginal)}</span>
            </div>
          </div>

          {/* Seleção de empresa */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
              Empresa a parcelar
            </label>
            <div className="flex flex-wrap gap-3">
              <label className={`inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${empresa === 'vitbank' ? 'border-primary bg-primary/10' : 'border-border'} ${!temVB ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="empresa"
                  value="vitbank"
                  checked={empresa === 'vitbank'}
                  onChange={() => setEmpresa('vitbank')}
                  disabled={!temVB}
                />
                <span className="text-sm">VitBank apenas</span>
              </label>
              <label className={`inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${empresa === 'monetali' ? 'border-primary bg-primary/10' : 'border-border'} ${!temMon ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="empresa"
                  value="monetali"
                  checked={empresa === 'monetali'}
                  onChange={() => setEmpresa('monetali')}
                  disabled={!temMon}
                />
                <span className="text-sm">Monetali apenas</span>
              </label>
              <label className={`inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${empresa === 'ambos' ? 'border-primary bg-primary/10' : 'border-border'} ${!(temVB && temMon) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="empresa"
                  value="ambos"
                  checked={empresa === 'ambos'}
                  onChange={() => setEmpresa('ambos')}
                  disabled={!(temVB && temMon)}
                />
                <span className="text-sm">Ambos</span>
              </label>
            </div>
          </div>

          {/* Número de parcelas */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
              Número de parcelas
            </label>
            <select
              value={n}
              onChange={e => setN(Number(e.target.value))}
              className="px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {OPCOES_PARCELAS.map(opt => (
                <option key={opt} value={opt}>{opt} parcelas</option>
              ))}
            </select>
          </div>

          {/* Tabela de parcelas */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
              Parcelas
            </label>
            <div className="border border-border/50 rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold uppercase tracking-wider w-10">#</th>
                    {showVB && (
                      <>
                        <th className="px-3 py-2 text-left text-blue-700 font-semibold uppercase tracking-wider">Vcto VB</th>
                        <th className="px-3 py-2 text-right text-blue-700 font-semibold uppercase tracking-wider">Valor VB</th>
                      </>
                    )}
                    {showMon && (
                      <>
                        <th className="px-3 py-2 text-left text-emerald-700 font-semibold uppercase tracking-wider">Vcto Mon</th>
                        <th className="px-3 py-2 text-right text-emerald-700 font-semibold uppercase tracking-wider">Valor Mon</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-3 py-1.5 text-muted-foreground font-mono">{i + 1}</td>
                      {showVB && (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={p.vctoVB}
                              onChange={e => updateParcela(i, 'vctoVB', e.target.value)}
                              className="w-full px-2 py-1 bg-background border border-border/50 rounded text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={p.valorVB}
                              onChange={e => updateParcela(i, 'valorVB', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-background border border-border/50 rounded text-xs font-mono text-right"
                            />
                          </td>
                        </>
                      )}
                      {showMon && (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={p.vctoMon}
                              onChange={e => updateParcela(i, 'vctoMon', e.target.value)}
                              className="w-full px-2 py-1 bg-background border border-border/50 rounded text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={p.valorMon}
                              onChange={e => updateParcela(i, 'valorMon', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-background border border-border/50 rounded text-xs font-mono text-right"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Validação visual */}
            <div className="mt-3 space-y-1 text-xs">
              {showVB && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Soma VB:</span>
                  <span className={`font-mono ${validVB ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(somaVB)} / {formatCurrency(valorVBOriginal)} {validVB ? '✓' : `✗ (${diffVB > 0 ? '+' : ''}${formatCurrency(diffVB)})`}
                  </span>
                </div>
              )}
              {showMon && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Soma Mon:</span>
                  <span className={`font-mono ${validMon ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(somaMon)} / {formatCurrency(valorMonOriginal)} {validMon ? '✓' : `✗ (${diffMon > 0 ? '+' : ''}${formatCurrency(diffMon)})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={processando}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCriar}
              disabled={!podeCriar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Parcelamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalParcelamento;
