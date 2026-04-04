import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Clock, ShoppingCart, DollarSign, Plus, Minus, Info } from 'lucide-react';
import { ClientData, RFVPercentileParams, defaultPercentileParams, computeRealCutoffs } from '@/lib/rfv-logic';
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
    onPercentilesChange(dimKey, newValues);
  };

  // Build score segments info
  const segments = Array.from({ length: numScores }, (_, i) => {
    // For inverted (recency): low percentile = low value = BEST = highest score
    const scoreNum = inverted ? numScores - i : i + 1;
    const fromPct = i === 0 ? 0 : percentiles[i - 1];
    const toPct = i === numScores - 1 ? 100 : percentiles[i];
    const pctRange = toPct - fromPct;
    const estimatedClients = Math.round((pctRange / 100) * totalClients);

    let rangeText = '';
    if (i === 0) {
      rangeText = `Até ${formatValue(cutoffs[0])}`;
    } else if (i === numScores - 1) {
      rangeText = `Acima de ${formatValue(cutoffs[i - 1])}`;
    } else {
      rangeText = `${formatValue(cutoffs[i - 1])} — ${formatValue(cutoffs[i])}`;
    }

    return { scoreNum, fromPct, toPct, pctRange, estimatedClients, rangeText };
  });

  // Sort by scoreNum for the right panel display (always 1, 2, 3 order)
  const displaySegments = [...segments].sort((a, b) => a.scoreNum - b.scoreNum);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {label}
          {inverted && (
            <span className="text-xs font-normal text-muted-foreground ml-2">↓ Menor = melhor score</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Visual slider */}
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Arraste os pontos para ajustar os percentis de corte:</p>
            
            {/* Colored segments bar */}
            <div className="relative h-8 rounded-full overflow-hidden flex">
              {barSegments.map((seg, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
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

            {/* Radix multi-thumb slider */}
            <SliderPrimitive.Root
              className="relative flex w-full touch-none select-none items-center h-5"
              value={percentiles}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={0.5}
              minStepsBetweenThumbs={2}
            >
              <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
                <SliderPrimitive.Range className="absolute h-full bg-primary/30" />
              </SliderPrimitive.Track>
              {percentiles.map((_, i) => (
                <SliderPrimitive.Thumb
                  key={i}
                  className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
                />
              ))}
            </SliderPrimitive.Root>

            {/* Percentile labels */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>0%</span>
              {percentiles.map((p, i) => (
                <span key={i} className="font-medium text-foreground">{p.toFixed(1)}%</span>
              ))}
              <span>100%</span>
            </div>
          </div>

          {/* Right: Score summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 mb-3">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Distribuição dos scores na sua base:</span>
            </div>
            {segments.map((seg) => (
              <div
                key={seg.scoreNum}
                className="flex items-center gap-3 rounded-md border p-2.5"
              >
                <div
                  className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: getScoreColor(seg.scoreNum - 1, numScores) }}
                >
                  {seg.scoreNum}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Score {seg.scoreNum}
                      {seg.scoreNum === numScores && <span className="text-xs text-muted-foreground ml-1">(Top)</span>}
                      {seg.scoreNum === 1 && <span className="text-xs text-muted-foreground ml-1">(Base)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {seg.fromPct.toFixed(1)}% — {seg.toPct.toFixed(1)}%
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

  const handlePercentilesChange = (dimKey: 'recencia' | 'frequencia' | 'valor', values: number[]) => {
    setParams(prev => ({ ...prev, [dimKey]: values }));
  };

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Parametrização RFV por Percentil</h1>
        <p className="mt-2 text-muted-foreground">
          Defina quantos níveis de score e ajuste os percentis arrastando os pontos de corte.
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

      {/* Dimension cards — vertical */}
      <div className="space-y-6">
        {dimensions.map(dim => (
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
        ))}
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
