import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Calendar, Mail, Phone, FileText, MessageSquare,
  CreditCard, Tag, Clock, Plus, X, Edit2, AlertCircle, CheckCircle2, CircleDot, AlertTriangle, Calculator,
  Send, Link as LinkIcon, Upload,
} from 'lucide-react';
import {
  Client, Situacao, Flag, Payment, PaymentStatus, TimelineEvent,
  formatCurrency, situacaoLabels, getFlagColor,
} from '@/data/mockData';
import { premissas as staticPremissas, type EmailTemplate } from '@/data/premissas';
import { calcularJurosEMulta } from '@/lib/calculos';
import { usePagamentos } from '@/hooks/usePagamentos';
import { useAtividades } from '@/hooks/useAtividades';
import { useFlags } from '@/hooks/useFlags';
import { usePremissas } from '@/hooks/usePremissas';
import { useClientes } from '@/hooks/useClientes';
import StatusBadge from './StatusBadge';
import LoadingSkeleton from './LoadingSkeleton';
import PaymentForm from './PaymentForm';

interface Props {
  client: Client;
  onBack: () => void;
}

const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];
const DEFAULT_FLAGS: Flag[] = ['Prioridade', 'Juros', 'Sem Contato', 'Jurídico', 'Parcelamento', 'Promessa de Pgto'];

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { bg: string; icon: typeof CheckCircle2 }> = {
  Pago: { bg: 'bg-recovered/10 text-recovered border-recovered/25', icon: CheckCircle2 },
  Pendente: { bg: 'bg-negotiation/10 text-negotiation border-negotiation/25', icon: Clock },
  Parcial: { bg: 'bg-partial/10 text-partial border-partial/25', icon: CircleDot },
  Vencido: { bg: 'bg-overdue/10 text-overdue border-overdue/25', icon: AlertTriangle },
};

const TIMELINE_ICONS: Record<string, typeof Mail> = {
  email: Mail, phone: Phone, meeting: MessageSquare, legal: FileText,
  status_change: AlertCircle, payment: CreditCard, flag: Tag, note: FileText,
};

const substituirVariaveis = (texto: string, client: Client, openPaymentsCount: number, valorTotal: number) => {
  return texto
    .replace(/\{\{nome_cliente\}\}/g, client.nome)
    .replace(/\{\{cnpj\}\}/g, client.cnpj || 'N/A')
    .replace(/\{\{valor_total\}\}/g, formatCurrency(valorTotal))
    .replace(/\{\{dias_atraso\}\}/g, String(client.diasAtraso))
    .replace(/\{\{parcelas_abertas\}\}/g, String(openPaymentsCount));
};

