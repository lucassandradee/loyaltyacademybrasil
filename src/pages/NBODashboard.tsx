import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, DollarSign, Clock, ShoppingCart, Search, X, Info, HelpCircle, Download } from 'lucide-react';
import { classifyNBO, allFaixaNames, faixaColors, faixaActions, generateOfferExplanation } from '@/lib/nbo-logic';
import { clusterColors, allClusterNames } from '@/lib/rfv-logic';
import { supabase } from '@/integrations/supabase/client';
import type { ClientData } from '@/lib/rfv-logic';
import type { ScoredNBOClient } from '@/lib/nbo-logic';
import { downloadCSV } from '@/lib/export-utils';

const NBODashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedFaixa, setSelectedFaixa] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedOferta, setSelectedOferta] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    const fetch = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { navigate('/rfv'); return; }
      const { data } = await supabase.from('rfv_uploads').select('client_data')
        .eq('user_id', session.session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data?.client_data) setClientData(data.client_data as unknown as ClientData[]);
      else navigate('/rfv');
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const scored = useMemo(() => clientData ? classifyNBO(clientData) : [], [clientData]);

  const totalClients = scored.length;
  const avgGasto = totalClients > 0 ? scored.reduce((s, c) => s + c.gasto_total, 0) / totalClients : 0;
  const avgRecencia = totalClients > 0 ? scored.reduce((s, c) => s + c.recencia, 0) / totalClients : 0;
  const avgFreq = totalClients > 0 ? scored.reduce((s, c) => s + c.frequencia, 0) / totalClients : 0;

  const faixaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFaixaNames.forEach(n => counts[n] = 0);
    scored.forEach(c => { counts[c.faixa] = (counts[c.faixa] || 0) + 1; });
    return allFaixaNames.map(name => ({
      name, count: counts[name],
      pct: totalClients > 0 ? ((counts[name] / totalClients) * 100).toFixed(1) : '0',
      color: faixaColors[name],
    }));
  }, [scored, totalClients]);

  const faixaClusterComposition = useMemo(() => {
    const comp: Record<string, Record<string, number>> = {};
    allFaixaNames.forEach(f => { comp[f] = {}; });
    scored.forEach(c => {
      if (!comp[c.faixa][c.cluster]) comp[c.faixa][c.cluster] = 0;
      comp[c.faixa][c.cluster]++;
    });
    return comp;
  }, [scored]);

  const toggleFaixa = (name: string) => { setSelectedFaixa(prev => prev === name ? null : name); setPage(0); };
  const toggleCluster = (name: string) => { setSelectedCluster(prev => prev === name ? null : name); setPage(0); };
  const toggleOferta = (name: string) => { setSelectedOferta(prev => prev === name ? null : name); setPage(0); };

  const filtered = useMemo(() => {
    let list = scored;
    if (selectedFaixa) list = list.filter(c => c.faixa === selectedFaixa);
    if (selectedCluster) list = list.filter(c => c.cluster === selectedCluster);
    if (selectedOferta) list = list.filter(c => c.oferta_curta === selectedOferta);
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.nome.toLowerCase().includes(q) || c.id_cliente.includes(q)); }
    return list;
  }, [scored, search, selectedFaixa, selectedCluster]);

  // Offer distribution
  const offerDistribution = useMemo(() => {
    const map = new Map<string, ScoredNBOClient[]>();
    scored.forEach(c => {
      const key = c.oferta_curta;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries())
      .map(([oferta, clients]) => ({ oferta, count: clients.length, pct: totalClients > 0 ? ((clients.length / totalClients) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.count - a.count);
  }, [scored, totalClients]);

  const pageCount = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;
  if (!clientData) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Análise Next Best Offer</h1>
        <p className="text-muted-foreground">Segmentação ponderada por scores RFV (mesma base do Passo 1)</p>
      </div>

      {/* Explanatory Card */}
      <Card className="mb-8 border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold text-foreground">Como funciona: Scoring Ponderado → Pirâmide NBO</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            O NBO reutiliza a base de clientes do <strong>Passo 1 (RFV)</strong> e calcula uma pontuação ponderada para cada cliente:
          </p>
          <div className="mb-3 rounded-lg border bg-background p-3">
            <p className="text-sm font-mono text-foreground text-center">
              <strong>Pontuação NBO</strong> = Valor × <span className="text-primary font-bold">3</span> + Frequência × <span className="text-primary font-bold">2</span> + Recência × <span className="text-primary font-bold">1</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Os clientes são rankeados por essa pontuação e distribuídos na pirâmide: <strong>10% Diamante</strong> (topo), <strong>20% Ouro</strong>, <strong>30% Prata</strong> e <strong>40% Bronze</strong> (base). Ofertas inteligentes são geradas com base na faixa + perfil individual de cada cliente.
          </p>
        </CardContent>
      </Card>

      {/* Active filters */}
      {(selectedFaixa || selectedCluster || selectedOferta) && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {selectedFaixa && (
            <Badge className="cursor-pointer gap-1 text-sm" style={{ backgroundColor: faixaColors[selectedFaixa], color: '#fff' }} onClick={() => setSelectedFaixa(null)}>
              {selectedFaixa} <X className="h-3 w-3" />
            </Badge>
          )}
          {selectedCluster && (
            <Badge className="cursor-pointer gap-1 text-sm" style={{ backgroundColor: clusterColors[selectedCluster], color: '#fff' }} onClick={() => setSelectedCluster(null)}>
              {selectedCluster} <X className="h-3 w-3" />
            </Badge>
          )}
          {selectedOferta && (
            <Badge className="cursor-pointer gap-1 text-sm bg-primary text-primary-foreground" onClick={() => setSelectedOferta(null)}>
              {selectedOferta} <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}

      {/* KPIs — 4 columns */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Total de Clientes', value: totalClients.toLocaleString('pt-BR') },
          { icon: DollarSign, label: 'Valor por cliente', value: `R$ ${avgGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { icon: Clock, label: 'Recência Média', value: `${avgRecencia.toFixed(0)} dias` },
          { icon: ShoppingCart, label: 'Frequência Média', value: avgFreq.toFixed(1) + ' compras' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-accent p-3"><kpi.icon className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pyramid + RFV Composition */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Pirâmide NBO — Distribuição e Composição RFV</CardTitle>
          <p className="text-xs text-muted-foreground">Clique em um nível da pirâmide ou em um segmento RFV para filtrar</p>
        </CardHeader>
        <CardContent>
          <PyramidChart
            faixaCounts={faixaCounts}
            faixaClusterComposition={faixaClusterComposition}
            selectedFaixa={selectedFaixa}
            selectedCluster={selectedCluster}
            onToggleFaixa={toggleFaixa}
            onToggleCluster={toggleCluster}
            totalClients={totalClients}
          />
        </CardContent>
      </Card>

      {/* Faixa Cards — Diamante → Bronze */}
      <h2 className="mb-4 text-xl font-bold text-foreground">Faixas NBO</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {faixaCounts.map((faixa) => (
          <Card key={faixa.name}
            className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${selectedFaixa === faixa.name ? 'ring-2 ring-offset-2' : ''} ${selectedFaixa && selectedFaixa !== faixa.name ? 'opacity-50' : ''}`}
            onClick={() => toggleFaixa(faixa.name)}>
            <div className="h-1.5" style={{ backgroundColor: faixa.color }} />
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{faixa.name}</h3>
                <Badge variant="secondary" className="text-xs">{faixa.pct}%</Badge>
              </div>
              <p className="mb-3 text-2xl font-bold text-foreground">{faixa.count}</p>
              <p className="text-xs text-muted-foreground">{faixaActions[faixa.name]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Offer Distribution Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Ofertas</CardTitle>
          <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar os clientes abaixo</p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={offerDistribution} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }} onClick={(state: any) => { if (state?.activePayload?.[0]?.payload?.oferta) toggleOferta(state.activePayload[0].payload.oferta); }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="oferta" width={280} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`${value} clientes`, 'Quantidade']} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} className="cursor-pointer">
                  {offerDistribution.map((entry, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 25}, 60%, ${50 + (i % 3) * 10}%)`} opacity={!selectedOferta || selectedOferta === entry.oferta ? 1 : 0.3} className="cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Client Table */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Dados dos Clientes{(selectedFaixa || selectedCluster || selectedOferta) && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} de {totalClients})</span>}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                downloadCSV(filtered.map(c => ({
                  Nome: c.nome, ID: c.id_cliente, Recência: c.recencia, Frequência: c.frequencia,
                  'Valor Total': c.gasto_total, R: c.r_score, F: c.f_score, V: c.v_score,
                  'Score NBO': c.nbo_score, 'Cluster RFV': c.cluster, Faixa: c.faixa,
                  Oferta: c.oferta_curta, 'Descrição da Oferta': c.oferta, Motivo: generateOfferExplanation(c),
                })), 'nbo-clientes.csv');
              }}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-center">R</TableHead>
                <TableHead className="text-center">F</TableHead>
                <TableHead className="text-center">V</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Cluster RFV</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead>Oferta</TableHead>
                <TableHead>Descrição da Oferta</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-center">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((c) => (
                <TableRow key={c.id_cliente}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.id_cliente}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{c.r_score}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{c.f_score}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{c.v_score}</TableCell>
                  <TableCell className="text-center"><span className="font-mono text-xs">{c.nbo_score}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: clusterColors[c.cluster], color: clusterColors[c.cluster] }}>{c.cluster}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: faixaColors[c.faixa], color: faixaColors[c.faixa] }}>{c.faixa}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.oferta_curta}</TableCell>
                  <TableCell className="max-w-[250px] text-xs text-muted-foreground">{c.oferta}</TableCell>
                  <TableCell className="max-w-[220px] text-xs text-muted-foreground">{generateOfferExplanation(c)}</TableCell>
                  <TableCell className="text-center"><OfferExplainerPopover client={c} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page + 1} de {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Pyramid Chart ─── */

interface PyramidChartProps {
  faixaCounts: { name: string; count: number; pct: string; color: string }[];
  faixaClusterComposition: Record<string, Record<string, number>>;
  selectedFaixa: string | null;
  selectedCluster: string | null;
  onToggleFaixa: (name: string) => void;
  onToggleCluster: (name: string) => void;
  totalClients: number;
}

function PyramidChart({ faixaCounts, faixaClusterComposition, selectedFaixa, selectedCluster, onToggleFaixa, onToggleCluster, totalClients }: PyramidChartProps) {
  const tiers = faixaCounts;
  const pyramidW = 630;
  const pyramidH = 360;
  const innerBaseW = 550;
  const innerTopW = 0;
  const topPadding = 10;
  const bottomPadding = 10;
  const gap = 4;
  const tierH = (pyramidH - topPadding - bottomPadding - gap * (tiers.length - 1)) / tiers.length;

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      {/* SVG Pyramid */}
      <div className="shrink-0" style={{ width: pyramidW, minWidth: pyramidW }}>
        <svg width={pyramidW} height={pyramidH} viewBox={`0 0 ${pyramidW} ${pyramidH}`}>
          {tiers.map((tier, i) => {
            const y = topPadding + i * (tierH + gap);
            const progressTop = i / tiers.length;
            const progressBottom = (i + 1) / tiers.length;
            const topW = innerTopW + (innerBaseW - innerTopW) * progressTop;
            const botW = innerTopW + (innerBaseW - innerTopW) * progressBottom;
            const topX = (pyramidW - topW) / 2;
            const botX = (pyramidW - botW) / 2;
            const isActive = !selectedFaixa || selectedFaixa === tier.name;

            return (
              <g key={tier.name} onClick={() => onToggleFaixa(tier.name)} className="cursor-pointer">
                <polygon
                  points={`${topX},${y} ${topX + topW},${y} ${botX + botW},${y + tierH} ${botX},${y + tierH}`}
                  fill={tier.color}
                  opacity={isActive ? 1 : 0.3}
                  stroke="white"
                  strokeWidth={1}
                />
                <text
                  x={pyramidW / 2}
                  y={y + tierH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white text-xs font-bold pointer-events-none"
                  style={{ fontSize: '13px' }}
                >
                  {tier.name}
                </text>
                <text
                  x={pyramidW / 2}
                  y={y + tierH / 2 + 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/80 pointer-events-none"
                  style={{ fontSize: '11px' }}
                >
                  {tier.count} ({tier.pct}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* RFV Composition bars */}
      <div className="flex-1 flex flex-col justify-between" style={{ height: pyramidH }}>
        {tiers.map((tier) => {
          const composition = faixaClusterComposition[tier.name] || {};
          const tierTotal = tier.count || 1;
          const isActive = !selectedFaixa || selectedFaixa === tier.name;
          const clusters = Object.entries(composition)
            .sort((a, b) => b[1] - a[1])
            .filter(([, count]) => count > 0);

          return (
            <div
              key={tier.name}
              className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}
              style={{ height: tierH }}
            >
              <p className="text-xs font-semibold text-foreground mb-1">{tier.name}</p>
              <div className="flex h-5 w-full overflow-hidden rounded-sm">
                {clusters.map(([cluster, count]) => {
                  const pct = (count / tierTotal) * 100;
                  const isClusterActive = !selectedCluster || selectedCluster === cluster;
                  return (
                    <div
                      key={cluster}
                      className={`h-full cursor-pointer hover:brightness-110 transition-all ${!isClusterActive ? 'opacity-30' : ''}`}
                      style={{ width: `${pct}%`, backgroundColor: clusterColors[cluster] || 'hsl(var(--muted))' }}
                      title={`${cluster}: ${count} (${pct.toFixed(1)}%)`}
                      onClick={() => onToggleCluster(cluster)}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {clusters.slice(0, 3).map(([cluster, count]) => (
                  <span key={cluster} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: clusterColors[cluster] || 'hsl(var(--muted))' }} />
                    {cluster} ({((count / tierTotal) * 100).toFixed(0)}%)
                  </span>
                ))}
                {clusters.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{clusters.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Offer Explainer Popover ─── */

function OfferExplainerPopover({ client }: { client: ScoredNBOClient }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-bold text-foreground">{client.nome}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs" style={{ borderColor: faixaColors[client.faixa], color: faixaColors[client.faixa] }}>{client.faixa}</Badge>
              <Badge variant="outline" className="text-xs" style={{ borderColor: clusterColors[client.cluster], color: clusterColors[client.cluster] }}>{client.cluster}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded bg-muted p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Recência</p>
              <p className="text-sm font-bold">{client.r_score}</p>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Frequência</p>
              <p className="text-sm font-bold">{client.f_score}</p>
            </div>
            <div className="rounded bg-muted p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Valor</p>
              <p className="text-sm font-bold">{client.v_score}</p>
            </div>
          </div>
          <div className="rounded bg-muted p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Score NBO (V×3 + F×2 + R×1)</p>
            <p className="text-lg font-bold text-primary">{client.nbo_score}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Regra aplicada:</p>
            <p className="text-xs text-muted-foreground">{client.oferta_regra}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Oferta gerada:</p>
            <p className="text-xs text-muted-foreground">{client.oferta}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NBODashboard;
