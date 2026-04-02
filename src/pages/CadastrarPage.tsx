import { useState } from 'react';
import { Situacao, situacaoLabels } from '@/data/mockData';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const CadastrarPage = () => {
  const [form, setForm] = useState({
    nome: '', cnpj: '', regional: '', executivo: '',
    compensacao: '', juros: '', boletoVitbank: '', pixMonetali: '',
    diasAtraso: '', parcelas: '', situacao: 'COBRANÇA OK' as Situacao,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Cliente cadastrado com sucesso!');
    setForm({ nome: '', cnpj: '', regional: '', executivo: '', compensacao: '', juros: '', boletoVitbank: '', pixMonetali: '', diasAtraso: '', parcelas: '', situacao: 'COBRANÇA OK' });
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
            <input className={inputClass} placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input className={inputClass} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Regional</label>
            <input className={inputClass} placeholder="RJ / SP" value={form.regional} onChange={e => setForm(f => ({ ...f, regional: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Executivo</label>
            <input className={inputClass} placeholder="Nome do executivo" value={form.executivo} onChange={e => setForm(f => ({ ...f, executivo: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Compensação (R$)</label>
            <input type="number" step="0.01" className={inputClass} placeholder="0,00" value={form.compensacao} onChange={e => setForm(f => ({ ...f, compensacao: e.target.value }))} required />
          </div>
          <div>
            <label className={labelClass}>Juros (R$)</label>
            <input type="number" step="0.01" className={inputClass} placeholder="0,00" value={form.juros} onChange={e => setForm(f => ({ ...f, juros: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Boleto VitBank (R$)</label>
            <input type="number" step="0.01" className={inputClass} placeholder="0,00" value={form.boletoVitbank} onChange={e => setForm(f => ({ ...f, boletoVitbank: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>PIX Monetali (R$)</label>
            <input type="number" step="0.01" className={inputClass} placeholder="0,00" value={form.pixMonetali} onChange={e => setForm(f => ({ ...f, pixMonetali: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Dias em Atraso</label>
            <input type="number" className={inputClass} placeholder="0" value={form.diasAtraso} onChange={e => setForm(f => ({ ...f, diasAtraso: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Parcelas</label>
            <input type="number" className={inputClass} placeholder="0" value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Situação</label>
            <select className={inputClass} value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value as Situacao }))}>
              {(Object.keys(situacaoLabels) as Situacao[]).map(s => (
                <option key={s} value={s}>{situacaoLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
          Cadastrar Cliente
        </button>
      </form>
    </div>
  );
};

export default CadastrarPage;
