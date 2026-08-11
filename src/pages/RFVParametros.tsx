import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Clock, ShoppingCart, DollarSign, Plus, Minus, Info } from 'lucide-react';
import { ClientData, RFVPercentileParams, RFVAbsoluteParams, defaultPercentileParams, defaultAbsoluteParams, computeRealCutoffs } from '@/lib/rfv-logic';
import { supabase } from '@/integrations/supabase/client';
import * as SliderPrimitive from '@radix-ui/react-slider';

const SCORE_COLORS = [
  'hsl(var(--chart-hibernating))',
  'hsl(var(--chart-at-risk))',
  'hsl(var(--chart-potential))',
  'hsl(var(--chart-loyal))',
  'hsl(var(--chart-champion))',
  'hsl(270, 50%, 55%)',
  'hsl(170, 60%, 45%)',
  'hsl(30, 90%, 55%)',
  'hsl(340, 60%, 50%)',
  'hsl(190, 70%, 45%)',
];

function getScoreColor(scoreIdx: number, total: number): string {
  if (total <= 5) {
    // Map to first N colors
    return SCORE_COLORS[scoreIdx] || SCORE_COLORS[0];
  }
  return SCORE_COLORS[scoreIdx % SCORE_COLORS.length];
}

interface DimensionSliderProps {
  label: string;
  icon: React.ElementType;
  dimKey: 'recencia' | 'frequencia' | 'valor';
  inverted: boolean;
  prefix?: string;
  unit: string;
  percentiles: number[];
  numScores: number;
  clientData: ClientData[];
  onPercentilesChange: (dimKey: 'recencia' | 'frequencia' | 'valor', values: number[]) => void;
}

