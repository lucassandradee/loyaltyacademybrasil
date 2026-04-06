import { useEffect, useState, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, FileText, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users, ChevronLeft, ChevronRight, LayoutGrid, BookOpen, Filter, CheckCircle2, BarChart3, List, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRFVSummary, scoreClients, defaultPercentileParams } from '@/lib/rfv-logic';
import { generateNBOSummary, classifyNBO } from '@/lib/nbo-logic';
import { generateCXSummary } from '@/lib/cx-logic';
import type { ClientData } from '@/lib/rfv-logic';
import type { CXTicket } from '@/lib/cx-logic';
import { cn } from '@/lib/utils';
import { parseDiagrams, DiagramRenderer, type ParsedDiagram } from '@/components/plan/DiagramRenderer';


interface PlanSection {
  id: string;
  title: string;
  content: string;
}

const sectionIcons: Record<string, any> = {
  sumario: FileText, maturidade: Shield, objetivos: Target, estrutura: Lightbulb,
  estrategia: Award, beneficios: Award, segmentacao: Users, canais: Megaphone,
  operacoes: Settings, custos: DollarSign, cronograma: Calendar, plano5w2h: ListChecks, plano: FileText,
};

const sectionColors: Record<string, string> = {
  sumario: 'border-l-blue-600', maturidade: 'border-l-indigo-600', objetivos: 'border-l-violet-600',
  estrutura: 'border-l-purple-600', estrategia: 'border-l-fuchsia-600', beneficios: 'border-l-pink-600',
  segmentacao: 'border-l-rose-600', canais: 'border-l-orange-600', operacoes: 'border-l-amber-600',
  custos: 'border-l-yellow-600', cronograma: 'border-l-lime-600', plano5w2h: 'border-l-emerald-600',
};

const areaBadgeColors: Record<string, string> = {
  'RFV': 'bg-blue-100 text-blue-800 border-blue-200',
  'NBO': 'bg-purple-100 text-purple-800 border-purple-200',
  'CX': 'bg-orange-100 text-orange-800 border-orange-200',
  'Estratégico': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const timelineColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  { bg: 'bg-violet-500', light: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  { bg: 'bg-rose-500', light: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700' },
];

// ─── Markdown helpers ───

function markdownToHtml(md: string): string {
  if (!md) return '';
  if (md.trim().startsWith('{') || md.trim().startsWith('```json')) return '<p><em>Conteúdo sendo processado...</em></p>';

  let html = md
    .replace(/^#### (.+)$/gm, '<h4 class="mt-4 mb-2 text-xs font-semibold text-foreground flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="mt-5 mb-2 text-xs font-semibold text-foreground border-b pb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-5 mb-3 text-sm font-bold text-foreground flex items-center gap-2"><span class="w-1.5 h-4 rounded bg-primary inline-block"></span>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Tables
  const tableRegex = /(\|.+\|(?:\r?\n)?)+/g;
  html = html.replace(tableRegex, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSepar = (r: string) => /^\|[\s-:]+\|$/.test(r.trim().replace(/\|/g, '|'));
    const dataRows = rows.filter(r => !isSepar(r));
    if (dataRows.length === 0) return '';
    const parse = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
    const headerCells = parse(dataRows[0]);
    const bodyRows = dataRows.slice(1);
    let t = '<div class="overflow-x-auto my-3 rounded-lg border"><table class="w-full text-xs"><thead><tr>';
    headerCells.forEach(c => { t += `<th class="px-2.5 py-2 text-left text-xs font-semibold bg-primary/10 text-foreground border-b">${c}</th>`; });
    t += '</tr></thead><tbody>';
    bodyRows.forEach((r, i) => {
      const cells = parse(r);
      const stripe = i % 2 === 0 ? 'bg-card' : 'bg-muted/30';
      t += `<tr class="${stripe} hover:bg-muted/50 transition-colors">`;
      cells.forEach((c, ci) => {
        const areaMatch = ci === 0 && areaBadgeColors[c];
        if (areaMatch) {
          t += `<td class="px-2.5 py-1.5 border-b text-xs"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${areaBadgeColors[c]}">${c}</span></td>`;
        } else {
          t += `<td class="px-2.5 py-1.5 border-b text-xs text-muted-foreground">${c}</td>`;
        }
      });
      t += '</tr>';
    });
    t += '</tbody></table></div>';
    return t;
  });

  html = html
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 mb-1"><span class="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0"></span><span class="text-xs">$1</span></li>')
    .replace(/^• (.+)$/gm, '<li class="flex items-start gap-2 mb-1"><span class="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0"></span><span class="text-xs">$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-1 ml-4 list-decimal text-xs">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed text-xs">')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li[\s\S]*?<\/li>(?:<br\/>)?)+/g, (m) => '<ul class="my-3 space-y-1.5">' + m.replace(/<br\/>/g, '') + '</ul>');
  return '<div class="space-y-2"><p class="mb-3 leading-relaxed text-xs">' + html + '</p></div>';
}

