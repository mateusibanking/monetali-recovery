import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, ArrowRight, Sparkles, TableProperties } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clients as globalClients, Client } from '@/data/mockData';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const SYSTEM_FIELDS = [
  { value: 'ignorar', label: '— Ignorar —' },
  { value: 'nome', label: 'Nome do cliente' },
  { value: 'cnpj', label: 'Documento (CNPJ)' },
  { value: 'compensacao', label: 'Valor original (Compensação)' },
  { value: 'juros', label: 'Juros' },
  { value: 'boletoVitbank', label: 'Boleto Vitbank' },
  { value: 'pixMonetali', label: 'PIX Monetali' },
  { value: 'regional', label: 'Regional' },
  { value: 'executivo', label: 'Executivo' },
  { value: 'diasAtraso', label: 'Dias de atraso' },
  { value: 'parcelas', label: 'Parcelas' },
  { value: 'situacao', label: 'Situação / Status' },
  { value: 'mes_referencia', label: 'Mês referência' },
];

type Step = 'upload' | 'mapping' | 'importing' | 'done';

interface ImportResult { imported: number; errors: number; errorDetails: string[] }

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  });
}

function parseXLSX(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return data.map(row => row.map(cell => String(cell ?? '')));
}

function autoGuessMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const patterns: [RegExp, string][] = [
    [/nome|raz[aã]o|cliente/i, 'nome'],
    [/cnpj|cpf|documento/i, 'cnpj'],
    [/compensa[cç][aã]o|valor.?orig|valor.?total|saldo/i, 'compensacao'],
    [/juros/i, 'juros'],
    [/boleto|vitbank/i, 'boletoVitbank'],
    [/pix|monetali/i, 'pixMonetali'],
    [/regional|regi[aã]o/i, 'regional'],
    [/executivo|respons[aá]vel|gestor/i, 'executivo'],
    [/dias.*atraso|atraso/i, 'diasAtraso'],
    [/parcela/i, 'parcelas'],
    [/situa[cç][aã]o|status/i, 'situacao'],
    [/m[eê]s.*ref|refer[eê]ncia/i, 'mes_referencia'],
  ];
  headers.forEach((h, i) => {
    for (const [re, field] of patterns) {
      if (re.test(h) && !Object.values(mapping).includes(field)) {
        mapping[i] = field;
        break;
      }
    }
    if (!mapping[i]) mapping[i] = 'ignorar';
  });
  return mapping;
}

