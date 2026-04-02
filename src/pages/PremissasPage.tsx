import { useState } from 'react';
import { Settings, Save, Plus, Trash2, FileText, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { premissas, TEMPLATE_VARIABLES, type EmailTemplate } from '@/data/premissas';

const PremissasPage = () => {
  const [form, setForm] = useState({ ...premissas, templates: premissas.templates.map(t => ({ ...t })) });
  const [saved, setSaved] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parametros' | 'templates'>('parametros');

  const handleSave = () => {
    Object.assign(premissas, {
      taxaJurosDia: form.taxaJurosDia,
      taxaJurosMes: form.taxaJurosMes,
      multaAtraso: form.multaAtraso,
      diasCarencia: form.diasCarencia,
      diasEscalacaoJuridica: form.diasEscalacaoJuridica,
      emailRemetente: form.emailRemetente,
      templates: form.templates.map(t => ({ ...t })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addTemplate = () => {
    const newT: EmailTemplate = {
      id: Date.now().toString(),
      nome: 'Novo Template',
      assunto: 'Assunto do email — {{nome_cliente}}',
      corpo: `Prezado(a) {{nome_cliente}},\n\n[Corpo do email aqui]\n\nCNPJ: {{cnpj}}\nValor: {{valor_total}}\nDias em atraso: {{dias_atraso}}\nParcelas em aberto: {{parcelas_abertas}}\n\nAtenciosamente,\nEquipe Monetali`,
    };
    setForm(prev => ({ ...prev, templates: [...prev.templates, newT] }));
    setExpandedTemplate(newT.id);
  };

  const duplicateTemplate = (t: EmailTemplate) => {
    const dup: EmailTemplate = { ...t, id: Date.now().toString(), nome: `${t.nome} (cópia)` };
    setForm(prev => ({ ...prev, templates: [...prev.templates, dup] }));
    setExpandedTemplate(dup.id);
  };

  const removeTemplate = (id: string) => {
    setForm(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
    if (expandedTemplate === id) setExpandedTemplate(null);
  };

  const updateTemplate = (id: string, field: keyof EmailTemplate, value: string) => {
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

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('parametros')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'parametros' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4 inline mr-1.5" />
          Parâmetros
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'templates' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Templates de Email
        </button>
      </div>

      {activeTab === 'parametros' && (
        <>
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
        </>
      )}

      {activeTab === 'templates' && (
        <>
          {/* Templates */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Templates de Cobrança</h3>
              <button onClick={addTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Novo Template
              </button>
            </div>

            <div className="space-y-3">
              {form.templates.map(t => {
                const isExpanded = expandedTemplate === t.id;
                return (
                  <div key={t.id} className="bg-secondary/30 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold truncate">{t.nome}</span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {t.assunto}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button onClick={e => { e.stopPropagation(); duplicateTemplate(t); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); removeTemplate(t.id); }} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Nome do Template</label>
                          <input
                            value={t.nome}
                            onChange={e => updateTemplate(t.id, 'nome', e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Assunto do Email</label>
                          <input
                            value={t.assunto}
                            onChange={e => updateTemplate(t.id, 'assunto', e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-background border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Corpo do Email</label>
                          <textarea
                            value={t.corpo}
                            onChange={e => updateTemplate(t.id, 'corpo', e.target.value)}
                            rows={12}
                            className="w-full mt-1 px-3 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono resize-y"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variáveis disponíveis */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Variáveis Disponíveis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_VARIABLES.map(v => (
                <div key={v.key} className="flex items-center gap-2 text-sm">
                  <code className="px-2 py-0.5 bg-secondary rounded text-xs font-mono text-primary shrink-0">{v.key}</code>
                  <span className="text-muted-foreground">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PremissasPage;