const ClientDetail = ({ client, onBack }: Props) => {
  // --- Supabase hooks ---
  const { update: updateCliente } = useClientes();
  const { data: payments, loading: loadingPay, create: createPayment, update: updatePaymentDb, refetch: refetchPayments } = usePagamentos(client.id);
  const { timeline, loading: loadingTimeline, create: createAtividade } = useAtividades(client.id);
  const { flagsDisponiveis, addFlag: addFlagDb, removeFlag: removeFlagDb } = useFlags(client.id);
  const { data: dbPremissas } = usePremissas();

  /** Compute juros breakdown for a single payment (real-time from premissas + dates).
   *  Skips the VitBank or Monetali side if already paid (pgto_vitbank / pgto_monetali set).
   *  Usa a função centralizada calcularJurosEMulta:
   *    - multa: fixa (1x), cobrada quando dias > 0
   *    - juros: por dia (juros simples)
   */
  const computeJurosBreakdown = (p: Payment) => {
    const taxa = dbPremissas.taxaJurosDia;
    const multaPct = dbPremissas.multaAtraso;

    const vb = p.vitbank || 0;
    const vbPaid = !!p.pgtoVitbank;
    const rVb = vb > 0 && p.vctoVitbank && !vbPaid
      ? calcularJurosEMulta(vb, p.vctoVitbank, taxa, multaPct)
      : { juros: 0, multa: 0, total: 0, dias: 0 };

    const mon = p.monetali || 0;
    const monPaid = !!p.pgtoMonetali;
    const rMon = mon > 0 && p.vctoMonetali && !monPaid
      ? calcularJurosEMulta(mon, p.vctoMonetali, taxa, multaPct)
      : { juros: 0, multa: 0, total: 0, dias: 0 };

    const round2 = (v: number) => Math.round(v * 100) / 100;

    return {
      // Totais por lado (juros + multa)
      totalVitbank: rVb.total,
      totalMonetali: rMon.total,
      // Breakdown detalhado por lado
      jurosVb: rVb.juros,
      multaVb: rVb.multa,
      jurosMon: rMon.juros,
      multaMon: rMon.multa,
      diasVb: rVb.dias,
      diasMon: rMon.dias,
      baseVb: vb,
      baseMon: mon,
      vbPaid,
      monPaid,
      // Totais agregados
      juros: round2(rVb.juros + rMon.juros),
      multa: round2(rVb.multa + rMon.multa),
      total: round2(rVb.total + rMon.total),
    };
  };

  const [form, setForm] = useState({
    compensacao: client.compensacao,
    juros: client.juros,
    boletoVitbank: client.boletoVitbank,
    pixMonetali: client.pixMonetali,
    diasAtraso: client.diasAtraso,
    parcelas: client.parcelas,
    regional: client.regional,
    executivo: client.executivo,
    situacao: client.situacao as Situacao,
    flags: [...client.flags] as Flag[],
  });
  const [saved, setSaved] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [expandedJurosId, setExpandedJurosId] = useState<string | null>(null);
  const [newFlagInput, setNewFlagInput] = useState('');
  const [showParcelamento, setShowParcelamento] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNovoPagamento, setShowNovoPagamento] = useState(false);

  const allAvailableFlags = [...new Set([...DEFAULT_FLAGS, ...flagsDisponiveis, ...form.flags])];
  const openPayments = payments.filter(p => p.status !== 'Pago');
  const openTotal = openPayments.reduce((s, p) => s + p.valor, 0);

  // Aggregate totals from payment breakdown
  const totalVitbank = payments.reduce((s, p) => s + (p.vitbank || 0), 0);
  const totalMonetali = payments.reduce((s, p) => s + (p.monetali || 0), 0);

  // Computed juros totals (by side), calculated on-the-fly from premissas + vencimentos
  // Agrega separadamente juros (por dia) e multa (fixa) por lado pra exibição e tooltip.
  const jurosTotals = payments.reduce(
    (acc, p) => {
      const bd = computeJurosBreakdown(p);
      acc.vitbank += bd.totalVitbank;
      acc.monetali += bd.totalMonetali;
      acc.jurosVb += bd.jurosVb;
      acc.multaVb += bd.multaVb;
      acc.jurosMon += bd.jurosMon;
      acc.multaMon += bd.multaMon;
      return acc;
    },
    { vitbank: 0, monetali: 0, jurosVb: 0, multaVb: 0, jurosMon: 0, multaMon: 0 }
  );
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const totalJurosVitbank = round2(jurosTotals.vitbank);
  const totalJurosMonetali = round2(jurosTotals.monetali);
  const totalJuros = round2(totalJurosVitbank + totalJurosMonetali);
  const totalJurosOnly = round2(jurosTotals.jurosVb + jurosTotals.jurosMon);
  const totalMultaOnly = round2(jurosTotals.multaVb + jurosTotals.multaMon);

  // Valor atualizado (compensação + encargos reais calculados por pagamento)
  const valorAtualizado = round2(form.compensacao + totalJuros);

  const handleSave = async () => {
    const ok = await updateCliente(client.id, {
      compensacao: form.compensacao,
      juros: form.juros,
      diasAtraso: form.diasAtraso,
      parcelas: form.parcelas,
      regional: form.regional,
      executivo: form.executivo,
      situacao: form.situacao,
      flags: [...form.flags],
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const toggleFlag = (flag: Flag) => {
    setForm(prev => ({ ...prev, flags: prev.flags.includes(flag) ? prev.flags.filter(f => f !== flag) : [...prev.flags, flag] }));
  };

  const addCustomFlag = () => {
    const flag = newFlagInput.trim();
    if (!flag || allAvailableFlags.includes(flag)) return;
    setForm(prev => ({ ...prev, flags: [...prev.flags, flag] }));
    setNewFlagInput('');
  };

  const removeFlag = (flag: Flag) => {
    setForm(prev => ({ ...prev, flags: prev.flags.filter(f => f !== flag) }));
  };

  const updatePayment = async (
    updated: Payment,
    parcelamento?: { numParcelas: number; valorParcelaVb: number; valorParcelaMon: number }
  ) => {
    await updatePaymentDb(updated.id, updated);

    if (parcelamento && parcelamento.numParcelas > 0) {
      for (let i = 0; i < parcelamento.numParcelas; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i + 1);
        const iso = d.toISOString().split('T')[0];
        await createPayment(
          {
            valor: parcelamento.valorParcelaVb + parcelamento.valorParcelaMon,
            dataVencimento: iso,
            descricao: `Parcelamento ${i + 1}/${parcelamento.numParcelas} (origem: ${updated.descricao || updated.id.slice(0, 8)})`,
            status: 'Pendente',
            vitbank: parcelamento.valorParcelaVb,
            vctoVitbank: iso,
            monetali: parcelamento.valorParcelaMon,
            vctoMonetali: iso,
            mesReferencia: iso.slice(0, 7),
          },
          client.id
        );
      }
      await createAtividade({
        clienteId: client.id,
        tipo: 'pagamento',
        descricao: `Parcelamento inline: ${parcelamento.numParcelas}x — VitBank ${formatCurrency(parcelamento.valorParcelaVb)} + Monetali ${formatCurrency(parcelamento.valorParcelaMon)} por parcela`,
        criadoPor: form.executivo || 'Sistema',
      });
    }

    setEditingPayment(null);
  };

  const cyclePaymentStatus = async (p: Payment) => {
    const order: PaymentStatus[] = ['Pendente', 'Parcial', 'Pago', 'Vencido'];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    await updatePaymentDb(p.id, { status: next });
  };

  const registerParcelamento = async (data: { valorTotal: number; numParcelas: number; valorPrimeira: number; dataPrimeira: string; jurosAplicado: number; desconto: number }) => {
    const valorComDesconto = data.valorTotal - data.desconto;
    const valorRestante = valorComDesconto - data.valorPrimeira;
    const valorDemais = data.numParcelas > 1 ? Math.round(valorRestante / (data.numParcelas - 1) * 100) / 100 : 0;

    for (let i = 0; i < data.numParcelas; i++) {
      const d = new Date(data.dataPrimeira);
      d.setMonth(d.getMonth() + i);
      await createPayment({
        valor: i === 0 ? data.valorPrimeira : valorDemais,
        dataVencimento: d.toISOString().split('T')[0],
        descricao: `Parcelamento ${i + 1}/${data.numParcelas}`,
        status: 'Pendente',
      }, client.id);
    }

    await createAtividade({
      clienteId: client.id,
      tipo: 'pagamento',
      descricao: `Parcelamento registrado: ${data.numParcelas}x de ${formatCurrency(data.valorPrimeira)} (desconto: ${formatCurrency(data.desconto)}, juros: ${data.jurosAplicado}%)`,
      criadoPor: form.executivo || 'Sistema',
    });

    setShowParcelamento(false);
  };

  const handleEmailSent = async (assunto: string) => {
    await createAtividade({
      clienteId: client.id,
      tipo: 'email',
      descricao: `Email de cobrança enviado — assunto: ${assunto}`,
      criadoPor: form.executivo || 'Sistema',
    });
    setShowEmailModal(false);
  };

  const numField = (field: 'compensacao' | 'juros' | 'boletoVitbank' | 'pixMonetali' | 'diasAtraso' | 'parcelas', label: string) => (
    <div key={field} className="bg-secondary/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <input type="number" value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
        className="w-full bg-transparent text-lg font-semibold font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors" />
    </div>
  );

  const textField = (field: 'regional' | 'executivo', label: string) => (
    <div key={field} className="bg-secondary/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <input type="text" value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full bg-transparent text-lg font-semibold font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25 transition-colors">
            <Mail className="h-4 w-4" /> Enviar email de cobrança
          </button>
          <button onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? 'bg-[hsl(var(--recovered))] text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            <Save className="h-4 w-4" /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* JUROS AUTOMÁTICOS — calculado por pagamento (via premissas) */}
      {totalJuros > 0 && (
        <div className="glass-card p-5 border-l-4 border-l-accent">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cálculo Automático de Encargos
            </h3>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Juros {dbPremissas.taxaJurosDia}%/dia · Multa {dbPremissas.multaAtraso}% (fixa)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Valor Original</p>
              <p className="text-lg font-bold font-mono">{formatCurrency(form.compensacao)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Juros (por dia)</p>
              <p className="text-lg font-bold font-mono text-negotiation">{formatCurrency(totalJurosOnly)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Multa (1x)</p>
              <p className="text-lg font-bold font-mono text-partial">{formatCurrency(totalMultaOnly)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Encargos</p>
              <p className="text-lg font-bold font-mono text-accent">{formatCurrency(totalJuros)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Valor Atualizado</p>
              <p className="text-lg font-bold font-mono text-overdue">{formatCurrency(valorAtualizado)}</p>
            </div>
          </div>
        </div>
      )}

      {/* PAGAMENTOS */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" /> Pagamentos
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNovoPagamento(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Pagamento
            </button>
            <button onClick={() => setShowParcelamento(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-xs font-medium border border-accent/25 hover:bg-accent/25 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Registrar Parcelamento
            </button>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-semibold border border-accent/25">
              {openPayments.length} em aberto — {formatCurrency(openTotal)}
            </span>
          </div>
        </div>

        {/* Summary totals */}
        {payments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total VitBank</p>
              <p className="text-sm font-bold font-mono text-partial">{formatCurrency(totalVitbank)}</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Monetali</p>
              <p className="text-sm font-bold font-mono text-recovered">{formatCurrency(totalMonetali)}</p>
            </div>
            <div
              className="bg-secondary/40 rounded-lg p-3 text-center"
              title={`Juros (por dia): ${formatCurrency(round2(jurosTotals.jurosVb))}\nMulta (fixa 1x): ${formatCurrency(round2(jurosTotals.multaVb))}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Encargos VitBank</p>
              <p className="text-sm font-bold font-mono text-overdue">{formatCurrency(totalJurosVitbank)}</p>
            </div>
            <div
              className="bg-secondary/40 rounded-lg p-3 text-center"
              title={`Juros (por dia): ${formatCurrency(round2(jurosTotals.jurosMon))}\nMulta (fixa 1x): ${formatCurrency(round2(jurosTotals.multaMon))}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Encargos Monetali</p>
              <p className="text-sm font-bold font-mono text-overdue">{formatCurrency(totalJurosMonetali)}</p>
            </div>
            <div
              className="bg-secondary/40 rounded-lg p-3 text-center"
              title={`Juros totais (por dia): ${formatCurrency(totalJurosOnly)}\nMulta total (fixa 1x): ${formatCurrency(totalMultaOnly)}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Encargos</p>
              <p className="text-sm font-bold font-mono text-negotiation">{formatCurrency(totalJuros)}</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Geral</p>
              <p className="text-sm font-bold font-mono text-overdue">{formatCurrency(totalVitbank + totalMonetali + totalJuros)}</p>
            </div>
          </div>
        )}

        {loadingPay ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando pagamentos...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Nenhum pagamento registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left bg-secondary/20">
                  <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Mês Ref.</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right">Compensação</th>
                  <th className="px-3 py-2 font-semibold text-partial uppercase tracking-wider text-right">VitBank</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right hidden lg:table-cell">Vcto VB</th>
                  <th className="px-3 py-2 font-semibold text-overdue uppercase tracking-wider text-right hidden lg:table-cell">Juros VitBank</th>
                  <th className="px-3 py-2 font-semibold text-recovered uppercase tracking-wider text-right">Monetali</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right hidden lg:table-cell">Vcto Mon.</th>
                  <th className="px-3 py-2 font-semibold text-overdue uppercase tracking-wider text-right hidden lg:table-cell">Juros Monetali</th>
                  <th className="px-3 py-2 font-semibold text-negotiation uppercase tracking-wider text-right">Juros</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const style = PAYMENT_STATUS_STYLES[p.status];
                  const StatusIcon = style.icon;
                  const fmtDate = (d: string | null | undefined) =>
                    d ? new Date(d).toLocaleDateString('pt-BR') : '—';
                  const bd = computeJurosBreakdown(p);
                  return (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        {p.mesReferencia || fmtDate(p.dataVencimento)}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-right">
                        {formatCurrency(p.valorCompensacao || p.valor || 0)}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-right text-partial">
                        {(p.vitbank || 0) > 0 ? formatCurrency(p.vitbank!) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground text-right hidden lg:table-cell whitespace-nowrap">
                        {fmtDate(p.vctoVitbank)}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-mono text-right hidden lg:table-cell whitespace-nowrap ${
                          bd.vbPaid || bd.totalVitbank === 0 ? 'text-muted-foreground' : 'text-overdue font-semibold'
                        }`}
                        title={
                          bd.totalVitbank > 0
                            ? `Juros: ${formatCurrency(bd.jurosVb)} (${bd.diasVb}d × ${dbPremissas.taxaJurosDia}%/dia)\nMulta: ${formatCurrency(bd.multaVb)} (${dbPremissas.multaAtraso}% — cobrada 1x)\nTotal: ${formatCurrency(bd.totalVitbank)}`
                            : bd.vbPaid
                            ? 'Pago'
                            : 'Sem juros'
                        }
                      >
                        {bd.totalVitbank > 0 ? formatCurrency(bd.totalVitbank) : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-right text-recovered">
                        {(p.monetali || 0) > 0 ? formatCurrency(p.monetali!) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground text-right hidden lg:table-cell whitespace-nowrap">
                        {fmtDate(p.vctoMonetali)}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-mono text-right hidden lg:table-cell whitespace-nowrap ${
                          bd.monPaid || bd.totalMonetali === 0 ? 'text-muted-foreground' : 'text-overdue font-semibold'
                        }`}
                        title={
                          bd.totalMonetali > 0
                            ? `Juros: ${formatCurrency(bd.jurosMon)} (${bd.diasMon}d × ${dbPremissas.taxaJurosDia}%/dia)\nMulta: ${formatCurrency(bd.multaMon)} (${dbPremissas.multaAtraso}% — cobrada 1x)\nTotal: ${formatCurrency(bd.totalMonetali)}`
                            : bd.monPaid
                            ? 'Pago'
                            : 'Sem juros'
                        }
                      >
                        {bd.totalMonetali > 0 ? formatCurrency(bd.totalMonetali) : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-right text-negotiation relative">
                        {bd.total > 0 ? (
                          <button
                            onClick={() => setExpandedJurosId(expandedJurosId === p.id ? null : p.id)}
                            className="hover:underline cursor-pointer font-semibold"
                            title="Clique para ver o breakdown"
                          >
                            {formatCurrency(bd.total)}
                          </button>
                        ) : <span className="text-muted-foreground">—</span>}
                        {expandedJurosId === p.id && (
                          <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-lg p-3 text-left whitespace-nowrap min-w-[300px]">
                            <p className="text-[11px] font-semibold text-foreground mb-2">
                              Encargos totais: {formatCurrency(bd.total)}
                            </p>
                            <div className="space-y-2 text-[10px]">
                              {bd.baseVb > 0 && !bd.vbPaid && (
                                <div className="border-l-2 border-partial/40 pl-2">
                                  <p className="text-partial font-semibold mb-0.5">
                                    VitBank · {formatCurrency(bd.baseVb)} · {bd.diasVb}d
                                  </p>
                                  <p className="text-muted-foreground">
                                    Juros: <span className="text-foreground font-mono">{formatCurrency(bd.jurosVb)}</span>
                                    <span className="text-[9px] ml-1">({bd.diasVb}d × {dbPremissas.taxaJurosDia}%/dia)</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Multa: <span className="text-foreground font-mono">{formatCurrency(bd.multaVb)}</span>
                                    <span className="text-[9px] ml-1">({dbPremissas.multaAtraso}% — 1x)</span>
                                  </p>
                                  <p className="text-foreground font-semibold">
                                    Subtotal: {formatCurrency(bd.totalVitbank)}
                                  </p>
                                </div>
                              )}
                              {bd.baseMon > 0 && !bd.monPaid && (
                                <div className="border-l-2 border-recovered/40 pl-2">
                                  <p className="text-recovered font-semibold mb-0.5">
                                    Monetali · {formatCurrency(bd.baseMon)} · {bd.diasMon}d
                                  </p>
                                  <p className="text-muted-foreground">
                                    Juros: <span className="text-foreground font-mono">{formatCurrency(bd.jurosMon)}</span>
                                    <span className="text-[9px] ml-1">({bd.diasMon}d × {dbPremissas.taxaJurosDia}%/dia)</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Multa: <span className="text-foreground font-mono">{formatCurrency(bd.multaMon)}</span>
                                    <span className="text-[9px] ml-1">({dbPremissas.multaAtraso}% — 1x)</span>
                                  </p>
                                  <p className="text-foreground font-semibold">
                                    Subtotal: {formatCurrency(bd.totalMonetali)}
                                  </p>
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
                              Multa é cobrada 1x (fixa). Juros crescem por dia.
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => cyclePaymentStatus(p)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${style.bg}`}>
                          <StatusIcon className="h-3 w-3" /> {p.status}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setEditingPayment(p)} className="text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/40 text-[11px]">
                  <td className="px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wider" colSpan={2}>
                    Totais
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-partial">
                    {formatCurrency(totalVitbank)}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell"></td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-overdue hidden lg:table-cell">
                    {totalJurosVitbank > 0 ? formatCurrency(totalJurosVitbank) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-recovered">
                    {formatCurrency(totalMonetali)}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell"></td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-overdue hidden lg:table-cell">
                    {totalJurosMonetali > 0 ? formatCurrency(totalJurosMonetali) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-negotiation">
                    {totalJuros > 0 ? formatCurrency(totalJuros) : '—'}
                  </td>
                  <td className="px-3 py-2" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {editingPayment && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingPayment(null)}>
            <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Editar Pagamento</h4>
                <button onClick={() => setEditingPayment(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <PaymentEditForm payment={editingPayment} onSave={updatePayment} />
            </div>
          </div>
        )}

        {showParcelamento && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowParcelamento(false)}>
            <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Registrar Parcelamento</h4>
                <button onClick={() => setShowParcelamento(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <ParcelamentoForm valorTotal={valorAtualizado} onSave={registerParcelamento} />
            </div>
          </div>
        )}

        {showNovoPagamento && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNovoPagamento(false)}
          >
            <div
              className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <PaymentForm
                clienteId={client.id}
                clienteNome={client.nome}
                onSave={async () => {
                  await refetchPayments();
                  await createAtividade({
                    clienteId: client.id,
                    tipo: 'pagamento',
                    descricao: 'Novo pagamento cadastrado via modal "Novo Pagamento"',
                    criadoPor: form.executivo || 'Sistema',
                  });
                  setShowNovoPagamento(false);
                }}
                onCancel={() => setShowNovoPagamento(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* FLAGS */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Tag className="h-5 w-5 text-accent" /> Flags</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {form.flags.map(f => (
            <span key={f} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getFlagColor(f)}`}>
              {f}
              <button onClick={() => removeFlag(f)} className="ml-0.5 hover:opacity-70"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {form.flags.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma flag</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {allAvailableFlags.filter(f => !form.flags.includes(f)).map(f => (
            <button key={f} onClick={() => toggleFlag(f)} className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">+ {f}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Nova flag..." value={newFlagInput} onChange={e => setNewFlagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomFlag()}
            className="flex-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" maxLength={30} />
          <button onClick={addCustomFlag} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Adicionar flag
          </button>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Timeline</h3>
        {loadingTimeline ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando timeline...</div>
        ) : timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro.</p>
        ) : (
          <div className="space-y-0">
            {timeline.map((ev, idx) => {
              const Icon = TIMELINE_ICONS[ev.type] || FileText;
              const dt = new Date(ev.date);
              return (
                <div key={ev.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                    {idx < timeline.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="pb-4 pt-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold capitalize">{ev.type.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">{dt.toLocaleDateString('pt-BR')} às {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                    {ev.agent && <p className="text-xs text-muted-foreground mt-0.5">Responsável: {ev.agent}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{client.nome}</h2>
            <p className="text-sm font-mono text-muted-foreground">{client.cnpj || 'CNPJ não informado'}</p>
          </div>
          <select value={form.situacao} onChange={e => setForm(prev => ({ ...prev, situacao: e.target.value as Situacao }))}
            className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            {allSituacoes.map(s => <option key={s} value={s}>{situacaoLabels[s]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {numField('compensacao', 'Compensação')}
          {numField('juros', 'Juros')}
          {numField('boletoVitbank', 'Boleto VitBank')}
          {numField('pixMonetali', 'PIX Monetali')}
          {numField('diasAtraso', 'Dias em Atraso')}
          {numField('parcelas', 'Parcelas')}
          {textField('regional', 'Regional')}
          {textField('executivo', 'Executivo')}
        </div>
      </div>

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <EmailCobrancaModal
          client={client}
          openPaymentsCount={openPayments.length}
          valorTotal={valorAtualizado}
          onClose={() => setShowEmailModal(false)}
          onSend={handleEmailSent}
        />
      )}
    </div>
  );
};

/* Email Cobrança Modal */
const EmailCobrancaModal = ({
  client,
  openPaymentsCount,
  valorTotal,
  onClose,
  onSend,
}: {
  client: Client;
  openPaymentsCount: number;
  valorTotal: number;
  onClose: () => void;
  onSend: (assunto: string) => void;
}) => {
  // Use static templates (not in DB yet)
  const templates = staticPremissas.templates;
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const [destinatario, setDestinatario] = useState(staticPremissas.emailRemetente);
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [anexoName, setAnexoName] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [sending, setSending] = useState(false);

  const applyTemplate = (template: EmailTemplate) => {
    setAssunto(substituirVariaveis(template.assunto, client, openPaymentsCount, valorTotal));
    setCorpo(substituirVariaveis(template.corpo, client, openPaymentsCount, valorTotal));
  };

  useEffect(() => {
    if (selectedTemplate) applyTemplate(selectedTemplate);
  }, []);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) applyTemplate(t);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAnexoName(file.name);
  };

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      onSend(assunto);
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h4 className="font-semibold text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" /> Enviar Email de Cobrança
          </h4>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Destinatário</label>
            <input type="email" value={destinatario} onChange={e => setDestinatario(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="email@empresa.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Template</label>
            <select value={selectedTemplateId} onChange={e => handleTemplateChange(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground">
              {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Assunto</label>
            <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Corpo do Email</label>
            <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={10}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Anexo (PDF)</label>
              <div className="mt-1 relative">
                <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="email-anexo" />
                <label htmlFor="email-anexo" className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm cursor-pointer hover:bg-secondary/70 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className={anexoName ? 'text-foreground' : 'text-muted-foreground'}>{anexoName || 'Selecionar arquivo...'}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5" /> Link (Omie/Portal)
              </label>
              <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Agendar Envio (opcional)</label>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
            <p><strong>Cliente:</strong> {client.nome} | <strong>CNPJ:</strong> {client.cnpj} | <strong>Atraso:</strong> {client.diasAtraso} dias | <strong>Valor:</strong> {formatCurrency(valorTotal)}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          {scheduleDate && (
            <button onClick={handleSend} disabled={sending || !assunto || !corpo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50">
              <Clock className="h-4 w-4" /> Agendar envio
            </button>
          )}
          <button onClick={handleSend} disabled={sending || !assunto || !corpo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar agora'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Payment edit form — split VitBank/Monetali + inline parcelamento */
const PaymentEditForm = ({
  payment,
  onSave,
}: {
  payment: Payment;
  onSave: (
    p: Payment,
    parcelamento?: { numParcelas: number; valorParcelaVb: number; valorParcelaMon: number }
  ) => void;
}) => {
  const [f, setF] = useState({ ...payment });
  const [wantParcelamento, setWantParcelamento] = useState(false);
  const [numParcelas, setNumParcelas] = useState(3);
  const statuses: PaymentStatus[] = ['Pendente', 'Parcial', 'Pago', 'Vencido'];

  const vbDevido = f.vitbank || 0;
  const monDevido = f.monetali || 0;
  const totalDevido = vbDevido + monDevido;
  const pagoVb = f.valorPagoVitbank || 0;
  const pagoMon = f.valorPagoMonetali || 0;
  const totalPago = Math.round((pagoVb + pagoMon) * 100) / 100;
  const restante = Math.round((totalDevido - totalPago) * 100) / 100;

  const valorParcelaVb = numParcelas > 0 ? Math.round((vbDevido / numParcelas) * 100) / 100 : 0;
  const valorParcelaMon = numParcelas > 0 ? Math.round((monDevido / numParcelas) * 100) / 100 : 0;

  const fmtDateBR = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  // Auto-derive status from values paid
  const computeStatus = (): PaymentStatus => {
    if (totalDevido <= 0) return f.status;
    if (totalPago <= 0) return 'Pendente';
    if (totalPago >= totalDevido) return 'Pago';
    return 'Parcial';
  };

  // Most recent payment date between the two sides
  const mostRecentPgto = (): string | null => {
    const dates = [f.pgtoVitbank, f.pgtoMonetali].filter(Boolean) as string[];
    if (!dates.length) return null;
    return dates.sort().reverse()[0];
  };

  const handleSave = () => {
    const autoStatus = computeStatus();
    const dataPgto = mostRecentPgto();
    const payload: Payment = {
      ...f,
      status: autoStatus,
      dataPagamento: dataPgto,
    };
    if (wantParcelamento && numParcelas > 0) {
      onSave(payload, { numParcelas, valorParcelaVb, valorParcelaMon });
    } else {
      onSave(payload);
    }
  };

  const inputCls =
    'w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50';
  const inputMonoCls = `${inputCls} font-mono`;
  const readonlyCls =
    'w-full mt-1 px-3 py-2 bg-muted/40 border border-border/30 rounded-lg text-sm font-mono text-muted-foreground cursor-not-allowed';

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Status selector */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setF(p => ({ ...p, status: s }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                f.status === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Sugerido automaticamente ao salvar: <strong>{computeStatus()}</strong>
        </p>
      </div>

      {/* VitBank block */}
      <div className="bg-partial/5 border border-partial/25 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-partial">VitBank</p>
          <span className="text-[10px] text-muted-foreground">Vcto: {fmtDateBR(f.vctoVitbank)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Devido</label>
            <input type="text" disabled value={formatCurrency(vbDevido)} className={readonlyCls} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Pgto</label>
            <input
              type="date"
              value={f.pgtoVitbank || ''}
              onChange={e => setF(p => ({ ...p, pgtoVitbank: e.target.value || null }))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Pago (R$)</label>
          <input
            type="number"
            step="0.01"
            value={pagoVb}
            onChange={e => setF(p => ({ ...p, valorPagoVitbank: parseFloat(e.target.value) || 0 }))}
            className={inputMonoCls}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Monetali block */}
      <div className="bg-recovered/5 border border-recovered/25 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-recovered">Monetali</p>
          <span className="text-[10px] text-muted-foreground">Vcto: {fmtDateBR(f.vctoMonetali)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Devido</label>
            <input type="text" disabled value={formatCurrency(monDevido)} className={readonlyCls} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Pgto</label>
            <input
              type="date"
              value={f.pgtoMonetali || ''}
              onChange={e => setF(p => ({ ...p, pgtoMonetali: e.target.value || null }))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Pago (R$)</label>
          <input
            type="number"
            step="0.01"
            value={pagoMon}
            onChange={e => setF(p => ({ ...p, valorPagoMonetali: parseFloat(e.target.value) || 0 }))}
            className={inputMonoCls}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Totals summary */}
      <div className="bg-secondary/40 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Devido</span>
          <span className="font-mono font-semibold">{formatCurrency(totalDevido)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Pago</span>
          <span className="font-mono font-bold text-recovered">{formatCurrency(totalPago)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-1">
          <span className="text-muted-foreground">Restante</span>
          <span className={`font-mono font-bold ${restante > 0 ? 'text-overdue' : 'text-recovered'}`}>
            {formatCurrency(restante)}
          </span>
        </div>
      </div>

      {/* Parcelamento inline */}
      <div className="border border-border/60 rounded-lg p-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={wantParcelamento}
            onChange={e => setWantParcelamento(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-medium">Registrar parcelamento</span>
        </label>
        {wantParcelamento && (
          <div className="space-y-2 pl-6">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Quantidade de parcelas
              </label>
              <input
                type="number"
                min={1}
                value={numParcelas}
                onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputMonoCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-partial/10 border border-partial/20 rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">VitBank / parcela</p>
                <p className="font-mono font-bold text-partial text-sm">{formatCurrency(valorParcelaVb)}</p>
              </div>
              <div className="bg-recovered/10 border border-recovered/20 rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Monetali / parcela</p>
                <p className="font-mono font-bold text-recovered text-sm">{formatCurrency(valorParcelaMon)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Serão criadas {numParcelas} novas parcelas mensais a partir do próximo mês, com os valores VitBank + Monetali acima.
            </p>
          </div>
        )}
      </div>

      {/* Observação (usa campo descricao) */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Observação</label>
        <textarea
          value={f.descricao || ''}
          onChange={e => setF(p => ({ ...p, descricao: e.target.value }))}
          rows={2}
          className={`${inputCls} resize-y`}
          placeholder="Detalhes ou anotações sobre este pagamento..."
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full mt-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Salvar Pagamento
      </button>
    </div>
  );
};

/* Parcelamento form */
const ParcelamentoForm = ({ valorTotal, onSave }: { valorTotal: number; onSave: (data: any) => void }) => {
  const [f, setF] = useState({
    valorTotal,
    numParcelas: 3,
    valorPrimeira: Math.round(valorTotal / 3 * 100) / 100,
    dataPrimeira: new Date().toISOString().split('T')[0],
    jurosAplicado: 0,
    desconto: 0,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total do Acordo</label>
          <input type="number" step="0.01" value={f.valorTotal} onChange={e => setF(p => ({ ...p, valorTotal: parseFloat(e.target.value) || 0 }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Nº de Parcelas</label>
          <input type="number" value={f.numParcelas} onChange={e => setF(p => ({ ...p, numParcelas: parseInt(e.target.value) || 1 }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Valor 1ª Parcela</label>
          <input type="number" step="0.01" value={f.valorPrimeira} onChange={e => setF(p => ({ ...p, valorPrimeira: parseFloat(e.target.value) || 0 }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Data 1ª Parcela</label>
          <input type="date" value={f.dataPrimeira} onChange={e => setF(p => ({ ...p, dataPrimeira: e.target.value }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Juros Aplicado (%)</label>
          <input type="number" step="0.1" value={f.jurosAplicado} onChange={e => setF(p => ({ ...p, jurosAplicado: parseFloat(e.target.value) || 0 }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Desconto Concedido (R$)</label>
          <input type="number" step="0.01" value={f.desconto} onChange={e => setF(p => ({ ...p, desconto: parseFloat(e.target.value) || 0 }))}
            className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>
      <div className="p-3 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
        <p>Valor com desconto: <strong className="font-mono">{formatCurrency(f.valorTotal - f.desconto)}</strong></p>
        <p>Demais parcelas: <strong className="font-mono">{f.numParcelas > 1 ? formatCurrency((f.valorTotal - f.desconto - f.valorPrimeira) / (f.numParcelas - 1)) : '—'}</strong></p>
      </div>
      <button onClick={() => onSave(f)} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        Gerar Parcelamento
      </button>
    </div>
  );
};

export default ClientDetail;
