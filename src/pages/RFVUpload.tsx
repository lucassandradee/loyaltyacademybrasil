import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, Database } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ClientData, demoData } from '@/lib/rfv-logic';

const RFVUpload = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const processData = useCallback((data: ClientData[]) => {
    if (data.length === 0) {
      setError('Nenhum dado válido encontrado no arquivo.');
      return;
    }
    localStorage.setItem('rfv_data_uploaded', 'true');
    navigate('/rfv/parametros', { state: { clientData: data } });
  }, [navigate]);

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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Database className="mx-auto mb-4 h-12 w-12 text-primary" />
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

        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => processData(demoData)}
          >
            <Database className="mr-2 h-4 w-4" />
            Usar Dados de Demonstração
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RFVUpload;
