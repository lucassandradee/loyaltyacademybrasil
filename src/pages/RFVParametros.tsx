import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Clock, ShoppingCart, DollarSign, Plus, Minus } from 'lucide-react';
import { ClientData, RFVPercentileParams, defaultPercentileParams, computeRealCutoffs } from '@/lib/rfv-logic';
import { supabase } from '@/integrations/supabase/client';

const RFVParametros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = (location.state as { clientData: ClientData[] })?.clientData;
  const [clientData, setClientData] = useState<ClientData[] | null>(stateData || null);
  const [params, setParams] = useState<RFVPercentileParams>(defaultPercentileParams(3));
  const [loading, setLoading] = useState(!stateData);

  useEffect(() => {
    if (stateData) return;
    const fetchFromDB = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/rfv'); return; }
      const { data } = await supabase
        .from('rfv_uploads')
        .select('client_data')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.client_data) {
        setClientData(data.client_data as unknown as ClientData[]);
      } else {
        navigate('/rfv');
      }
      setLoading(false);
    };
    fetchFromDB();
  }, [stateData, navigate]);

  const changeNumScores = (delta: number) => {
    const next = Math.max(2, Math.min(10, params.numScores + delta));
    setParams(defaultPercentileParams(next));
  };

  const updatePercentile = (dimension: 'recencia' | 'frequencia' | 'valor', index: number, value: number) => {
    setParams(prev => {
      const arr = [...prev[dimension]];
      arr[index] = Math.max(0, Math.min(100, value));
      return { ...prev, [dimension]: arr };
    });
  };

  // Compute real cutoff values for display
  const realCutoffs = useMemo(() => {
    if (!clientData) return null;
    return {
      recencia: computeRealCutoffs(clientData.map(c => c.recencia), params.recencia),
      frequencia: computeRealCutoffs(clientData.map(c => c.frequencia), params.frequencia),
      valor: computeRealCutoffs(clientData.map(c => c.valor), params.valor),
    };
  }, [clientData, params]);

  const handleSubmit = () => {
    navigate('/rfv/dashboard', { state: { clientData, params } });
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  if (!clientData) return null;

  const dimensions: { key: 'recencia' | 'frequencia' | 'valor'; label: string; icon: typeof Clock; unit: string; inverted: boolean; prefix?: string }[] = [
    { key: 'recencia', label: 'Recência (Dias)', icon: Clock, unit: 'dias', inverted: true },
    { key: 'frequencia', label: 'Frequência (Compras)', icon: ShoppingCart, unit: 'vezes', inverted: false },
    { key: 'valor', label: 'Valor Monetário', icon: DollarSign, unit: '', inverted: false, prefix: 'R$' },
  ];

  const formatValue = (val: number, prefix?: string, unit?: string) => {
    const formatted = prefix === 'R$'
      ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `${val.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
    return formatted;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Parametrização RFV por Percentil</h1>
        <p className="mt-2 text-muted-foreground">
          Defina quantos níveis de score e os percentis de corte para cada variável.
          <br />
          <span className="text-xs">O sistema distribui os clientes automaticamente com base nos dados reais da sua base.</span>
        </p>
      </div>

      {/* Score count selector */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center gap-4 p-6">
          <span className="text-sm font-medium text-foreground">Quantidade de Scores:</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeNumScores(-1)} disabled={params.numScores <= 2}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-2xl font-bold text-primary min-w-[2rem] text-center">{params.numScores}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeNumScores(1)} disabled={params.numScores >= 10}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Dimension cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {dimensions.map(dim => {
          const cutoffs = realCutoffs?.[dim.key] || [];
          const percentiles = params[dim.key];

          return (
            <Card key={dim.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <dim.icon className="h-5 w-5 text-primary" />
                  {dim.label}
                </CardTitle>
                {dim.inverted && (
                  <p className="text-xs text-muted-foreground">↓ Menor = melhor score</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: params.numScores }, (_, scoreIdx) => {
                  const scoreNum = dim.inverted
                    ? params.numScores - scoreIdx
                    : scoreIdx + 1;
                  const scoreLabel = `Score ${scoreNum}`;

                  // Determine range boundaries
                  const fromPct = scoreIdx === 0 ? 0 : percentiles[scoreIdx - 1];
                  const toPct = scoreIdx === params.numScores - 1 ? 100 : percentiles[scoreIdx];

                  // Real value range
                  let fromVal: string | null = null;
                  let toVal: string | null = null;
                  if (cutoffs.length > 0) {
                    if (scoreIdx === 0) {
                      toVal = cutoffs[0] !== undefined ? formatValue(cutoffs[0], dim.prefix, dim.unit) : null;
                    } else if (scoreIdx === params.numScores - 1) {
                      fromVal = cutoffs[scoreIdx - 1] !== undefined ? formatValue(cutoffs[scoreIdx - 1], dim.prefix, dim.unit) : null;
                    } else {
                      fromVal = cutoffs[scoreIdx - 1] !== undefined ? formatValue(cutoffs[scoreIdx - 1], dim.prefix, dim.unit) : null;
                      toVal = cutoffs[scoreIdx] !== undefined ? formatValue(cutoffs[scoreIdx], dim.prefix, dim.unit) : null;
                    }
                  }

                  return (
                    <div key={scoreIdx} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{scoreLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {fromPct.toFixed(1)}% — {toPct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Percentile input (only for non-last scores) */}
                      {scoreIdx < params.numScores - 1 && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Corte em:</span>
                          <Input
                            type="number"
                            value={percentiles[scoreIdx]}
                            onChange={e => updatePercentile(dim.key, scoreIdx, Number(e.target.value))}
                            className="h-8 w-20 text-center"
                            step={0.1}
                            min={0}
                            max={100}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      )}

                      {/* Real value display */}
                      <div className="text-xs text-muted-foreground">
                        {scoreIdx === 0 && toVal && (
                          <span>Até {toVal}</span>
                        )}
                        {scoreIdx > 0 && scoreIdx < params.numScores - 1 && fromVal && toVal && (
                          <span>{fromVal} — {toVal}</span>
                        )}
                        {scoreIdx === params.numScores - 1 && fromVal && (
                          <span>Acima de {fromVal}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/rfv')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button size="lg" onClick={handleSubmit}>
          Gerar Análise Completa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default RFVParametros;