const DimensionSliderCard = ({
  label, icon: Icon, dimKey, inverted, prefix, unit,
  percentiles, numScores, clientData, onPercentilesChange
}: DimensionSliderProps) => {
  const values = useMemo(() => clientData.map(c => c[dimKey]), [clientData, dimKey]);
  const cutoffs = useMemo(() => computeRealCutoffs(values, percentiles), [values, percentiles]);
  const totalClients = clientData.length;

  const formatValue = (val: number) => {
    if (prefix === 'R$') return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `${val.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
  };

  const handleSliderChange = (newValues: number[]) => {
    const nextValues = inverted
      ? newValues.map((value) => 100 - value).reverse()
      : newValues;

    onPercentilesChange(dimKey, nextValues.map((value) => Math.round(value * 10) / 10));
  };

  const displayPercentiles = useMemo(
    () => (inverted ? [...percentiles].map((value) => 100 - value).reverse() : percentiles),
    [inverted, percentiles]
  );

  const segments = Array.from({ length: numScores }, (_, index) => {
    const scoreNum = index + 1;
    const displayFromPct = index === 0 ? 0 : displayPercentiles[index - 1];
    const displayToPct = index === numScores - 1 ? 100 : displayPercentiles[index];
    const pctRange = displayToPct - displayFromPct;
    const estimatedClients = Math.round((pctRange / 100) * totalClients);

    const dataIndex = inverted ? numScores - index - 1 : index;

    let rangeText = '';
    if (dataIndex === 0) {
      rangeText = `Até ${formatValue(cutoffs[0])}`;
    } else if (dataIndex === numScores - 1) {
      rangeText = `Acima de ${formatValue(cutoffs[dataIndex - 1])}`;
    } else {
      rangeText = `${formatValue(cutoffs[dataIndex - 1])} — ${formatValue(cutoffs[dataIndex])}`;
    }

    return { scoreNum, displayFromPct, displayToPct, pctRange, estimatedClients, rangeText };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {label}
          {inverted && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">↓ Menor = melhor score</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Arraste os pontos para ajustar os percentis de corte:</p>

            <div className="relative flex h-8 overflow-hidden rounded-full">
              {segments.map((seg) => (
                <div
                  key={seg.scoreNum}
                  className="flex h-full items-center justify-center text-[10px] font-bold text-white transition-all"
                  style={{
                    width: `${seg.pctRange}%`,
                    backgroundColor: getScoreColor(seg.scoreNum - 1, numScores),
                    minWidth: seg.pctRange > 5 ? undefined : '4px',
                  }}
                >
                  {seg.pctRange > 12 && `S${seg.scoreNum}`}
                </div>
              ))}
            </div>

            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 overflow-hidden rounded-full">
                {segments.map((seg) => (
                  <div
                    key={seg.scoreNum}
                    className="h-full transition-all"
                    style={{
                      width: `${seg.pctRange}%`,
                      backgroundColor: getScoreColor(seg.scoreNum - 1, numScores),
                      opacity: 0.35,
                    }}
                  />
                ))}
              </div>
              <SliderPrimitive.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                value={displayPercentiles}
                onValueChange={handleSliderChange}
                min={0}
                max={100}
                step={0.5}
                minStepsBetweenThumbs={2}
              >
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-transparent">
                  <SliderPrimitive.Range className="absolute h-full bg-transparent" />
                </SliderPrimitive.Track>
                {displayPercentiles.map((_, index) => {
                  const thumbColor = getScoreColor(index + 1, numScores);

                  return (
                    <SliderPrimitive.Thumb
                      key={index}
                      className="block h-5 w-5 cursor-grab rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing"
                      style={{ borderColor: thumbColor }}
                    />
                  );
                })}
              </SliderPrimitive.Root>
            </div>

            <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
              <span>0%</span>
              {displayPercentiles.map((value, index) => (
                <span key={index} className="font-medium text-foreground">{value.toFixed(1)}%</span>
              ))}
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mb-3 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Distribuição dos scores na sua base:</span>
            </div>
            {segments.map((seg) => (
              <div
                key={seg.scoreNum}
                className="flex items-center gap-3 rounded-md border p-2.5"
              >
                <div
                  className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: getScoreColor(seg.scoreNum - 1, numScores) }}
                >
                  {seg.scoreNum}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Score {seg.scoreNum}
                      {seg.scoreNum === numScores && <span className="ml-1 text-xs text-muted-foreground">(Top)</span>}
                      {seg.scoreNum === 1 && <span className="ml-1 text-xs text-muted-foreground">(Base)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {seg.displayFromPct.toFixed(1)}% — {seg.displayToPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {seg.rangeText && <span>{seg.rangeText}</span>}
                    <span className="ml-2">• ~{seg.estimatedClients} clientes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ThresholdCardProps {
  label: string;
  icon: React.ElementType;
  dimKey: 'recencia' | 'frequencia' | 'valor';
  inverted: boolean;
  prefix?: string;
  unit: string;
  cutoffs: number[];
  numScores: number;
  clientData: ClientData[];
  onCutoffsChange: (dimKey: 'recencia' | 'frequencia' | 'valor', values: number[]) => void;
}

const DimensionThresholdCard = ({
  label, icon: Icon, dimKey, inverted, prefix, unit,
  cutoffs, numScores, clientData, onCutoffsChange,
}: ThresholdCardProps) => {
  const values = useMemo(() => clientData.map(c => c[dimKey]), [clientData, dimKey]);

  const formatValue = (val: number) => {
    if (prefix === 'R$') return `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
    return `${val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
  };

  const isAscending = cutoffs.every((c, i) => i === 0 || c > cutoffs[i - 1]);

  const handleChange = (index: number, raw: string) => {
    const next = [...cutoffs];
    next[index] = raw === '' ? NaN : Number(raw.replace(',', '.'));
    onCutoffsChange(dimKey, next);
  };

  // Segments listed from Score 1 (base) to Score N (top)
  const segments = Array.from({ length: numScores }, (_, index) => {
    const scoreNum = index + 1;
    let rangeText: string;
    let count: number;

    if (inverted) {
      // Score N = lowest values. cutoffs ascending: value <= cutoffs[0] -> score N
      const dataIdx = numScores - scoreNum; // 0 for top score
      const upper = dataIdx < cutoffs.length ? cutoffs[dataIdx] : Infinity;
      const lower = dataIdx > 0 ? cutoffs[dataIdx - 1] : -Infinity;
      rangeText = upper === Infinity
        ? `Acima de ${formatValue(lower)}`
        : lower === -Infinity
          ? `Até ${formatValue(upper)}`
          : `${formatValue(lower)} — ${formatValue(upper)}`;
      count = values.filter(v => v > lower && v <= upper).length;
    } else {
      const lower = index > 0 ? cutoffs[index - 1] : -Infinity;
      const upper = index < cutoffs.length ? cutoffs[index] : Infinity;
      rangeText = upper === Infinity
        ? `Acima de ${formatValue(lower)}`
        : lower === -Infinity
          ? `Até ${formatValue(upper)}`
          : `${formatValue(lower)} — ${formatValue(upper)}`;
      count = values.filter(v => v > lower && v <= upper).length;
    }

    return { scoreNum, rangeText, count };
  }).reverse(); // show top score first

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {label}
          {inverted && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">↓ Menor = melhor score</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Defina os valores de corte (em ordem crescente):
            </p>
            {cutoffs.map((cut, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">Corte {index + 1}</span>
                <div className="relative flex-1">
                  {prefix && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {prefix}
                    </span>
                  )}
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={Number.isNaN(cut) ? '' : cut}
                    onChange={(e) => handleChange(index, e.target.value)}
                    className={prefix ? 'pl-9' : undefined}
                  />
                </div>
                {unit && <span className="w-12 shrink-0 text-xs text-muted-foreground">{unit}</span>}
              </div>
            ))}
            {!isAscending && (
              <p className="text-xs font-medium text-destructive">
                Os cortes precisam ser números em ordem crescente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="mb-3 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Faixas resultantes na sua base:</span>
            </div>
            {segments.map((seg) => (
              <div key={seg.scoreNum} className="flex items-center gap-3 rounded-md border p-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: getScoreColor(seg.scoreNum - 1, numScores) }}
                >
                  {seg.scoreNum}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Score {seg.scoreNum}
                      {seg.scoreNum === numScores && <span className="ml-1 text-xs text-muted-foreground">(Top)</span>}
                      {seg.scoreNum === 1 && <span className="ml-1 text-xs text-muted-foreground">(Base)</span>}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {seg.rangeText}
                    <span className="ml-2">• {seg.count} clientes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


const RFVParametros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = (location.state as { clientData: ClientData[] })?.clientData;
  const [clientData, setClientData] = useState<ClientData[] | null>(stateData || null);
  const [params, setParams] = useState<RFVPercentileParams>(defaultPercentileParams(3));
  const [mode, setMode] = useState<'percentile' | 'absolute'>('percentile');
  const [absParams, setAbsParams] = useState<RFVAbsoluteParams | null>(null);
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

  // Initialize / resync absolute cutoffs when data loads or score count changes
  useEffect(() => {
    if (!clientData) return;
    setAbsParams(prev => {
      if (prev && prev.numScores === params.numScores) return prev;
      return defaultAbsoluteParams(clientData, params.numScores);
    });
  }, [clientData, params.numScores]);

  const changeNumScores = (delta: number) => {
    const next = Math.max(2, Math.min(10, params.numScores + delta));
    setParams(defaultPercentileParams(next));
    if (clientData) setAbsParams(defaultAbsoluteParams(clientData, next));
  };

  const handlePercentilesChange = (dimKey: 'recencia' | 'frequencia' | 'valor', values: number[]) => {
    setParams(prev => ({ ...prev, [dimKey]: values }));
  };

  const handleCutoffsChange = (dimKey: 'recencia' | 'frequencia' | 'valor', values: number[]) => {
    setAbsParams(prev => (prev ? { ...prev, [dimKey]: values } : prev));
  };

  const absValid = !!absParams && (['recencia', 'frequencia', 'valor'] as const).every(k => {
    const arr = absParams[k];
    return arr.every(v => Number.isFinite(v)) && arr.every((v, i) => i === 0 || v > arr[i - 1]);
  });

  const handleSubmit = () => {
    const chosen = mode === 'absolute' && absParams ? absParams : params;
    navigate('/rfv/dashboard', { state: { clientData, params: chosen } });
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Parametrização RFV</h1>
        <p className="mt-2 text-muted-foreground">
          {mode === 'percentile'
            ? 'Defina quantos níveis de score e ajuste os percentis arrastando os pontos de corte.'
            : 'Defina quantos níveis de score e informe os valores de corte fixos para cada dimensão.'}
          <br />
          <span className="text-xs">
            {mode === 'percentile'
              ? 'O sistema distribui os clientes automaticamente com base nos dados reais da sua base.'
              : 'Os clientes são pontuados exatamente pelos limites que você definir.'}
          </span>
        </p>
      </div>

      {/* Mode selector */}
      <div className="mb-6 flex justify-center">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'percentile' | 'absolute')}>
          <TabsList>
            <TabsTrigger value="percentile">Por percentil</TabsTrigger>
            <TabsTrigger value="absolute">Valores fixos</TabsTrigger>
          </TabsList>
        </Tabs>
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

      {/* Dimension cards — vertical */}
      <div className="space-y-6">
        {dimensions.map(dim => (
          mode === 'percentile' ? (
            <DimensionSliderCard
              key={dim.key}
              label={dim.label}
              icon={dim.icon}
              dimKey={dim.key}
              inverted={dim.inverted}
              prefix={dim.prefix}
              unit={dim.unit}
              percentiles={params[dim.key]}
              numScores={params.numScores}
              clientData={clientData}
              onPercentilesChange={handlePercentilesChange}
            />
          ) : absParams ? (
            <DimensionThresholdCard
              key={dim.key}
              label={dim.label}
              icon={dim.icon}
              dimKey={dim.key}
              inverted={dim.inverted}
              prefix={dim.prefix}
              unit={dim.unit}
              cutoffs={absParams[dim.key]}
              numScores={absParams.numScores}
              clientData={clientData}
              onCutoffsChange={handleCutoffsChange}
            />
          ) : null
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/rfv')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={mode === 'absolute' && !absValid}>
          Gerar Análise Completa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

    </div>
  );
};

export default RFVParametros;
