import { useState } from 'react';
import { formatCurrency } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import PaymentForm, {
  emptyPaymentFormValue,
  buildImpostoLabel,
  type PaymentFormValue,
} from '@/components/PaymentForm';

const REGIONAIS = ['RJ / SP', 'MG', 'PR / SC / RS', 'BA / NE', 'GO / DF', 'Outros'];

// ─── Helpers ──────────────────────────────────────────────────────
interface ClienteErrors {
  nome?: string;
  cnpj?: string;
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

  const [clienteForm, setClienteForm] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    regional: 'RJ / SP',
    executivo: '',
  });

  const [paymentValue, setPaymentValue] = useState<PaymentFormValue>(() => emptyPaymentFormValue());

  const [clienteErrors, setClienteErrors] = useState<ClienteErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // ─── Validation ───────────────────────────────────────────────
  const validateCliente = (): ClienteErrors => {
    const errs: ClienteErrors = {};
    if (!clienteForm.nome.trim()) errs.nome = 'Nome é obrigatório.';
    if (clienteForm.cnpj && !isValidCnpj(clienteForm.cnpj))
      errs.cnpj = 'CNPJ deve ter 14 dígitos.';
    return errs;
  };

  const validatePayment = (): string | null => {
    if (paymentValue.impostos.length === 0 && !paymentValue.impostoOutro.trim())
      return 'Selecione pelo menos um imposto.';
    if (!paymentValue.valorCompensacao || paymentValue.valorCompensacao <= 0)
      return 'Valor Compensação é obrigatório e deve ser maior que zero.';
    if (!paymentValue.vctoVitbank && !paymentValue.vctoMonetali)
      return 'Informe ao menos uma data de vencimento (VITBANK ou MONETALI).';
    if (!paymentValue.mesReferencia) return 'Mês de referência é obrigatório.';

    // Sum must match compensation
    const somaVbMon = (paymentValue.vitbank || 0) + (paymentValue.monetali || 0);
    if (paymentValue.valorCompensacao > 0 && Math.abs(somaVbMon - paymentValue.valorCompensacao) > 0.01) {
      return `Soma VITBANK + MONETALI (${formatCurrency(somaVbMon)}) deve bater com o valor de compensação (${formatCurrency(paymentValue.valorCompensacao)}).`;
    }
    return null;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
    setClienteErrors(validateCliente());
  };

  const setCliente = (field: string, value: string) =>
    setClienteForm(f => ({ ...f, [field]: value }));

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clienteErrs = validateCliente();
    const paymentErr = validatePayment();

    setClienteErrors(clienteErrs);
    setTouched(new Set(['nome', 'cnpj']));

    if (Object.keys(clienteErrs).length > 0) {
      toast.error('Corrija os erros do cliente antes de enviar.');
      return;
    }
    if (paymentErr) {
      toast.error(paymentErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const comp = paymentValue.valorCompensacao;
      const vb = paymentValue.vitbank;
      const mn = paymentValue.monetali;
      const impostoLabel = buildImpostoLabel(paymentValue);
      const diasVb = calcDiasAtraso(paymentValue.vctoVitbank);
      const diasMn = calcDiasAtraso(paymentValue.vctoMonetali);

      // 1. Create client
      const { data: clienteRow, error: clienteErr } = await supabase
        .from('clientes')
        .insert({
          nome: clienteForm.nome.trim(),
          cnpj: clienteForm.cnpj ? clienteForm.cnpj.replace(/\D/g, '') : null,
          email: clienteForm.email.trim() || null,
          telefone: clienteForm.telefone.trim() || null,
          regional: clienteForm.regional || null,
          executivo_responsavel: clienteForm.executivo.trim() || null,
          valor_total_atraso: comp,
          status: 'pendente',
          qtd_pagamentos_atraso: 1,
          dias_atraso_max: Math.max(diasVb, diasMn),
        })
        .select('id')
        .single();

      if (clienteErr) throw new Error(clienteErr.message);

      const clienteId = (clienteRow as { id: string }).id;

      // 2. Create payment
      const vctos = [paymentValue.vctoVitbank, paymentValue.vctoMonetali].filter(Boolean).sort();
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
          vcto_vitbank: paymentValue.vctoVitbank || null,
          monetali: mn,
          vcto_monetali: paymentValue.vctoMonetali || null,
          mes_referencia: paymentValue.mesReferencia,
          data_vencimento: dataVencimento,
          status: 'em_aberto',
        });

      if (pagErr) throw new Error(pagErr.message);

      // 3. Success
      toast.success('Cliente cadastrado com sucesso!');
      await refetchClientes();

      // Reset
      setClienteForm({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        regional: 'RJ / SP',
        executivo: '',
      });
      setPaymentValue(emptyPaymentFormValue());
      setClienteErrors({});
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

  const FieldError = ({ field }: { field: keyof ClienteErrors }) => {
    if (!touched.has(field) || !clienteErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{clienteErrors[field]}</p>;
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
              <label className={labelClass}>
                Nome / Razão Social <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass(touched.has('nome') && !!clienteErrors.nome)}
                placeholder="Nome completo ou razão social"
                value={clienteForm.nome}
                onChange={e => setCliente('nome', e.target.value)}
                onBlur={() => handleBlur('nome')}
                autoFocus
              />
              <FieldError field="nome" />
            </div>
            <div>
              <label className={labelClass}>CNPJ</label>
              <input
                className={inputClass(touched.has('cnpj') && !!clienteErrors.cnpj)}
                placeholder="00.000.000/0001-00"
                value={clienteForm.cnpj}
                onChange={e => setCliente('cnpj', formatCnpj(e.target.value))}
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
                value={clienteForm.email}
                onChange={e => setCliente('email', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                className={inputClass(false)}
                placeholder="(11) 99999-9999"
                value={clienteForm.telefone}
                onChange={e => setCliente('telefone', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Regional</label>
              <select
                className={inputClass(false)}
                value={clienteForm.regional}
                onChange={e => setCliente('regional', e.target.value)}
              >
                {REGIONAIS.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Executivo Responsável</label>
              <input
                className={inputClass(false)}
                placeholder="Nome do executivo"
                value={clienteForm.executivo}
                onChange={e => setCliente('executivo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ═══ Dados do Pagamento (componente reutilizável) ═══ */}
        <div className="glass-card p-6">
          <h3 className={sectionClass}>Dados do Pagamento</h3>
          <PaymentForm
            initialValues={paymentValue}
            onChange={setPaymentValue}
            hideHeader
            hideButtons
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Cadastrar Cliente
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CadastrarPage;
