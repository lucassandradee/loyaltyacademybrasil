import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, AlertTriangle, Users, DollarSign, Star, Clock, TrendingUp, Target, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { scoreClients, defaultPercentileParams, allClusterNames, clusterColors, generateRFVSummary } from '@/lib/rfv-logic';
import { classifyNBO, allFaixaNames, faixaColors, generateNBOSummary, type ScoredNBOClient } from '@/lib/nbo-logic';
import { calculateCXKPIs, analyzeCausasRaiz, generateCXSummary } from '@/lib/cx-logic';
import * as XLSX from 'xlsx';

import type { ClientData } from '@/lib/rfv-logic';
import type { CXTicket } from '@/lib/cx-logic';

interface DiagnosticData {
  answers: Record<string, any>;
}

const PlanoFinal = () => {
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [rfvData, setRfvData] = useState<ClientData[] | null>(null);
  const [nboData, setNboData] = useState<ClientData[] | null>(null);
  const [cxData, setCxData] = useState<CXTicket[] | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { setLoading(false); return; }
      const uid = session.session.user.id;

      const [diagRes, rfvRes, nboRes, cxRes] = await Promise.all([
        supabase.from('diagnostic_responses').select('answers').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('rfv_uploads').select('client_data').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('rfv_uploads').select('client_data').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('cx_uploads').select('ticket_data').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (diagRes.data) setDiagnostic(diagRes.data as any);
      if (rfvRes.data?.client_data) setRfvData(rfvRes.data.client_data as unknown as ClientData[]);
      if (nboRes.data?.client_data) setNboData(nboRes.data.client_data as unknown as ClientData[]);
      if (cxRes.data?.ticket_data) setCxData(cxRes.data.ticket_data as unknown as CXTicket[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const rfvScored = rfvData ? scoreClients(rfvData, defaultPercentileParams(3)) : null;
  const rfvClusters = rfvScored ? (() => {
    const counts: Record<string, number> = {};
    allClusterNames.forEach(n => counts[n] = 0);
    rfvScored.forEach(c => counts[c.cluster] = (counts[c.cluster] || 0) + 1);
    return allClusterNames.map(n => ({ name: n, count: counts[n], pct: rfvScored.length > 0 ? ((counts[n] / rfvScored.length) * 100).toFixed(1) : '0' }));
  })() : null;

  const nboScored = nboData ? classifyNBO(nboData) : null;
  const nboCounts = nboScored ? (() => {
    const counts: Record<string, number> = {};
    allFaixaNames.forEach(n => counts[n] = 0);
    nboScored.forEach(c => counts[c.faixa] = (counts[c.faixa] || 0) + 1);
    return allFaixaNames.map(n => ({ name: n, count: counts[n], pct: nboScored.length > 0 ? ((counts[n] / nboScored.length) * 100).toFixed(1) : '0' }));
  })() : null;

  const cxKpis = cxData ? calculateCXKPIs(cxData) : null;
  const cxCausas = cxData ? analyzeCausasRaiz(cxData) : null;

  // Generate diagnostic summaries
  const rfvSummary = rfvScored ? generateRFVSummary(rfvScored) : null;
  const nboSummary = nboScored ? generateNBOSummary(nboScored) : null;
  const cxSummaryText = cxData ? generateCXSummary(cxData) : null;

  const stepsCompleted = [!!diagnostic, !!rfvData, !!nboData, !!cxData].filter(Boolean).length;

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    const summary: any[] = [
      { Passo: 'Diagnóstico Estratégico', Status: diagnostic ? 'Concluído' : 'Pendente' },
      { Passo: 'Segmentação RFV', Status: rfvData ? `Concluído (${rfvData.length} clientes)` : 'Pendente' },
      { Passo: 'Next Best Offer', Status: nboData ? `Concluído (${nboData.length} clientes)` : 'Pendente' },
      { Passo: 'Customer Experience', Status: cxData ? `Concluído (${cxData.length} chamados)` : 'Pendente' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Resumo');

    if (rfvClusters) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rfvClusters.map(c => ({ Cluster: c.name, Quantidade: c.count, Percentual: `${c.pct}%` }))), 'RFV');
    }
    if (nboCounts) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nboCounts.map(c => ({ Faixa: c.name, Quantidade: c.count, Percentual: `${c.pct}%` }))), 'NBO');
    }
    if (cxKpis && cxCausas) {
      const cxSheet = [
        { Métrica: 'Total Chamados', Valor: String(cxKpis.total_chamados) },
        { Métrica: 'TMA Médio', Valor: `${cxKpis.tma_medio.toFixed(1)} min` },
        { Métrica: 'NPS', Valor: `${cxKpis.nps_real.toFixed(1)}` },
        { Métrica: '% Promotores', Valor: `${cxKpis.pct_promotores.toFixed(1)}%` },
        { Métrica: '% Detratores', Valor: `${cxKpis.pct_detratores.toFixed(1)}%` },
        { Métrica: '', Valor: '' },
        ...cxCausas.map(c => ({ Métrica: `Causa: ${c.causa}`, Valor: `${c.count} chamados (${c.pct.toFixed(1)}%)` })),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cxSheet), 'CX');
    }

    XLSX.writeFile(wb, 'plano-final-loyalty.xlsx');
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plano Final Consolidado</h1>
          <p className="text-muted-foreground">Visão unificada de todos os passos da estratégia de Loyalty</p>
        </div>
        <Button onClick={handleDownloadExcel}><Download className="mr-2 h-4 w-4" /> Baixar Relatório Excel</Button>
      </div>

      {/* Progress */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Progresso</h2>
            <Badge variant={stepsCompleted === 4 ? 'default' : 'secondary'}>{stepsCompleted}/4 passos concluídos</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'RFV', done: !!rfvData },
              { label: 'Next Best Offer', done: !!nboData },
              { label: 'Customer Experience', done: !!cxData },
              { label: 'Diagnóstico', done: !!diagnostic },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg border p-3 ${step.done ? 'border-primary/30 bg-primary/5' : 'border-muted bg-muted/30'}`}>
                {step.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
                <span className={`text-sm font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>Passo {i + 1}: {step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagnóstico RFV */}
      {rfvSummary && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Diagnóstico RFV com IA</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{rfvSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico NBO */}
      {nboSummary && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Diagnóstico NBO</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{nboSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico CX */}
      {cxSummaryText && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Diagnóstico CX</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{cxSummaryText}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1 - RFV */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" /> Passo 1 — Segmentação RFV</CardTitle>
        </CardHeader>
        <CardContent>
          {rfvClusters ? (
            <div>
              <p className="mb-4 text-sm text-muted-foreground">Base de {rfvScored!.length} clientes segmentados em {rfvClusters.filter(c => c.count > 0).length} clusters.</p>
              <div className="flex flex-wrap gap-2">
                {rfvClusters.filter(c => c.count > 0).map(c => (
                  <Badge key={c.name} variant="outline" style={{ borderColor: clusterColors[c.name], color: clusterColors[c.name] }}>
                    {c.name}: {c.count} ({c.pct}%)
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">⚠️ Análise RFV ainda não realizada.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 - NBO */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5" /> Passo 2 — Next Best Offer</CardTitle>
        </CardHeader>
        <CardContent>
          {nboCounts ? (
            <div>
              <p className="mb-4 text-sm text-muted-foreground">Base de {nboScored!.length} clientes segmentados por faixa de gasto.</p>
              <div className="flex flex-wrap gap-2">
                {nboCounts.filter(c => c.count > 0).map(c => (
                  <Badge key={c.name} variant="outline" style={{ borderColor: faixaColors[c.name], color: faixaColors[c.name] }}>
                    {c.name}: {c.count} ({c.pct}%)
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">⚠️ Análise NBO ainda não realizada.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 3 - CX */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5" /> Passo 3 — Customer Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {cxKpis && cxCausas ? (
            <div>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-accent p-3">
                  <p className="text-xs text-muted-foreground">NPS</p>
                  <p className="text-xl font-bold text-foreground">{cxKpis.nps_real.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <p className="text-xs text-muted-foreground">TMA Médio</p>
                  <p className="text-xl font-bold text-foreground">{cxKpis.tma_medio.toFixed(1)} min</p>
                </div>
                <div className="rounded-lg bg-accent p-3">
                  <p className="text-xs text-muted-foreground">Total Chamados</p>
                  <p className="text-xl font-bold text-foreground">{cxData!.length}</p>
                </div>
              </div>
              <p className="mb-2 text-sm font-medium text-foreground">Top Causas Raiz:</p>
              <div className="flex flex-wrap gap-2">
                {cxCausas.slice(0, 5).map(c => (
                  <Badge key={c.causa} variant="outline">{c.causa}: {c.count} ({c.pct.toFixed(1)}%)</Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">⚠️ Análise CX ainda não realizada.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 4 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5" /> Passo 4 — Plano Estratégico</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostic ? (
            <p className="text-sm text-muted-foreground">✅ Diagnóstico e Framework LAB concluídos. O plano estratégico foi gerado com base nas suas respostas.</p>
          ) : (
            <p className="text-sm text-muted-foreground">⚠️ Complete o diagnóstico e o formulário LAB para gerar o plano estratégico.</p>
          )}
        </CardContent>
      </Card>

      {/* Próximos Passos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5" /> Próximos Passos Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!diagnostic && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">Complete o Diagnóstico Estratégico</p>
                  <p className="text-xs text-muted-foreground">O diagnóstico é a base para personalizar todas as recomendações de loyalty.</p>
                </div>
              </div>
            )}
            {rfvClusters && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Priorize os segmentos de maior impacto</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const sorted = [...rfvClusters].sort((a, b) => b.count - a.count);
                      return `Foque nos clusters "${sorted[0]?.name}" (${sorted[0]?.pct}%) e "${sorted[1]?.name}" (${sorted[1]?.pct}%) que concentram a maioria da base.`;
                    })()}
                  </p>
                </div>
              </div>
            )}
            {nboCounts && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Execute as ofertas por faixa de gasto</p>
                  <p className="text-xs text-muted-foreground">Comece com campanhas para mover clientes Bronze → Prata e Prata → Ouro.</p>
                </div>
              </div>
            )}
            {cxCausas && cxCausas.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Resolva as principais causas raiz de CX</p>
                  <p className="text-xs text-muted-foreground">
                    A causa "{cxCausas[0].causa}" representa {cxCausas[0].pct.toFixed(1)}% dos chamados.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-4">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Implemente um ciclo de melhoria contínua</p>
                <p className="text-xs text-muted-foreground">Reavalie os indicadores a cada 30 dias.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanoFinal;
