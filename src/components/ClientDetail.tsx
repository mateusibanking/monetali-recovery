import { useState } from 'react';
import { ArrowLeft, Mail, Phone, FileText, Calendar, MessageSquare, Save } from 'lucide-react';
import { Client, Situacao, Flag, collectionEvents, formatCurrency, situacaoLabels } from '@/data/mockData';
import StatusBadge from './StatusBadge';
import FlagBadge from './FlagBadge';

interface Props {
  client: Client;
  onBack: () => void;
}

const allFlags: Flag[] = ['Prioridade', 'Juros', 'Sem Contato', 'Jurídico', 'Parcelamento'];
const allSituacoes: Situacao[] = Object.keys(situacaoLabels) as Situacao[];

const eventTypeIcons: Record<string, typeof Mail> = {
  email: Mail, phone: Phone, letter: FileText, meeting: MessageSquare, legal: FileText,
};
const eventTypeLabels: Record<string, string> = {
  email: 'E-mail', phone: 'Telefone', letter: 'Carta', meeting: 'Reunião', legal: 'Jurídico',
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

  const events = collectionEvents
    .filter(e => e.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSave = () => {
    Object.assign(client, {
      compensacao: form.compensacao,
      juros: form.juros,
      boletoVitbank: form.boletoVitbank,
      pixMonetali: form.pixMonetali,
      diasAtraso: form.diasAtraso,
      parcelas: form.parcelas,
      regional: form.regional,
      executivo: form.executivo,
      situacao: form.situacao,
      flags: [...form.flags],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFlag = (flag: Flag) => {
    setForm(prev => ({
      ...prev,
      flags: prev.flags.includes(flag) ? prev.flags.filter(f => f !== flag) : [...prev.flags, flag],
    }));
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
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          <Save className="h-4 w-4" /> {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">{client.nome}</h2>
            <p className="text-sm font-mono text-muted-foreground">{client.cnpj}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status dropdown */}
            <select
              value={form.situacao}
              onChange={e => setForm(prev => ({ ...prev, situacao: e.target.value as Situacao }))}
              className="bg-secondary/50 border border-border/50 rounded-lg text-sm px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {allSituacoes.map(s => <option key={s} value={s}>{situacaoLabels[s]}</option>)}
            </select>
            {/* Flags toggles */}
            <div className="flex flex-wrap gap-1">
              {allFlags.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFlag(f)}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border transition-opacity ${
                    form.flags.includes(f) ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Histórico de Cobrança
        </h3>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro de cobrança.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, idx) => {
              const Icon = eventTypeIcons[event.type] || FileText;
              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {idx < events.length - 1 && <div className="w-px flex-1 bg-border/50 mt-2" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{eventTypeLabels[event.type]}</span>
                      <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Responsável: {event.agent}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;