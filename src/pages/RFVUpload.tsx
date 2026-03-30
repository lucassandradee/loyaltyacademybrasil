import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Upload, FileSpreadsheet, AlertCircle, Sparkles, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ClientData } from '@/lib/rfv-logic';
import { generateRandomClients } from '@/lib/rfv-random';
import { supabase } from '@/integrations/supabase/client';

const RFVUpload = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [clientCount, setClientCount] = useState(100);
  const [generatedData, setGeneratedData] = useState<ClientData[] | null>(null);

  const saveAndNavigate = useCallback(async (data: ClientData[]) => {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      await supabase.from('rfv_uploads').upsert(
        { user_id: session.session.user.id, client_data: data as any },
        { onConflict: 'user_id' }
      );
    }
    localStorage.setItem('rfv_data_uploaded', 'true');
    navigate('/rfv/parametros', { state: { clientData: data } });
  }, [navigate]);

  const processData = useCallback((data: ClientData[]) => {
    if (data.length === 0) {
      setError('Nenhum dado válido encontrado no arquivo.');
      return;
    }
    saveAndNavigate(data);
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
            processData(mapped);
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
          processData(mapped);
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Upload className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Upload de Dados</h1>
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
                <strong> Valor Monetário </strong>(ticket médio).
              </p>
            </div>
          </div>
        </Card>

        {/* Random Data Generator */}
        <Card className="p-6">
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
                <Button onClick={() => saveAndNavigate(generatedData)}>
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
      </div>
    </div>
  );
};

export default RFVUpload;
