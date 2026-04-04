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
import { ClientData } from '@/lib/rfv-logic';
import { generateRandomClients } from '@/lib/rfv-random';
import { supabase } from '@/integrations/supabase/client';

interface UploadRecord {
  id: string;
  file_name: string;
  client_count: number;
  created_at: string;
}

const RFVUpload = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [clientCount, setClientCount] = useState(100);
  const [generatedData, setGeneratedData] = useState<ClientData[] | null>(null);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;
    const { data } = await supabase
      .from('rfv_uploads')
      .select('id, file_name, client_count, created_at')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });
    if (data) setHistory(data as UploadRecord[]);
    setLoadingHistory(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const saveAndNavigate = useCallback(async (data: ClientData[], fileName = 'Upload') => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      await supabase.from('rfv_uploads').insert({
        user_id: session.session.user.id,
        client_data: data as any,
        file_name: fileName,
        client_count: data.length,
      });
    }
    localStorage.setItem('rfv_data_uploaded', 'true');
    navigate('/rfv/parametros', { state: { clientData: data } });
  }, [navigate]);

  const loadFromHistory = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('rfv_uploads')
      .select('client_data')
      .eq('id', id)
      .maybeSingle();
    if (data?.client_data) {
      const clientData = data.client_data as unknown as ClientData[];
      navigate('/rfv/parametros', { state: { clientData } });
    }
  }, [navigate]);

  const deleteUpload = useCallback(async (id: string) => {
    await supabase.from('rfv_uploads').delete().eq('id', id);
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const processData = useCallback((data: ClientData[], fileName: string) => {
    if (data.length === 0) {
      setError('Nenhum dado válido encontrado no arquivo.');
      return;
    }
    saveAndNavigate(data, fileName);
  }, [saveAndNavigate]);

  const parseFile = useCallback((file: File) => {
    setError('');
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const mapped = mapColumns(results.data as Record<string, string>[]);
            processData(mapped, file.name);
          } catch (e: any) {
            setError(e.message);
          }
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
          const mapped = mapColumns(rows);
          processData(mapped, file.name);
        } catch (err: any) {
          setError(err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Formato não suportado. Use .csv ou .xlsx');
    }
  }, [processData]);

  const mapColumns = (rows: Record<string, any>[]): ClientData[] => {
    const findCol = (row: Record<string, any>, candidates: string[]): string | undefined => {
      return Object.keys(row).find(k => candidates.some(c => k.toLowerCase().includes(c)));
    };

    const sample = rows[0];
    if (!sample) throw new Error('Arquivo vazio');

    const nomeCol = findCol(sample, ['nome', 'name', 'cliente']);
    const idCol = findCol(sample, ['id', 'cpf', 'cnpj', 'codigo']);
    const recCol = findCol(sample, ['recencia', 'recência', 'recency', 'dias']);
    const freqCol = findCol(sample, ['frequencia', 'frequência', 'frequency', 'compras']);
    const valCol = findCol(sample, ['valor', 'value', 'monetario', 'monetário', 'ticket']);

    if (!recCol || !freqCol || !valCol) {
      throw new Error('Colunas obrigatórias não encontradas. Verifique se o arquivo contém: Recência, Frequência e Valor.');
    }

    return rows.map((r, i) => ({
      nome: r[nomeCol || ''] || `Cliente ${i + 1}`,
      id_cliente: String(r[idCol || ''] || i + 1),
      recencia: Number(r[recCol]) || 0,
      frequencia: Number(r[freqCol]) || 0,
      valor: Number(r[valCol]) || 0,
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleGenerate = () => {
    const data = generateRandomClients(clientCount);
    setGeneratedData(data);
  };

  const handleDownloadExcel = () => {
    if (!generatedData) return;
    const ws = XLSX.utils.json_to_sheet(generatedData.map(c => ({
      Nome: c.nome,
      ID_Cliente: c.id_cliente,
      Recencia: c.recencia,
      Frequencia: c.frequencia,
      Valor: c.valor,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `clientes_rfv_${clientCount}.xlsx`);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <Upload className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Upload Base de Dados</h1>
        <p className="mt-2 text-muted-foreground">Carregue sua base de clientes para a análise RFV</p>
      </div>

      <Card
        className={`mb-6 flex min-h-[200px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${
          dragging ? 'border-primary bg-accent' : 'hover:border-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.csv,.xlsx,.xls';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) parseFile(file);
          };
          input.click();
        }}
      >
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="mb-1 font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
        <p className="text-sm text-muted-foreground">Formatos aceitos: .csv, .xlsx</p>
      </Card>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="mb-6 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="mb-1 text-sm font-semibold">Formato da Planilha</p>
            <p className="text-xs text-muted-foreground">
              A planilha deve conter obrigatoriamente as seguintes colunas:
              <strong> Nome, ID do Cliente (CPF/CNPJ), Recência </strong>(dias desde a última compra),
              <strong> Frequência </strong>(quantidade de compras),
              <strong> Valor Monetário </strong>(valor total gasto).
            </p>
          </div>
        </div>
      </Card>

      {/* Random Data Generator */}
      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Gerar Dados Aleatórios para Análise</h2>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs text-muted-foreground">
            Quantidade de clientes: <span className="font-bold text-foreground">{clientCount}</span>
          </label>
          <Slider
            value={[clientCount]}
            onValueChange={(v) => setClientCount(v[0])}
            min={50}
            max={200}
            step={10}
            className="my-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50</span>
            <span>200</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleGenerate}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Dados
          </Button>

          {generatedData && (
            <>
              <Button variant="outline" onClick={handleDownloadExcel}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Excel
              </Button>
              <Button onClick={() => saveAndNavigate(generatedData, `Dados aleatórios (${generatedData.length} clientes)`)}>
                Usar para Análise →
              </Button>
            </>
          )}
        </div>

        {generatedData && (
          <p className="mt-3 text-xs text-muted-foreground">
            ✅ {generatedData.length} clientes gerados com sucesso. Baixe o Excel ou use direto na análise.
          </p>
        )}
      </Card>

      {/* Upload History */}
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
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.file_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{h.client_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(h.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadFromHistory(h.id)}>
                          <Eye className="mr-1 h-3 w-3" /> Carregar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteUpload(h.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
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

export default RFVUpload;