function extractSummary(md: string, maxLen = 180): string {
  if (!md) return '';
  const plain = md.replace(/#{1,4}\s*/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^\|.*\|$/gm, '').replace(/^[-:]+$/gm, '').replace(/\n+/g, ' ').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}

// ─── Timeline parser ───

interface TimelinePhase {
  name: string;
  period: string;
  milestones: string[];
}

function parseTimeline(md: string): TimelinePhase[] {
  const phases: TimelinePhase[] = [];
  const parts = md.split(/^## /gm).filter(Boolean);
  for (const part of parts) {
    const lines = part.trim().split('\n');
    const name = lines[0]?.trim() || '';
    if (!name) continue;
    const periodMatch = part.match(/\*\*Per[ií]odo:\*\*\s*(.+)/i) || part.match(/Per[ií]odo:\s*(.+)/i) || part.match(/\*\*(.+?meses?.*?)\*\*/i);
    const period = periodMatch ? periodMatch[1].trim() : '';
    const milestones = lines.filter(l => /^[-•]/.test(l.trim())).map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
    if (name) phases.push({ name, period, milestones });
  }
  return phases;
}

// ─── 5W2H parser ───

interface Action5W2H {
  area: string;
  oQue: string;
  porQue: string;
  onde: string;
  quando: string;
  quem: string;
  como: string;
  quanto: string;
}

function parse5W2H(md: string): Action5W2H[] {
  const actions: Action5W2H[] = [];
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
  const dataLines = lines.filter(l => !/^\|[\s-:]+\|$/.test(l.trim().replace(/\|/g, '|')));
  for (let i = 1; i < dataLines.length; i++) {
    const cells = dataLines[i].split('|').slice(1, -1).map(c => c.trim());
    if (cells.length >= 7) {
      actions.push({
        area: cells[0] || 'Estratégico',
        oQue: cells[1] || '',
        porQue: cells[2] || '',
        onde: cells[3] || '',
        quando: cells[4] || '',
        quem: cells[5] || '',
        como: cells[6] || '',
        quanto: cells[7] || '',
      });
    }
  }
  return actions;
}

function parseSectionsFromContent(planContent: any): PlanSection[] {
  if (!planContent) return [];
  if (planContent.sections && Array.isArray(planContent.sections)) {
    const first = planContent.sections[0];
    if (first?.content && !first.content.trim().startsWith('{')) return planContent.sections;
  }
  if (typeof planContent === 'string') {
    try { return parseSectionsFromContent(JSON.parse(planContent)); } catch { return [{ id: 'plano', title: 'Plano Estratégico', content: planContent }]; }
  }
  return [];
}

// ─── 6-Block Section Parser ───

interface SectionBlocks {
  contexto: string | null;
  desenvolvimento: string;
  principaisPontos: string[] | null;
  tabela: string | null;
  conclusao: string | null;
}

function parseSectionBlocks(content: string): SectionBlocks {
  let remaining = content;

  // Remove any "Resumo dos Dados" remnants
  remaining = remaining.replace(/##\s*📊?\s*Resumo dos Dados[^\n]*\n?/g, '');

  // 1. Extract Contexto Teórico
  let contexto: string | null = null;
  const ctxMatch = remaining.match(/##\s*(?:📚\s*)?Contexto Te[oó]rico[^\n]*\n([\s\S]*?)(?=\n##|$)/);
  if (ctxMatch) {
    contexto = ctxMatch[1].trim().split(/\n\n/)[0].trim();
    remaining = remaining.replace(ctxMatch[0], '');
  }

  // 5. Extract Conclusão (do it before desenvolvimento to remove from remaining)
  let conclusao: string | null = null;
  const concMatch = remaining.match(/##\s*(?:🎯\s*)?(?:Conclus[aã]o|Nossa Recomenda[cç][aã]o)[^\n]*\n([\s\S]*?)$/);
  if (concMatch) {
    conclusao = concMatch[1].trim().split(/\n\n/)[0].trim();
    remaining = remaining.replace(concMatch[0], '');
  }

  // 4. Extract Tabela de Resultados
  let tabela: string | null = null;
  const tabMatch = remaining.match(/##\s*(?:📊\s*)?Tabela de Resultados[^\n]*\n([\s\S]*?)(?=\n##|$)/);
  if (tabMatch) {
    tabela = tabMatch[1].trim();
    remaining = remaining.replace(tabMatch[0], '');
  }

  // 3. Extract Principais Pontos
  let principaisPontos: string[] | null = null;
  const ppMatch = remaining.match(/##\s*(?:📋\s*)?Principais Pontos[^\n]*\n([\s\S]*?)(?=\n##|$)/);
  if (ppMatch) {
    const ppContent = ppMatch[1].trim();
    principaisPontos = ppContent
      .split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
    remaining = remaining.replace(ppMatch[0], '');
  }

  // 2. Desenvolvimento = whatever is left
  const desenvolvimento = remaining.trim();

  return { contexto, desenvolvimento, principaisPontos, tabela, conclusao };
}

// ─── Visual renderers ───

function TimelineView({ content }: { content: string }) {
  const phases = parseTimeline(content);
  if (phases.length === 0) return <div data-pdf-block className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;

  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20" />
      {phases.map((phase, i) => {
        const color = timelineColors[i % timelineColors.length];
        return (
          <div key={i} data-pdf-block className="relative mb-6 last:mb-0">
            <div className={cn('absolute -left-[18px] top-1 w-4 h-4 rounded-full border-2 border-background', color.bg)} />
            <div className={cn('ml-4 rounded-lg border p-4', color.light)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={cn('font-bold text-sm', color.text)}>{phase.name}</h3>
                {phase.period && (
                  <Badge variant="outline" className={cn('text-xs', color.text)}>{phase.period}</Badge>
                )}
              </div>
              {phase.milestones.length > 0 && (
                <ul className="space-y-1.5">
                  {phase.milestones.map((m, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={cn('h-4 w-4 mt-0.5 shrink-0', color.text)} />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionPlan5W2H({ content }: { content: string }) {
  const actions = parse5W2H(content);
  const [filter, setFilter] = useState<string>('Todos');

  if (actions.length === 0) return <div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;

  const areas = ['Todos', ...Array.from(new Set(actions.map(a => a.area)))];
  const filtered = filter === 'Todos' ? actions : actions.filter(a => a.area === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {areas.map(area => (
          <button
            key={area}
            onClick={() => setFilter(area)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === area
                ? 'bg-primary text-primary-foreground border-primary'
                : areaBadgeColors[area] || 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            )}
          >
            <Filter className="inline h-3 w-3 mr-1" />
            {area} {area !== 'Todos' && `(${actions.filter(a => a.area === area).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((action, i) => (
          <div key={i} data-pdf-block className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', areaBadgeColors[action.area] || 'bg-muted text-muted-foreground')}>
                {action.area}
              </span>
              {action.quando && <span className="text-xs text-muted-foreground">{action.quando}</span>}
            </div>
            <h4 className="font-semibold text-sm text-foreground mb-1">{action.oQue}</h4>
            <p className="text-xs text-muted-foreground mb-2">{action.porQue}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {action.onde && <div><span className="font-medium text-foreground">Onde:</span> {action.onde}</div>}
              {action.quem && <div><span className="font-medium text-foreground">Quem:</span> {action.quem}</div>}
              {action.como && <div className="col-span-2"><span className="font-medium text-foreground">Como:</span> {action.como}</div>}
              {action.quanto && <div className="col-span-2"><span className="font-medium text-foreground">Investimento:</span> {action.quanto}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section renderer with 6 blocks ───

function SectionContent({ section }: { section: PlanSection }) {
  if (section.id === 'cronograma') return <TimelineView content={section.content} />;
  if (section.id === 'plano5w2h') return <ActionPlan5W2H content={section.content} />;

  const blocks = parseSectionBlocks(section.content);
  const devParts = parseDiagrams(blocks.desenvolvimento);

  return (
    <div className="space-y-5">
      {/* Block 1: Contexto Teórico */}
      {blocks.contexto && (
        <div data-pdf-block className="border-l-4 border-l-red-400 rounded-r-lg p-4 bg-red-50/30 dark:bg-red-950/10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto Teórico</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{blocks.contexto}</p>
        </div>
      )}

      {/* Block 2: Desenvolvimento */}
      <div className="max-w-none text-muted-foreground text-xs [&_h2]:text-foreground [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-foreground [&_h3]:text-xs [&_h3]:font-semibold [&_h4]:text-foreground [&_h4]:text-xs [&_strong]:text-foreground [&_p]:text-xs [&_li]:text-xs [&_th]:text-xs [&_td]:text-xs">
        {devParts.map((part, i) => {
          if (typeof part === 'string') return <div key={i} data-pdf-block dangerouslySetInnerHTML={{ __html: markdownToHtml(part) }} />;
          return <div key={i} data-pdf-block><DiagramRenderer diagram={part} /></div>;
        })}
      </div>

      {/* Block 3: Principais Pontos */}
      {blocks.principaisPontos && blocks.principaisPontos.length > 0 && (
        <div data-pdf-block className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <List className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Principais Pontos</span>
          </div>
          <ol className="space-y-3">
            {blocks.principaisPontos.map((pt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-xs text-muted-foreground leading-relaxed pt-1">{pt}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Block 4: Tabela de Resultados */}
      {blocks.tabela && (
        <div data-pdf-block dangerouslySetInnerHTML={{ __html: markdownToHtml(blocks.tabela) }} />
      )}

      {/* Block 5: Conclusão */}
      {blocks.conclusao && (
        <div data-pdf-block className="border-l-4 border-l-emerald-400 rounded-r-lg p-4 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conclusão</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{blocks.conclusao}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───

const Resultado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [hasLab, setHasLab] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'detail'>('canvas');

  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem('plan_sections_ready', 'true');
      window.dispatchEvent(new Event('plan-sections-ready'));
      if (!window.location.hash && sections[0]) window.location.hash = sections[0].id;
    }
    return () => { localStorage.removeItem('plan_sections_ready'); };
  }, [sections]);

  useEffect(() => {
    const handler = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx >= 0) { setActiveSection(idx); setViewMode('detail'); }
    };
    window.addEventListener('plan-navigate', handler);
    return () => window.removeEventListener('plan-navigate', handler);
  }, [sections]);

  useEffect(() => {
    if (sections[activeSection]) window.location.hash = sections[activeSection].id;
  }, [activeSection, sections]);

  const loadAndGenerate = async (forceRegenerate = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase.from('generated_plans').select('plan_content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existingPlan?.plan_content) {
        const parsed = parseSectionsFromContent(existingPlan.plan_content);
        if (parsed.length > 0 && parsed[0].content && !parsed[0].content.trim().startsWith('{') && !parsed[0].content.trim().startsWith('```')) {
          setSections(parsed); setHasLab(true); setLoading(false); return;
        }
      }
    }

    const [profileRes, diagRes, rfvRes, cxRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('diagnostic_responses').select('answers').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('rfv_uploads').select('client_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('cx_uploads').select('ticket_data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const diagAnswers = diagRes.data?.answers as Record<string, any> | null;
    const labAnswers = diagAnswers?.lab || diagAnswers || null;
    if (!labAnswers || (typeof labAnswers === 'object' && Object.keys(labAnswers).length === 0)) {
      setHasLab(false); setLoading(false); return;
    }
    setHasLab(true);

    const companyData = diagAnswers ? {
      modelo: diagAnswers.modelo,
      segmento: diagAnswers.segmento,
      anoFundacao: diagAnswers.anoFundacao,
      tamanhoBase: diagAnswers.tamanhoBase,
      faturamento: diagAnswers.faturamento,
      produtos: diagAnswers.produtos,
      frequencia: diagAnswers.frequencia,
      dados: diagAnswers.dados,
      infos: diagAnswers.infos,
      desafio: diagAnswers.desafio,
    } : null;

    let rfvSummary = '', nboSummary = '', cxSummary = '';
    if (rfvRes.data?.client_data) {
      const cd = rfvRes.data.client_data as unknown as ClientData[];
      rfvSummary = generateRFVSummary(scoreClients(cd, defaultPercentileParams(3)));
      nboSummary = generateNBOSummary(classifyNBO(cd));
    }
    if (cxRes.data?.ticket_data) cxSummary = generateCXSummary(cxRes.data.ticket_data as unknown as CXTicket[]);

    setGenerating(true); setLoading(false);
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-plan', {
        body: { profile, labAnswers, companyData, rfvSummary, nboSummary, cxSummary },
      });
      if (funcError) throw new Error(funcError.message);
      if (funcData?.error) throw new Error(funcData.error);
      const planSections = parseSectionsFromContent(funcData);
      setSections(planSections);
      const userId = (await supabase.auth.getUser()).data.user!.id;
      await supabase.from('generated_plans').delete().eq('user_id', userId);
      await supabase.from('generated_plans').insert({ user_id: userId, plan_content: JSON.parse(JSON.stringify({ sections: planSections })) });
    } catch (err: any) {
      console.error('Plan generation error:', err);
      toast({ title: 'Erro ao gerar plano', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  useEffect(() => { loadAndGenerate(); }, []);

  const handleRegenerate = () => { setSections([]); setActiveSection(0); setGenerating(true); loadAndGenerate(true); };

  const handleDownloadPDF = async () => {
    try {
      toast({ title: 'Gerando PDF...', description: 'Capturando o plano completo. Aguarde.' });

      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const A4_W_MM = 210;
      const A4_H_MM = 297;
      const HEADER_H = 14;
      const FOOTER_H = 12;
      const MARGIN_MM = 15;
      const CONTENT_W_MM = A4_W_MM - MARGIN_MM * 2;
      const CONTENT_H_MM = A4_H_MM - HEADER_H - FOOTER_H - 4;
      const SECTION_GAP_MM = 3;

      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:hidden;z-index:-1;background:white;';
      document.body.appendChild(host);

      const styleEl = document.createElement('style');
      let cssText = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) cssText += rule.cssText + '\n';
        } catch {}
      }
      styleEl.textContent = cssText;
      host.appendChild(styleEl);

      const renderCanvas = async (element: HTMLElement, width = 794) => {
        await new Promise(r => setTimeout(r, 250));
        return html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width,
          windowWidth: 794,
        });
      };

      type CapturedSection = {
        titleCanvas: HTMLCanvasElement;
        blockCanvases: HTMLCanvasElement[];
      };

      const capturedSections: CapturedSection[] = [];

      for (const section of sections) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:794px;background:white;padding:24px 48px;';
        wrapper.className = 'bg-background text-foreground';

        const titleBar = document.createElement('div');
        titleBar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;';
        titleBar.innerHTML = `<div style="width:3px;height:20px;background:#a80000;border-radius:2px;"></div><h2 style="font-size:14px;font-weight:700;color:#333;margin:0;">${section.title}</h2>`;
        wrapper.appendChild(titleBar);

        const mount = document.createElement('div');
        wrapper.appendChild(mount);

        const root = createRoot(mount);
        root.render(createElement(SectionContent, { section }));

        host.appendChild(wrapper);
        const titleCanvas = await renderCanvas(titleBar);

        const blockCanvases: HTMLCanvasElement[] = [];
        const childElements = Array.from(mount.children) as HTMLElement[];

        if (childElements.length === 0) {
          blockCanvases.push(await renderCanvas(mount));
        } else {
          for (const child of childElements) {
            if (child.offsetHeight === 0) continue;
            blockCanvases.push(await renderCanvas(child, child.offsetWidth || 794));
          }
        }

        capturedSections.push({ titleCanvas, blockCanvases });
        root.unmount();
        host.removeChild(wrapper);
      }

      document.body.removeChild(host);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let currentY = HEADER_H + 2;

      const addHeaderFooter = (page: number, total: number) => {
        pdf.setPage(page);
        pdf.setFillColor(168, 0, 0);
        pdf.rect(0, 0, A4_W_MM, HEADER_H, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Loyalty Academy Brasil — Plano Estratégico', MARGIN_MM, 9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${page}/${total}`, A4_W_MM - MARGIN_MM, 9, { align: 'right' });
        const footerY = A4_H_MM - FOOTER_H;
        pdf.setDrawColor(168, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.line(MARGIN_MM, footerY + 2, A4_W_MM - MARGIN_MM, footerY + 2);
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text('Documento gerado pela Plataforma Loyalty Academy Brasil', MARGIN_MM, footerY + 7);
        pdf.text(new Date().toLocaleDateString('pt-BR'), A4_W_MM - MARGIN_MM, footerY + 7, { align: 'right' });
      };

      const addCanvas = (canvas: HTMLCanvasElement, y: number) => {
        const heightMm = (canvas.height * CONTENT_W_MM) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN_MM, y, CONTENT_W_MM, heightMm);
        return heightMm;
      };

      capturedSections.forEach((sectionCapture, index) => {
        if (index > 0) {
          pdf.addPage();
          currentY = HEADER_H + 2;
        }

        const titleHeight = (sectionCapture.titleCanvas.height * CONTENT_W_MM) / sectionCapture.titleCanvas.width;
        if (currentY + titleHeight > HEADER_H + 2 + CONTENT_H_MM) {
          pdf.addPage();
          currentY = HEADER_H + 2;
        }

        currentY += addCanvas(sectionCapture.titleCanvas, currentY) + 2;

        sectionCapture.blockCanvases.forEach((blockCanvas) => {
          const blockHeight = (blockCanvas.height * CONTENT_W_MM) / blockCanvas.width;
          const pageLimit = HEADER_H + 2 + CONTENT_H_MM;

          if (blockHeight <= CONTENT_H_MM && currentY + blockHeight > pageLimit) {
            pdf.addPage();
            currentY = HEADER_H + 2;
          }

          if (blockHeight > CONTENT_H_MM) {
            const pxPerPage = (CONTENT_H_MM * blockCanvas.width) / CONTENT_W_MM;
            let srcY = 0;
            let firstSlice = true;

            while (srcY < blockCanvas.height) {
              if (!firstSlice) {
                pdf.addPage();
                currentY = HEADER_H + 2;
              }

              const sliceHeightPx = Math.min(pxPerPage, blockCanvas.height - srcY);
              const sliceCanvas = document.createElement('canvas');
              sliceCanvas.width = blockCanvas.width;
              sliceCanvas.height = sliceHeightPx;
              const ctx = sliceCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                ctx.drawImage(blockCanvas, 0, srcY, blockCanvas.width, sliceHeightPx, 0, 0, blockCanvas.width, sliceHeightPx);
                currentY += addCanvas(sliceCanvas, currentY) + SECTION_GAP_MM;
              }

              srcY += sliceHeightPx;
              firstSlice = false;
            }
          } else {
            currentY += addCanvas(blockCanvas, currentY) + SECTION_GAP_MM;
          }
        });
      });

      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page++) addHeaderFooter(page, totalPages);

      pdf.save('Plano_Estrategico_Loyalty_LAB.pdf');
      toast({ title: 'PDF gerado com sucesso!', description: `${totalPages} páginas exportadas.` });
    } catch (err) {
      console.error('PDF error:', err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">Carregando plano estratégico...</p>
    </div>
  );

  if (!hasLab) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-2xl font-bold text-foreground">Framework LAB não preenchido</h2>
      <p className="text-muted-foreground text-center max-w-md">Complete primeiro o Formulário LAB.</p>
      <Button onClick={() => navigate('/lab-framework')} size="lg" className="mt-4">Ir para Formulário LAB</Button>
    </div>
  );

  if (generating && sections.length === 0) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">Gerando seu plano estratégico com IA...</p>
      <p className="text-sm text-muted-foreground">Isso pode levar até 60 segundos</p>
    </div>
  );

  const currentSection = sections[activeSection];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plano Estratégico de Loyalty</h1>
          <p className="mt-1 text-muted-foreground">Gerado por IA com base nos seus dados e no Framework LAB</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('canvas')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'canvas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Canvas
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'detail' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <BookOpen className="h-3.5 w-3.5" /> Leitura
            </button>
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2" disabled={sections.length === 0}>
            <Download className="h-4 w-4" /> PDF Completo
          </Button>
          <Button onClick={handleRegenerate} disabled={generating} variant="outline" size="sm" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerar
          </Button>
        </div>
      </div>

      {/* Canvas Mode */}
      {viewMode === 'canvas' && sections.length > 0 && (() => {
        const findSection = (id: string) => {
          const idx = sections.findIndex(s => s.id === id);
          return idx >= 0 ? { section: sections[idx], idx } : null;
        };
        const canvasNumColors: Record<string, string> = {
          sumario: 'bg-blue-600 text-white',
          objetivos: 'bg-blue-600 text-white',
          maturidade: 'bg-blue-600 text-white',
          estrategia: 'bg-blue-600 text-white',
          custos: 'bg-blue-600 text-white',
          estrutura: 'bg-blue-600 text-white',
          beneficios: 'bg-red-600 text-white',
          canais: 'bg-red-600 text-white',
          segmentacao: 'bg-red-600 text-white',
          operacoes: 'bg-red-600 text-white',
          cronograma: 'bg-gray-500 text-white',
          plano5w2h: 'bg-gray-500 text-white',
        };
        const canvasDescriptions: Record<string, string> = {
          sumario: 'Visão geral do plano',
          maturidade: 'Nível atual da empresa',
          objetivos: 'Metas do programa',
          estrutura: 'Mecânicas e regras',
          estrategia: 'Aquisição e retenção',
          beneficios: 'Tangíveis e intangíveis',
          segmentacao: 'Tiers e clusters',
          canais: 'Cadastro e comunicação',
          operacoes: 'Processos e equipe',
          custos: 'Investimento e ROI',
          cronograma: 'Fases e prazos',
          plano5w2h: 'Ações detalhadas',
        };
        const CanvasCell = ({ id, className: cls }: { id: string; className?: string }) => {
          const found = findSection(id);
          if (!found) return <div className={cn('border border-border bg-card rounded-lg p-4', cls)} />;
          const { section, idx } = found;
          const Icon = sectionIcons[section.id] || FileText;
          const num = sections.indexOf(section) + 1;
          const numColor = canvasNumColors[id] || 'bg-gray-500 text-white';
          const desc = canvasDescriptions[id] || '';
          return (
            <button
              onClick={() => { setActiveSection(idx); setViewMode('detail'); }}
              className={cn(
                'group text-left bg-card rounded-lg p-4 hover:shadow-lg hover:border-primary/40 transition-all hover:scale-[1.01]',
                cls
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0', numColor)}>{num}</span>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <h3 className="mt-1.5 text-sm font-medium text-foreground leading-tight">{section.title.replace(/^\d+\.\s*/, '')}</h3>
              <span className="mt-2 text-[9px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Abrir →</span>
            </button>
          );
        };

        return (
          <div className="border-2 border-border/80 rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-1">
              <CanvasCell id="sumario" className="rounded-none border-0 border-b-2 border-border/60 min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2">
              <CanvasCell id="objetivos" className="rounded-none border-0 border-r-2 border-b-2 border-border/60 min-h-[90px]" />
              <CanvasCell id="maturidade" className="rounded-none border-0 border-b-2 border-border/60 min-h-[90px]" />
            </div>
            <div className="grid grid-cols-[1fr_2fr_1fr]" style={{ minHeight: 180 }}>
              <CanvasCell id="estrategia" className="rounded-none border-0 border-r-2 border-b-2 border-border/60" />
              <div className="grid grid-cols-2 grid-rows-2 border-r-2 border-b-2 border-border/60">
                <CanvasCell id="beneficios" className="rounded-none border-0 border-r border-b border-border/40" />
                <CanvasCell id="canais" className="rounded-none border-0 border-b border-border/40" />
                <CanvasCell id="segmentacao" className="rounded-none border-0 border-r border-border/40" />
                <CanvasCell id="operacoes" className="rounded-none border-0" />
              </div>
              <CanvasCell id="estrutura" className="rounded-none border-0 border-b-2 border-border/60" />
            </div>
            <div className="grid grid-cols-3">
              <CanvasCell id="custos" className="rounded-none border-0 border-r-2 border-border/60 min-h-[90px]" />
              <CanvasCell id="cronograma" className="rounded-none border-0 border-r-2 border-border/60 min-h-[90px]" />
              <CanvasCell id="plano5w2h" className="rounded-none border-0 min-h-[90px]" />
            </div>
          </div>
        );
      })()}

      {/* Detail Mode */}
      {viewMode === 'detail' && currentSection && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {(() => { const Icon = sectionIcons[currentSection.id] || FileText; return <Icon className="h-6 w-6 text-primary" />; })()}
                <CardTitle className="text-lg">{currentSection.title}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Seção {activeSection + 1} de {sections.length}</p>
            </CardHeader>
            <CardContent>
              <SectionContent section={currentSection} />
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={activeSection === 0} onClick={() => setActiveSection(activeSection - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('canvas')} className="text-xs gap-1">
              <LayoutGrid className="h-3.5 w-3.5" /> Voltar ao Canvas
            </Button>
            <Button variant="outline" disabled={activeSection >= sections.length - 1} onClick={() => setActiveSection(activeSection + 1)} className="gap-1">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

    </div>
  );
};

export default Resultado;
