import { useState } from 'react';
import { Situacao, situacaoLabels } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { usePermission } from '@/hooks/usePermission';
import { UserPlus, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface FormErrors {
  nome?: string;
  cnpj?: string;
  compensacao?: string;
  regional?: string;
}

const formatCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const isValidCnpj = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  return digits.length === 14;
};

const CadastrarPage = () => {
  const canCreate = usePermission('clientes', 'create');
  const { create: createCliente } = useClientes();

  const [form, setForm] = useState({
    nome: '', cnpj: '', regional: '', executivo: '',
    compensacao: '', juros: '', boletoVitbank: '', pixMonetali: '',
    diasAtraso: '', parcelas: '', situacao: 'COBRANÇA EM ANDAMENTO' as Situacao,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório.';
    if (form.cnpj && !isValidCnpj(form.cnpj)) errs.cnpj = 'CNPJ deve ter 14 dígitos.';
    if (!form.compensacao || parseFloat(form.compensacao) <= 0) errs.compensacao = 'Compensação é obrigatória e deve ser maior que zero.';
    if (!form.regional.trim()) errs.regional = 'Regional é obrigatória.';
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched(new Set(['nome', 'cnpj', 'compensacao', 'regional']));
    if (Object.keys(errs).length > 0) {
      toast.error('Corrija os erros antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    const result = await createCliente({
      nome: form.nome,
      cnpj: form.cnpj.replace(/\D/g, ''),
      regional: form.regional,
      executivo: form.executivo,
      compensacao: parseFloat(form.compensacao) || 0,
      diasAtraso: parseInt(form.diasAtraso) || 0,
      parcelas: parseInt(form.parcelas) || 0,
      situacao: form.situacao,
    });

    if (result) {
      toast.success('Cliente cadastrado com sucesso no Supabase!');
      setForm({ nome: '', cnpj: '', regional: '', executivo: '', compensacao: '', juros: '', boletoVitbank: '', pixMonetali: '', diasAtraso: '', parcelas: '', situacao: 'COBRANÇA EM ANDAMENTO' });
      setErrors({});
      setTouched(new Set());
    } else {
      toast.error('Erro ao cadastrar cliente. Verifique os dados.');
    }
    setIsSubmitting(false);
  };

  const handleCnpjChange = (value: string) => {
    setForm(f => ({ ...f, cnpj: formatCnpj(value) }));
  };

  const inputClass = (hasError: boolean) =>
    `w-full bg-secondary/50 border rounded-lg text-sm px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
      hasError ? 'border-destructive focus:ring-destructive/50' : 'border-border/50 focus:ring-primary/50'
    }`;
  const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block";

  const FieldError = ({ field }: { field: keyof FormErrors }) => {
    if (!touched.has(field) || !errors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
  };

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Você não tem permissão para cadastrar clientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Cadastrar Cliente</h2>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome / Razão Social <span className="text-destructive">*</span></label>
            <input className={inputClass(touched.has('nome') && !!errors.nome)} placeholder="Nome completo"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} onBlur={() => handleBlur('nome')} />
            <FieldError field="nome" />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input className={inputClass(touched.has('cnpj') && !!errors.cnpj)} placeholder="00.000.000/0001-00"
              value={form.cnpj} onChange={e => handleCnpjChange(e.target.value)} onBlur={() => handleBlur('cnpj')} />
            <FieldError field="cnpj" />
          </div>
          <div>
            <label className={labelClass}>Regional <span className="text-destructive">*</span></label>
            <input className={inputClass(touched.has('regional') && !!errors.regional)} placeholder="RJ / SP"
              value={form.regional} onChange={e => setForm(f => ({ ...f, regional: e.target.value }))} onBlur={() => handleBlur('regional')} />
            <FieldError field="regional" />
          </div>
          <div>
            <label className={labelClass}>Executivo</label>
            <input className={inputClass(false)} placeholder="Nome do executivo" value={form.executivo} onChange={e => setForm(f => ({ ...f, executivo: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Compensação (R$) <span className="text-destructive">*</span></label>
            <input type="number" step="0.01" className={inputClass(touched.has('compensacao') && !!errors.compensacao)} placeholder="0,00"
              value={form.compensacao} onChange={e => setForm(f => ({ ...f, compensacao: e.target.value }))} onBlur={() => handleBlur('compensacao')} />
            <FieldError field="compensacao" />
          </div>
          <div>
            <label className={labelClass}>Dias em Atraso</label>
            <input type="number" className={inputClass(false)} placeholder="0" value={form.diasAtraso} onChange={e => setForm(f => ({ ...f, diasAtraso: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Parcelas</label>
            <input type="number" className={inputClass(false)} placeholder="0" value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Situação</label>
            <select className={inputClass(false)} value={form.situacao} onChange={e => setForm(f => ({ ...f, situacao: e.target.value as Situacao }))}>
              {(Object.keys(situacaoLabels) as Situacao[]).map(s => (
                <option key={s} value={s}>{situacaoLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</>) : 'Cadastrar Cliente'}
        </button>
      </form>
    </div>
  );
};

export default CadastrarPage;