/* ─── Importação em Lote (bulk) ─── */
const ImportacaoLote = () => {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processData = useCallback((parsed: string[][], name: string) => {
    if (parsed.length < 2) { toast.error('Arquivo vazio ou inválido'); return; }
    setFileName(name);
    const h = parsed[0];
    const data = parsed.slice(1).filter(r => r.some(c => c.trim()));
    setHeaders(h);
    setRows(data.slice(0, 5));
    setAllRows(data);
    setMapping(autoGuessMapping(h));
    setStep('mapping');
  }, []);

  const handleFile = useCallback((file: File) => {
    const isExcel = /\.xlsx?$/i.test(file.name);
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseXLSX(e.target?.result as ArrayBuffer);
        processData(parsed, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseCSV(e.target?.result as string);
        processData(parsed, file.name);
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, [processData]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(() => {
    setStep('importing');
    setProgress(0);
    const mappedFields = Object.entries(mapping).filter(([, v]) => v !== 'ignorar');
    const total = allRows.length;
    let imported = 0;
    const errorDetails: string[] = [];
    const batchSize = Math.max(1, Math.floor(total / 20));
    let idx = 0;

    const processBatch = () => {
      const end = Math.min(idx + batchSize, total);
      for (let i = idx; i < end; i++) {
        const row = allRows[i];
        try {
          const entry: Partial<Client> = { id: String(globalClients.length + imported + 1), flags: [], mes_referencia: 'Março 2026' };
          for (const [colIdx, field] of mappedFields) {
            const val = row[Number(colIdx)] || '';
            switch (field) {
              case 'nome': entry.nome = val; break;
              case 'cnpj': entry.cnpj = val; break;
              case 'compensacao': entry.compensacao = parseFloat(val.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0; break;
              case 'juros': entry.juros = parseFloat(val.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0; break;
              case 'boletoVitbank': entry.boletoVitbank = parseFloat(val.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0; break;
              case 'pixMonetali': entry.pixMonetali = parseFloat(val.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0; break;
              case 'regional': entry.regional = val; break;
              case 'executivo': entry.executivo = val; break;
              case 'diasAtraso': entry.diasAtraso = parseInt(val) || 0; break;
              case 'parcelas': entry.parcelas = parseInt(val) || 1; break;
              case 'situacao': entry.situacao = (val as Client['situacao']) || 'NÃO PAGO'; break;
              case 'mes_referencia': entry.mes_referencia = val; break;
            }
          }
          if (!entry.nome) throw new Error('Nome vazio');
          globalClients.push(entry as Client);
          imported++;
        } catch (err: any) {
          errorDetails.push(`Linha ${i + 2}: ${err.message}`);
        }
      }
      idx = end;
      setProgress(Math.round((idx / total) * 100));
      if (idx < total) requestAnimationFrame(processBatch);
      else { setResult({ imported, errors: errorDetails.length, errorDetails }); setStep('done'); }
    };
    requestAnimationFrame(processBatch);
  }, [mapping, allRows]);

  const reset = () => { setStep('upload'); setFileName(''); setHeaders([]); setRows([]); setAllRows([]); setMapping({}); setProgress(0); setResult(null); };

  return (
    <>
      {step === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-accent/40 rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">Arraste seu arquivo aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Formatos aceitos: .csv, .xlsx, .xls, .txt</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">{fileName}</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{allRows.length} registros</span>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Mapeamento de colunas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate min-w-[80px] max-w-[140px]" title={h}>{h}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Select value={mapping[i] || 'ignorar'} onValueChange={v => setMapping(p => ({ ...p, [i]: v }))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SYSTEM_FIELDS.map(f => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Preview (primeiras 5 linhas)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap py-2 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground">{h}</span>
                            {mapping[i] && mapping[i] !== 'ignorar' && (
                              <span className="text-accent font-semibold text-[10px]">→ {SYSTEM_FIELDS.find(f => f.value === mapping[i])?.label}</span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs py-1.5 px-3 whitespace-nowrap max-w-[200px] truncate">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleImport} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Importar {allRows.length} registros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'importing' && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <FileSpreadsheet className="h-10 w-10 text-accent animate-pulse" />
            <p className="text-lg font-semibold text-foreground">Importando registros…</p>
            <div className="w-full max-w-md"><Progress value={progress} className="h-3" /></div>
            <p className="text-sm text-muted-foreground">{progress}% concluído</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && result && (
        <Card>
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-recovered/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-recovered" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Importação concluída</p>
                <p className="text-sm text-muted-foreground">{result.imported} registros importados, {result.errors} erros</p>
              </div>
            </div>
            {result.errors > 0 && (
              <div className="bg-overdue/10 border border-overdue/20 rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-overdue"><AlertCircle className="h-4 w-4" />Erros encontrados</div>
                <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errorDetails.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <Button onClick={reset} variant="outline">Nova importação</Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

/* ─── Importação com IA (placeholder) ─── */
const ImportacaoIA = () => (
  <Card>
    <CardContent className="p-8 flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-accent" />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <p className="text-lg font-bold text-foreground">Importação Inteligente</p>
        <p className="text-sm text-muted-foreground">
          Faça upload de qualquer planilha, PDF ou extrato bancário e nossa IA identificará automaticamente os campos,
          normalizará os dados e resolverá inconsistências antes da importação.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        {[
          { title: 'Mapeamento automático', desc: 'IA identifica colunas sem configuração manual' },
          { title: 'Limpeza de dados', desc: 'Normaliza CNPJs, valores e datas automaticamente' },
          { title: 'Detecção de duplicatas', desc: 'Identifica registros já existentes na base' },
        ].map((f, i) => (
          <div key={i} className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs font-semibold text-foreground">{f.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
      <Button disabled className="bg-accent/50 text-accent-foreground cursor-not-allowed">
        <Sparkles className="h-4 w-4 mr-2" /> Em breve
      </Button>
    </CardContent>
  </Card>
);

/* ─── Page ─── */
const ImportacaoPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Importação de Dados</h1>
    <Tabs defaultValue="lote" className="w-full">
      <TabsList className="bg-muted/50">
        <TabsTrigger value="ia" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
          <Sparkles className="h-4 w-4" /> Importação com IA
        </TabsTrigger>
        <TabsTrigger value="lote" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
          <TableProperties className="h-4 w-4" /> Importação em Lote
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ia" className="mt-4"><ImportacaoIA /></TabsContent>
      <TabsContent value="lote" className="mt-4"><ImportacaoLote /></TabsContent>
    </Tabs>
  </div>
);

export default ImportacaoPage;
