import { useState } from 'react';
import { DelinquencyStatus, statusLabels } from '@/data/mockData';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const CadastrarPage = () => {
  const [form, setForm] = useState({
    name: '', cpfCnpj: '', email: '', phone: '',
    totalOwed: '', daysOverdue: '', status: 'overdue' as DelinquencyStatus,
    commissionsOverdue: '', originalDueDate: '', notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Cliente cadastrado com sucesso!');
    setForm({ name: '', cpfCnpj: '', email: '', phone: '', totalOwed: '', daysOverdue: '', status: 'overdue', commissionsOverdue: '', originalDueDate: '', notes: '' });
  };

  const inputClass = "w-full bg-secondary/50 border border-border/50 rounded-lg text-sm px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Cadastrar Cliente</h2>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome / Razão Social</label>
            <input className={inputClass} placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>CPF / CNPJ</label>
            <input className={inputClass} placeholder="000.000.000-00" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" className={inputClass} placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input className={inputClass} placeholder="(00) 90000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Valor Devido (R$)</label>
            <input type="number" step="0.01" className={inputClass} placeholder="0,00" value={form.totalOwed} onChange={e => setForm(f => ({ ...f, totalOwed: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>Dias em Atraso</label>
            <input type="number" className={inputClass} placeholder="0" value={form.daysOverdue} onChange={e => setForm(f => ({ ...f, daysOverdue: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Comissões Pendentes</label>
            <input type="number" className={inputClass} placeholder="0" value={form.commissionsOverdue} onChange={e => setForm(f => ({ ...f, commissionsOverdue: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Vencimento Original</label>
            <input type="date" className={inputClass} value={form.originalDueDate} onChange={e => setForm(f => ({ ...f, originalDueDate: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DelinquencyStatus }))}>
              {(Object.keys(statusLabels) as DelinquencyStatus[]).map(s => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Observações</label>
          <textarea className={`${inputClass} min-h-[80px]`} placeholder="Notas sobre o cliente..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
          Cadastrar Cliente
        </button>
      </form>
    </div>
  );
};

export default CadastrarPage;
