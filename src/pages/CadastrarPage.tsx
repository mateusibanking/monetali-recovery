import { useState, useMemo } from 'react';
import { formatCurrency } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { usePremissas } from '@/hooks/usePremissas';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2, ShieldAlert, Calculator, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// ─── Month options (same as MonthSelector) ────────────────────────
const MONTHS = [
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

const IMPOSTOS = ['INSS', 'P/C + IR/CS', 'ISS', 'PIS/COFINS', 'Outros'];

const REGIONAIS = ['RJ / SP', 'MG', 'PR / SC / RS', 'BA / NE', 'GO / DF', 'Outros'];

// ─── Helpers ──────────────────────────────────────────────────────
interface FormErrors {
  nome?: string;
  cnpj?: string;
  compensacao?: string;
  vitbank?: string;
  monetali?: string;
  vctoVitbank?: string;
  vctoMonetali?: string;
  somaVbMon?: string;
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

function calcDiasAtraso(vcto: string): number {
  if (!vcto) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dt = new Date(vcto + 'T00:00:00');
  const diff = Math.floor((hoje.getTime() - dt.getTime()) / 86400000);
  return Math.max(0, diff);
}

// ─── Component ────────────────────────────────────────────────────
const CadastrarPage = () => {
  const canCreate = usePermission('clientes', 'create');
  const { refetch: refetchClientes } = useClientes();
  const { data: premissas, loading: loadingPremissas } = usePremissas();

  const [form, setForm] = useState({
    // Dados do cliente
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    regional: 'RJ / SP',
    executivo: '',
    // Dados do pagamento
    compensacao: '',
    vitbank: '',
    monetali: '',
    imposto: 'INSS',
    vctoVitbank: '',
    vctoMonetali: '',
    mesReferencia: '2026-03',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // ─── Validation ───────────────────────────────────────────────
  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório.';
    if (form.cnpj && !isValidCnpj(form.cnpj)) errs.cnpj = 'CNPJ deve ter 14 dígitos.';
    if (!form.compensacao || parseFloat(form.compensacao) <= 0)
      errs.compensacao = 'Compensação é obrigatória e deve ser > 0.';
    if (!form.vitbank && form.vitbank !== '0')
      errs.vitbank = 'VitBank é obrigatório.';
    if (!form.monetali && form.monetali !== '0')
      errs.monetali = 'Monetali é obrigatório.';

    // At least one vencimento required
    if (!form.vctoVitbank && !form.vctoMonetali)
      errs.vctoVitbank = 'Pelo menos uma data de vencimento é obrigatória.';

    // VB + MON > compensacao warning (non-blocking)
    const vb = parseFloat(form.vitbank) || 0;
    const mn = parseFloat(form.monetali) || 0;
    const comp = parseFloat(form.compensacao) || 0;
    if (comp > 0 && (vb + mn) > comp) {
      errs.somaVbMon = `VitBank + Monetali (${formatCurrency(vb + mn)}) excede Compensação (${formatCurrency(comp)}).`;
    }

    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
    setErrors(validate());
  };

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // ─── Real-time juros preview ──────────────────────────────────
  const jurosPreview = useMemo(() => {
    const vb = parseFloat(form.vitbank) || 0;
    const mn = parseFloat(form.monetali) || 0;
    const taxa = premissas.taxaJurosDia;
    const multa = premissas.multaAtraso;

    const diasVb = calcDiasAtraso(form.vctoVitbank);
    const diasMn = calcDiasAtraso(form.vctoMonetali);

    const jurosVb = diasVb > 0 ? vb * (taxa / 100) * diasVb + vb * (multa / 100) : 0;
    const jurosMn = diasMn > 0 ? mn * (taxa / 100) * diasMn + mn * (multa / 100) : 0;

    return {
      diasVb,
      diasMn,
      jurosVb: Math.round(jurosVb * 100) / 100,
      jurosMn: Math.round(jurosMn * 100) / 100,
      total: Math.round((jurosVb + jurosMn) * 100) / 100,
      vb,
      mn,
    };
  }, [form.vitbank, form.monetali, form.vctoVitbank, form.vctoMonetali, premissas]);

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    // somaVbMon is a warning, not blocking
    const blockingErrors = { ...errs };
    delete blockingErrors.somaVbMon;

    setErrors(errs);
    setTouched(new Set([
      'nome', 'cnpj', 'compensacao', 'vitbank', 'monetali', 'vctoVitbank', 'vctoMonetali',
    ]));

    if (Object.keys(blockingErrors).length > 0) {
      toast.error('Corrija os erros antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const comp = parseFloat(form.compensacao) || 0;
      const vb = parseFloat(form.vitbank) || 0;
      const mn = parseFloat(form.monetali) || 0;

      // 1. Create client record
      const { data: clienteRow, error: clienteErr } = await supabase
        .from('clientes')
        .insert({
          nome: form.nome.trim(),
          cnpj: form.cnpj ? form.cnpj.replace(/\D/g, '') : null,
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          regional: form.regional || null,
          executivo_responsavel: form.executivo.trim() || null,
          valor_total_atraso: comp,
          status: 'pendente',
          qtd_pagamentos_atraso: 1,
          dias_atraso_max: Math.max(jurosPreview.diasVb, jurosPreview.diasMn),
        })
        .select('id')
        .single();

      if (clienteErr) throw new Error(clienteErr.message);

      const clienteId = (clienteRow as { id: string }).id;

      // 2. Create payment record
      // Use the earliest vencimento as data_vencimento
      const vctos = [form.vctoVitbank, form.vctoMonetali].filter(Boolean).sort();
      const dataVencimento = vctos[0] || new Date().toISOString().split('T')[0];

      const { error: pagErr } = await supabase
        .from('pagamentos_atraso')
        .insert({
          cliente_id: clienteId,
          descricao: form.imposto,
          valor: comp,
          valor_compensacao: comp,
          imposto: form.imposto,
          vitbank: vb,
          vcto_vitbank: form.vctoVitbank || null,
          monetali: mn,
          vcto_monetali: form.vctoMonetali || null,
          juros: jurosPreview.total,
          mes_referencia: form.mesReferencia,
          data_vencimento: dataVencimento,
          status: 'em_aberto',
        });

      if (pagErr) throw new Error(pagErr.message);

      // 3. Success
      toast.success('Cliente cadastrado com sucesso!');
      await refetchClientes();

      // Reset form
      setForm({
        nome: '', cnpj: '', email: '', telefone: '',
        regional: 'RJ / SP', executivo: '',
        compensacao: '', vitbank: '', monetali: '',
        imposto: 'INSS', vctoVitbank: '', vctoMonetali: '',
        mesReferencia: '2026-03',
      });
      setErrors({});
      setTouched(new Set());
    } catch (err: any) {
      console.error('Cadastro error:', err);
      toast.error(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────
  const inputClass = (hasError: boolean) =>
    `w-full bg-secondary/50 border rounded-lg text-sm px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
      hasError ? 'border-destructive focus:ring-destructive/50' : 'border-border/50 focus:ring-primary/50'
    }`;
  const labelClass = 'text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block';
  const sectionClass = 'text-sm font-bold uppercase tracking-wider text-primary/70 border-b border-border/50 pb-2 mb-4';

  const FieldError = ({ field }: { field: keyof FormErrors }) => {
    if (!touched.has(field) || !errors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
  };

  // ─── Permission gate ──────────────────────────────────────────
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">Cadastrar Cliente</h2>
          <p className="text-xs text-muted-foreground">Preencha os dados do cliente e do pagamento em atraso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ═══ Dados do Cliente ═══ */}
        <div className="glass-card p-6">
          <h3 className={sectionClass}>Dados do Cliente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome / Razão Social <span className="text-destructive">*</span></label>
              <input
                className={inputClass(touched.has('nome') && !!errors.nome)}
                placeholder="Nome completo ou razão social"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                onBlur={() => handleBlur('nome')}
                autoFocus
              />
              <FieldError field="nome" />
            </div>
            <div>
              <label className={labelClass}>CNPJ</label>
              <input
                className={inputClass(touched.has('cnpj') && !!errors.cnpj)}
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={e => set('cnpj', formatCnpj(e.target.value))}
                onBlur={() => handleBlur('cnpj')}
              />
              <FieldError field="cnpj" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass(false)}
                placeholder="contato@empresa.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                className={inputClass(false)}
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={e => set('telefone', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Regional</label>
              <select
                className={inputClass(false)}
                value={form.regional}
                onChange={e => set('regional', e.target.value)}
              >
                {REGIONAIS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Executivo Responsável</label>
              <input
                className={inputClass(false)}
                placeholder="Nome do executivo"
                value={form.executivo}
                onChange={e => set('executivo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ═══ Dados do Pagamento ═══ */}
        <div className="glass-card p-6">
          <h3 className={sectionClass}>Dados do Pagamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor Compensação (R$) <span className="text-destructive">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass(touched.has('compensacao') && !!errors.compensacao)}
                placeholder="0,00"
                value={form.compensacao}
                onChange={e => set('compensacao', e.target.value)}
                onBlur={() => handleBlur('compensacao')}
              />
              <FieldError field="compensacao" />
            </div>
            <div>
              <label className={labelClass}>Imposto</label>
              <select
                className={inputClass(false)}
                value={form.imposto}
                onChange={e => set('imposto', e.target.value)}
              >
                {IMPOSTOS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>VitBank (R$) <span className="text-destructive">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass(touched.has('vitbank') && !!errors.vitbank)}
                placeholder="0,00"
                value={form.vitbank}
                onChange={e => set('vitbank', e.target.value)}
                onBlur={() => handleBlur('vitbank')}
              />
              <FieldError field="vitbank" />
            </div>
            <div>
              <label className={labelClass}>Vcto VitBank</label>
              <input
                type="date"
                className={inputClass(touched.has('vctoVitbank') && !!errors.vctoVitbank)}
                value={form.vctoVitbank}
                onChange={e => set('vctoVitbank', e.target.value)}
                onBlur={() => handleBlur('vctoVitbank')}
              />
              <FieldError field="vctoVitbank" />
            </div>
            <div>
              <label className={labelClass}>Monetali (R$) <span className="text-destructive">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass(touched.has('monetali') && !!errors.monetali)}
                placeholder="0,00"
                value={form.monetali}
                onChange={e => set('monetali', e.target.value)}
                onBlur={() => handleBlur('monetali')}
              />
              <FieldError field="monetali" />
            </div>
            <div>
              <label className={labelClass}>Vcto Monetali</label>
              <input
                type="date"
                className={inputClass(touched.has('vctoMonetali') && !!errors.vctoMonetali)}
                value={form.vctoMonetali}
                onChange={e => set('vctoMonetali', e.target.value)}
                onBlur={() => handleBlur('vctoMonetali')}
              />
            </div>
            <div>
              <label className={labelClass}>Mês de Referência</label>
              <select
                className={inputClass(false)}
                value={form.mesReferencia}
                onChange={e => set('mesReferencia', e.target.value)}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* VB + MON > Compensação warning */}
          {errors.somaVbMon && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{errors.somaVbMon}</span>
            </div>
          )}
        </div>

        {/* ═══ Prévia de Juros (automática) ═══ */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-accent" />
            <h3 className={`${sectionClass} mb-0 border-0 pb-0`}>Prévia de Juros</h3>
            {loadingPremissas && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Taxa: {premissas.taxaJurosDia}% ao dia · Multa: {premissas.multaAtraso}%
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Juros VitBank
                {jurosPreview.diasVb > 0 && (
                  <span className="text-[10px] ml-1">
                    ({jurosPreview.diasVb} dias sobre {formatCurrency(jurosPreview.vb)})
                  </span>
                )}
              </span>
              <span className={`font-mono font-semibold ${jurosPreview.jurosVb > 0 ? 'text-overdue' : 'text-muted-foreground'}`}>
                {formatCurrency(jurosPreview.jurosVb)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Juros Monetali
                {jurosPreview.diasMn > 0 && (
                  <span className="text-[10px] ml-1">
                    ({jurosPreview.diasMn} dias sobre {formatCurrency(jurosPreview.mn)})
                  </span>
                )}
              </span>
              <span className={`font-mono font-semibold ${jurosPreview.jurosMn > 0 ? 'text-overdue' : 'text-muted-foreground'}`}>
                {formatCurrency(jurosPreview.jurosMn)}
              </span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Total Juros</span>
              <span className={`font-mono font-bold text-base ${jurosPreview.total > 0 ? 'text-overdue' : 'text-muted-foreground'}`}>
                {formatCurrency(jurosPreview.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</>
          ) : (
            <><UserPlus className="h-4 w-4" /> Cadastrar Cliente</>
          )}
        </button>
      </form>
    </div>
  );
};

export default CadastrarPage;
