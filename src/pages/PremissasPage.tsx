import { useState } from 'react';
import { Settings, Save, Plus, Trash2, FileText } from 'lucide-react';
import { premissas } from '@/data/premissas';

const PremissasPage = () => {
  const [form, setForm] = useState({ ...premissas });
  const [saved, setSaved] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const handleSave = () => {
    Object.assign(premissas, {
      taxaJurosDia: form.taxaJurosDia,
      taxaJurosMes: form.taxaJurosMes,
      multaAtraso: form.multaAtraso,
      diasCarencia: form.diasCarencia,
      diasEscalacaoJuridica: form.diasEscalacaoJuridica,
      emailRemetente: form.emailRemetente,
      templates: [...form.templates],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addTemplate = () => {
    setForm(prev => ({
      ...prev,
      templates: [...prev.templates, { id: Date.now().toString(), nome: 'Novo Template', corpo: 'Prezado(a) {nome},\n\n...\n\nAtenciosamente,\nEquipe Monetali' }],
    }));
  };

  const removeTemplate = (id: string) => {
    setForm(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  };

  const updateTemplate = (id: string, field: 'nome' | 'corpo', value: string) => {
    setForm(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === id ? { ...t, [field]: value } : t),
    }));
  };

  const numInput = (label: string, field: keyof typeof form, suffix: string, step = '0.01') => (
    <div className="bg-secondary/30 rounded-lg p-4">
      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</label>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="number"
          step={step}
          value={form[field] as number}
          onChange={e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
          className="flex-1 bg-transparent text-lg font-semibold font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
        />
        <span className="text-sm text-muted-foreground font-medium">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <Settings className="h-5 w-5" /> Premissas
        </h2>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-[hsl(var(--recovered))] text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          <Save className="h-4 w-4" /> {saved ? 'Salvo!' : 'Salvar Premissas'}
        </button>
      </div>

      {/* Taxas e Parâmetros */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Taxas e Parâmetros</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {numInput('Taxa de Juros ao Dia', 'taxaJurosDia', '%')}
          {numInput('Taxa de Juros ao Mês', 'taxaJurosMes', '%')}
          {numInput('Multa por Atraso', 'multaAtraso', '%')}
          {numInput('Dias de Carência', 'diasCarencia', 'dias', '1')}
          {numInput('Dias p/ Escalação Jurídica', 'diasEscalacaoJuridica', 'dias', '1')}
        </div>
      </div>

      {/* Email */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Email</h3>
        <div className="bg-secondary/30 rounded-lg p-4">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Email Remetente Padrão</label>
          <input
            type="email"
            value={form.emailRemetente}
            onChange={e => setForm(prev => ({ ...prev, emailRemetente: e.target.value }))}
            className="w-full mt-2 bg-transparent text-base font-mono border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Templates */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Templates de Cobrança</h3>
          <button onClick={addTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Template
          </button>
        </div>

        <div className="space-y-4">
          {form.templates.map(t => (
            <div key={t.id} className="bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="h-4 w-4 text-accent shrink-0" />
                  <input
                    value={t.nome}
                    onChange={e => updateTemplate(t.id, 'nome', e.target.value)}
                    className="flex-1 bg-transparent font-semibold border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingTemplate(editingTemplate === t.id ? null : t.id)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {editingTemplate === t.id ? 'Fechar' : 'Editar'}
                  </button>
                  <button onClick={() => removeTemplate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {editingTemplate === t.id && (
                <textarea
                  value={t.corpo}
                  onChange={e => updateTemplate(t.id, 'corpo', e.target.value)}
                  rows={8}
                  className="w-full mt-2 px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono resize-y"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Variáveis disponíveis */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Variáveis Disponíveis para Templates</h3>
        <div className="flex flex-wrap gap-2">
          {['{nome}', '{cnpj}', '{valor}', '{data_vencimento}', '{dias_atraso}', '{juros}', '{valor_atualizado}', '{executivo}', '{dias_carencia}'].map(v => (
            <code key={v} className="px-2 py-1 bg-secondary rounded text-xs font-mono text-primary">{v}</code>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremissasPage;
