import { useState } from 'react';
import {
  ArrowLeft, Save, Calendar, Mail, Phone, FileText, MessageSquare,
  CreditCard, Tag, Clock, Plus, X, Edit2, AlertCircle, CheckCircle2, CircleDot, AlertTriangle,
} from 'lucide-react';
import {
  Client, Situacao, Flag, Payment, PaymentStatus, TimelineEvent,
  formatCurrency, situacaoLabels,
  DEFAULT_FLAGS, customFlags, clientPayments, clientTimelines, getFlagColor,
} from '@/data/mockData';
import StatusBadge from './StatusBadge';

interface Props {
  client: Client;
  onBack: () => void;
}

const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];

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

const ClientDetail = ({ client, onBack }: Props) => {
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

  // Payments
  const [payments, setPayments] = useState<Payment[]>(
    () => clientPayments[client.id] || []
  );
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Custom flag input
  const [newFlagInput, setNewFlagInput] = useState('');

  // All available flags = defaults + custom
  const allAvailableFlags = [...new Set([...DEFAULT_FLAGS, ...customFlags, ...form.flags])];

  const openPayments = payments.filter(p => p.status !== 'Pago');
  const openTotal = openPayments.reduce((s, p) => s + p.valor, 0);

  // Timeline
  const timeline = (clientTimelines[client.id] || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSave = () => {
    Object.assign(client, {
      compensacao: form.compensacao, juros: form.juros,
      boletoVitbank: form.boletoVitbank, pixMonetali: form.pixMonetali,
      diasAtraso: form.diasAtraso, parcelas: form.parcelas,
      regional: form.regional, executivo: form.executivo,
      situacao: form.situacao, flags: [...form.flags],
    });
    clientPayments[client.id] = payments;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFlag = (flag: Flag) => {
    setForm(prev => ({
      ...prev,
      flags: prev.flags.includes(flag) ? prev.flags.filter(f => f !== flag) : [...prev.flags, flag],
    }));
  };

  const addCustomFlag = () => {
    const flag = newFlagInput.trim();
    if (!flag || allAvailableFlags.includes(flag)) return;
    customFlags.push(flag);
    setForm(prev => ({ ...prev, flags: [...prev.flags, flag] }));
    setNewFlagInput('');
  };

  const removeFlag = (flag: Flag) => {
    setForm(prev => ({ ...prev, flags: prev.flags.filter(f => f !== flag) }));
  };

  const updatePayment = (updated: Payment) => {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingPayment(null);
  };

  const cyclePaymentStatus = (p: Payment) => {
    const order: PaymentStatus[] = ['Pendente', 'Parcial', 'Pago', 'Vencido'];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
  };

  const numField = (field: 'compensacao' | 'juros' | 'boletoVitbank' | 'pixMonetali' | 'diasAtraso' | 'parcelas', label: string) => (
    <div key={field} className="bg-secondary/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <input
        type="number"
        value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
        className="w-full bg-transparent text-lg font-semibold font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
      />
    </div>
  );

  const textField = (field: 'regional' | 'executivo', label: string) => (
    <div key={field} className="bg-secondary/30 rounded-lg p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <input
        type="text"
        value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
        className="w-full bg-transparent text-lg font-semibold font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-[hsl(var(--recovered))] text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          <Save className="h-4 w-4" /> {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* 1) PAGAMENTOS EM ABERTO */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" /> Pagamentos
          </h3>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-semibold border border-accent/25">
            {openPayments.length} em aberto — {formatCurrency(openTotal)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="px-4 py-2 font-semibold text-muted-foreground text-xs uppercase">Descrição</th>
                <th className="px-4 py-2 font-semibold text-muted-foreground text-xs uppercase">Vencimento</th>
                <th className="px-4 py-2 font-semibold text-muted-foreground text-xs uppercase">Valor</th>
                <th className="px-4 py-2 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const style = PAYMENT_STATUS_STYLES[p.status];
                const StatusIcon = style.icon;
                return (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{p.descricao}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => cyclePaymentStatus(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${style.bg}`}
                      >
                        <StatusIcon className="h-3 w-3" /> {p.status}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setEditingPayment(p)} className="text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline edit modal */}
        {editingPayment && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingPayment(null)}>
            <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Editar Pagamento</h4>
                <button onClick={() => setEditingPayment(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <PaymentEditForm payment={editingPayment} onSave={updatePayment} />
            </div>
          </div>
        )}
      </div>

      {/* 2) FLAGS CUSTOMIZADAS */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-accent" /> Flags
        </h3>
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
            <button key={f} onClick={() => toggleFlag(f)} className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              + {f}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nova flag..."
            value={newFlagInput}
            onChange={e => setNewFlagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomFlag()}
            className="flex-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            maxLength={30}
          />
          <button onClick={addCustomFlag} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Adicionar flag
          </button>
        </div>
      </div>

      {/* 3) TIMELINE */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Timeline
        </h3>
        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro.</p>
        ) : (
          <div className="space-y-0">
            {timeline.map((ev, idx) => {
              const Icon = TIMELINE_ICONS[ev.type] || FileText;
              const dt = new Date(ev.date);
              return (
                <div key={ev.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {idx < timeline.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="pb-4 pt-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold capitalize">{ev.type.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {dt.toLocaleDateString('pt-BR')} às {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
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

      {/* 4) DADOS DO CLIENTE */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{client.nome}</h2>
            <p className="text-sm font-mono text-muted-foreground">{client.cnpj || 'CNPJ não informado'}</p>
          </div>
          <select
            value={form.situacao}
            onChange={e => setForm(prev => ({ ...prev, situacao: e.target.value as Situacao }))}
            className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
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
    </div>
  );
};

/* Payment edit form */
const PaymentEditForm = ({ payment, onSave }: { payment: Payment; onSave: (p: Payment) => void }) => {
  const [f, setF] = useState({ ...payment });
  const statuses: PaymentStatus[] = ['Pendente', 'Pago', 'Parcial', 'Vencido'];
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição</label>
        <input value={f.descricao} onChange={e => setF(p => ({ ...p, descricao: e.target.value }))} className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Valor (R$)</label>
          <input type="number" step="0.01" value={f.valor} onChange={e => setF(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Vencimento</label>
          <input type="date" value={f.dataVencimento} onChange={e => setF(p => ({ ...p, dataVencimento: e.target.value }))} className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
        <div className="flex gap-2 mt-1">
          {statuses.map(s => (
            <button key={s} onClick={() => setF(p => ({ ...p, status: s }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${f.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground'}`}
            >{s}</button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave(f)} className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        Salvar Pagamento
      </button>
    </div>
  );
};

export default ClientDetail;
