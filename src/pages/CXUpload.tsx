import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, Sparkles, Download, Trash2, Eye, History } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CXTicket } from '@/lib/cx-logic';
import { generateRandomCXTickets } from '@/lib/cx-random';
import { supabase } from '@/integrations/supabase/client';

interface UploadRecord {
  id: string;
  file_name: string;
  ticket_count: number;
  created_at: string;
}

const CXUpload = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [ticketCount, setTicketCount] = useState(100);
  const [generatedData, setGeneratedData] = useState<CXTicket[] | null>(null);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;
    const { data } = await supabase
      .from('cx_uploads')
      .select('id, file_name, ticket_count, created_at')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });
    if (data) setHistory(data as UploadRecord[]);
    setLoadingHistory(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const saveAndNavigate = useCallback(async (data: CXTicket[], fileName = 'Upload') => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      await supabase.from('cx_uploads').insert({
        user_id: session.session.user.id,
        ticket_data: data as any,
        file_name: fileName,
        ticket_count: data.length,
      });
    }
    localStorage.setItem('cx_data_uploaded', 'true');
    navigate('/cx/dashboard', { state: { ticketData: data } });
  }, [navigate]);

  const loadFromHistory = useCallback(async (id: string) => {
    const { data } = await supabase.from('cx_uploads').select('ticket_data').eq('id', id).maybeSingle();
    if (data?.ticket_data) {
      navigate('/cx/dashboard', { state: { ticketData: data.ticket_data as unknown as CXTicket[] } });
    }
  }, [navigate]);

  const deleteUpload = useCallback(async (id: string) => {
    await supabase.from('cx_uploads').delete().eq('id', id);
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const processData = useCallback((data: CXTicket[], fileName: string) => {
    if (data.length === 0) { setError('Nenhum dado válido encontrado no arquivo.'); return; }
    saveAndNavigate(data, fileName);
  }, [saveAndNavigate]);

  const parseFile = useCallback((file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          try { processData(mapColumns(results.data as Record<string, string>[]), file.name); }
          catch (e: any) { setError(e.message); }
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          processData(mapColumns(XLSX.utils.sheet_to_json<Record<string, string>>(ws)), file.name);
        } catch (err: any) { setError(err.message); }
      };
      reader.readAsArrayBuffer(file);
    } else { setError('Formato não suportado. Use .csv ou .xlsx'); }
  }, [processData]);

  const mapColumns = (rows: Record<string, any>[]): CXTicket[] => {
    const findCol = (row: Record<string, any>, candidates: string[]) =>
      Object.keys(row).find(k => candidates.some(c => k.toLowerCase().includes(c)));
    const sample = rows[0];
    if (!sample) throw new Error('Arquivo vazio');
    const idCol = findCol(sample, ['id_chamado', 'id', 'ticket', 'chamado']);
    const clienteCol = findCol(sample, ['cliente', 'nome', 'name']);
    const tmaCol = findCol(sample, ['tma', 'tempo', 'minutos', 'duration']);
    const npsCol = findCol(sample, ['nps', 'score', 'nota']);
    const causaCol = findCol(sample, ['causa', 'motivo', 'reason', 'root_cause']);
    const dataCol = findCol(sample, ['data', 'date', 'created']);
    if (!tmaCol || !npsCol || !causaCol) throw new Error('Colunas obrigatórias não encontradas. Verifique: TMA, NPS, Causa Raiz.');
    const tmeCol = findCol(sample, ['tme', 'espera', 'wait']);
    const fcrCol = findCol(sample, ['fcr', 'first_call', 'resolucao']);
    const tipoCol = findCol(sample, ['tipo', 'type', 'categoria']);
    const transcricaoCol = findCol(sample, ['transcricao', 'transcript']);
    const comentarioCol = findCol(sample, ['comentario', 'comment', 'feedback']);
    return rows.map((r, i) => ({
      id_chamado: r[idCol || ''] || `CHM-${String(i + 1).padStart(5, '0')}`,
      cliente: r[clienteCol || ''] || `Cliente ${i + 1}`,
      tma_minutos: Number(r[tmaCol]) || 0,
      tme_minutos: Number(r[tmeCol || ''] || 0),
      nps_score: Number(r[npsCol]) || 0,
      fcr: Number(r[fcrCol || ''] || 0) as 0 | 1,
      causa_raiz: r[causaCol] || 'Outros',
      tipo_chamado: r[tipoCol || ''] || 'Informação',
      data_chamado: r[dataCol || ''] || new Date().toISOString().split('T')[0],
      transcricao: r[transcricaoCol || ''] || '',
      comentario_nps: r[comentarioCol || ''] || '',
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleGenerate = () => setGeneratedData(generateRandomCXTickets(ticketCount));

  const handleDownloadExcel = () => {
    if (!generatedData) return;
    const ws = XLSX.utils.json_to_sheet(generatedData.map(c => ({
      ID_Chamado: c.id_chamado, Cliente: c.cliente, TMA_Minutos: c.tma_minutos,
      NPS_Score: c.nps_score, Causa_Raiz: c.causa_raiz, Data: c.data_chamado,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    XLSX.writeFile(wb, `chamados_cx_${ticketCount}.xlsx`);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <Upload className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Upload Base de Chamados</h1>
        <p className="mt-2 text-muted-foreground">Carregue sua base de chamados para a análise de Customer Experience</p>
      </div>

      <Card
        className={`mb-6 flex min-h-[200px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${dragging ? 'border-primary bg-accent' : 'hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.csv,.xlsx,.xls';
          input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) parseFile(file); };
          input.click();
        }}
      >
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="mb-1 font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
        <p className="text-sm text-muted-foreground">Formatos aceitos: .csv, .xlsx</p>
      </Card>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="mb-1 text-sm font-semibold">Formato da Planilha</p>
            <p className="text-xs text-muted-foreground">
              A planilha deve conter: <strong>ID Chamado, Cliente, TMA</strong> (minutos),
              <strong> NPS Score</strong> (0-10), <strong>Causa Raiz</strong>, <strong>Data do Chamado</strong>.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Gerar Dados Aleatórios para Análise</h2>
        </div>
        <div className="mb-4">
          <label className="mb-2 block text-xs text-muted-foreground">
            Quantidade de chamados: <span className="font-bold text-foreground">{ticketCount}</span>
          </label>
          <Slider value={[ticketCount]} onValueChange={(v) => setTicketCount(v[0])} min={50} max={500} step={10} className="my-3" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>50</span><span>500</span></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleGenerate}><Sparkles className="mr-2 h-4 w-4" />Gerar Dados</Button>
          {generatedData && (
            <>
              <Button variant="outline" onClick={handleDownloadExcel}><Download className="mr-2 h-4 w-4" />Baixar Excel</Button>
              <Button onClick={() => saveAndNavigate(generatedData, `Dados aleatórios (${generatedData.length} chamados)`)}>Usar para Análise →</Button>
            </>
          )}
        </div>
        {generatedData && <p className="mt-3 text-xs text-muted-foreground">✅ {generatedData.length} chamados gerados com sucesso.</p>}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Histórico de Uploads</h2>
        </div>
        {loadingHistory ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum upload realizado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="text-center">Chamados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.file_name}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{h.ticket_count}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(h.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadFromHistory(h.id)}><Eye className="mr-1 h-3 w-3" /> Carregar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteUpload(h.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CXUpload;
