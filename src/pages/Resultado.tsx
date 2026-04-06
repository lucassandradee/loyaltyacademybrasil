import { useEffect, useState } from 'react';
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
    .replace(/^#### (.+)$/gm, '<h4 class="mt-4 mb-2 text-sm font-semibold text-foreground flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="mt-5 mb-2 text-base font-semibold text-foreground border-b pb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-6 mb-3 text-lg font-bold text-foreground flex items-center gap-2"><span class="w-2 h-5 rounded bg-primary inline-block"></span>$1</h2>')
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
    let t = '<div class="overflow-x-auto my-4 rounded-lg border"><table class="w-full text-sm"><thead><tr>';
    headerCells.forEach(c => { t += `<th class="px-3 py-2.5 text-left font-semibold bg-primary/10 text-foreground border-b">${c}</th>`; });
    t += '</tr></thead><tbody>';
    bodyRows.forEach((r, i) => {
      const cells = parse(r);
      const stripe = i % 2 === 0 ? 'bg-card' : 'bg-muted/30';
      t += `<tr class="${stripe} hover:bg-muted/50 transition-colors">`;
      cells.forEach((c, ci) => {
        const areaMatch = ci === 0 && areaBadgeColors[c];
        if (areaMatch) {
          t += `<td class="px-3 py-2 border-b"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${areaBadgeColors[c]}">${c}</span></td>`;
        } else {
          t += `<td class="px-3 py-2 border-b text-muted-foreground">${c}</td>`;
        }
      });
      t += '</tr>';
    });
    t += '</tbody></table></div>';
    return t;
  });

  html = html
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 mb-1.5"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span><span>$1</span></li>')
    .replace(/^• (.+)$/gm, '<li class="flex items-start gap-2 mb-1.5"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span><span>$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-1.5 ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li[\s\S]*?<\/li>(?:<br\/>)?)+/g, (m) => '<ul class="my-3 space-y-1">' + m.replace(/<br\/>/g, '') + '</ul>');
  return '<div class="space-y-1"><p class="mb-3 leading-relaxed">' + html + '</p></div>';
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
  if (phases.length === 0) return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;

  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20" />
      {phases.map((phase, i) => {
        const color = timelineColors[i % timelineColors.length];
        return (
          <div key={i} className="relative mb-6 last:mb-0">
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
          <div key={i} className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
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
    <div className="space-y-4">
      {/* Block 1: Contexto Teórico */}
      {blocks.contexto && (
        <div className="border-l-4 border-l-red-400 rounded-r-lg p-4 bg-red-50/30 dark:bg-red-950/10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contexto Teórico</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{blocks.contexto}</p>
        </div>
      )}

      {/* Block 2: Desenvolvimento */}
      <div className="prose prose-xs max-w-none text-muted-foreground text-xs [&_h2]:text-foreground [&_h2]:text-base [&_h3]:text-foreground [&_h3]:text-sm [&_h4]:text-foreground [&_h4]:text-xs [&_strong]:text-foreground [&_p]:text-xs [&_li]:text-xs">
        {devParts.map((part, i) => {
          if (typeof part === 'string') return <div key={i} dangerouslySetInnerHTML={{ __html: markdownToHtml(part) }} />;
          return <DiagramRenderer key={i} diagram={part} />;
        })}
      </div>

      {/* Block 3: Principais Pontos */}
      {blocks.principaisPontos && blocks.principaisPontos.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <List className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Principais Pontos</span>
          </div>
          <ol className="space-y-2">
            {blocks.principaisPontos.map((pt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{pt}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Block 4: Tabela de Resultados */}
      {blocks.tabela && (
        <div dangerouslySetInnerHTML={{ __html: markdownToHtml(blocks.tabela) }} />
      )}

      {/* Block 5: Conclusão */}
      {blocks.conclusao && (
        <div className="border-l-4 border-l-emerald-400 rounded-r-lg p-4 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conclusão</span>
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

      // Create offscreen container matching A4 proportions
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '794px'; // A4 at 96dpi
      container.style.background = 'white';
      container.style.padding = '0';
      container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
      document.body.appendChild(container);

      // Render cover
      const cover = document.createElement('div');
      cover.style.cssText = 'background: #1e40af; padding: 40px 28px; color: white; margin-bottom: 20px;';
      cover.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">Plano Estratégico de Loyalty</h1>
        <p style="font-size: 14px; opacity: 0.9; margin: 0 0 4px 0;">Relatório personalizado — Framework LAB</p>
        <p style="font-size: 12px; opacity: 0.8; margin: 0;">${new Date().toLocaleDateString('pt-BR')}</p>
      `;
      container.appendChild(cover);

      // Get the actual rendered content from the page for each section
      // We'll clone the SectionContent rendering by using the same HTML
      for (const section of sections) {
        const sectionEl = document.createElement('div');
        sectionEl.style.cssText = 'padding: 20px 28px 10px 28px; page-break-inside: avoid;';

        // Section title
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;';
        titleEl.innerHTML = `
          <div style="width: 4px; height: 24px; background: #1e40af; border-radius: 2px;"></div>
          <h2 style="font-size: 16px; font-weight: 700; color: #333; margin: 0;">${section.title}</h2>
        `;
        sectionEl.appendChild(titleEl);

        // Render the section content into a temp element on-screen to capture the actual rendered output
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'font-size: 12px; line-height: 1.6; color: #555;';

        if (section.id === 'cronograma') {
          // Render timeline as table for PDF
          const phases = parseTimeline(section.content);
          if (phases.length > 0) {
            let tableHtml = '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">';
            tableHtml += '<thead><tr style="background:#1e40af;color:white;"><th style="padding:8px 10px;text-align:left;">Fase</th><th style="padding:8px 10px;text-align:left;">Período</th><th style="padding:8px 10px;text-align:left;">Marcos</th></tr></thead><tbody>';
            phases.forEach((p, pi) => {
              const bg = pi % 2 === 0 ? '#fff' : '#f5f5f5';
              tableHtml += `<tr style="background:${bg};"><td style="padding:6px 10px;font-weight:600;border-bottom:1px solid #e5e7eb;vertical-align:top;">${p.name}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${p.period}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${p.milestones.map(m => '• ' + m).join('<br/>')}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            contentWrapper.innerHTML = tableHtml;
          }
        } else if (section.id === 'plano5w2h') {
          // Render 5W2H as table
          const actions = parse5W2H(section.content);
          if (actions.length > 0) {
            let tableHtml = '<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:8px;">';
            tableHtml += '<thead><tr style="background:#1e40af;color:white;"><th style="padding:6px 8px;text-align:left;">Área</th><th style="padding:6px 8px;text-align:left;">O Quê</th><th style="padding:6px 8px;text-align:left;">Por Quê</th><th style="padding:6px 8px;text-align:left;">Onde</th><th style="padding:6px 8px;text-align:left;">Quando</th><th style="padding:6px 8px;text-align:left;">Quem</th><th style="padding:6px 8px;text-align:left;">Como</th><th style="padding:6px 8px;text-align:left;">Quanto</th></tr></thead><tbody>';
            actions.forEach((a, ai) => {
              const bg = ai % 2 === 0 ? '#fff' : '#f5f5f5';
              tableHtml += `<tr style="background:${bg};"><td style="padding:5px 8px;font-weight:600;border-bottom:1px solid #e5e7eb;">${a.area}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.oQue}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.porQue}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.onde}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.quando}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.quem}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.como}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${a.quanto}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            contentWrapper.innerHTML = tableHtml;
          }
        } else {
          // Regular sections with 6 blocks
          const blocks = parseSectionBlocks(section.content);
          let html = '';

          // Block 1: Contexto Teórico
          if (blocks.contexto) {
            html += `<div style="border-left: 4px solid #f87171; background: rgba(254,242,242,0.3); border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 6px;">Contexto Teórico</div>
              <p style="font-size: 11px; color: #666; margin: 0; line-height: 1.5;">${blocks.contexto}</p>
            </div>`;
          }

          // Block 2: Desenvolvimento
          if (blocks.desenvolvimento.trim()) {
            const devHtml = markdownToHtml(blocks.desenvolvimento);
            html += `<div style="font-size: 11px; line-height: 1.6; color: #555; margin-bottom: 12px;">${devHtml}</div>`;
          }

          // Block 3: Principais Pontos
          if (blocks.principaisPontos && blocks.principaisPontos.length > 0) {
            html += `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 8px;">Principais Pontos</div>
              <ol style="margin: 0; padding: 0; list-style: none;">
                ${blocks.principaisPontos.map((pt, i) => `
                  <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #1e40af; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0;">${i + 1}</span>
                    <span style="font-size: 11px; color: #555; line-height: 1.4;">${pt}</span>
                  </li>
                `).join('')}
              </ol>
            </div>`;
          }

          // Block 4: Tabela de Resultados
          if (blocks.tabela) {
            const tabelaHtml = markdownToHtml(blocks.tabela);
            html += `<div style="margin-bottom: 12px;">${tabelaHtml}</div>`;
          }

          // Block 5: Conclusão
          if (blocks.conclusao) {
            html += `<div style="border-left: 4px solid #34d399; background: rgba(240,253,244,0.3); border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 6px;">Conclusão</div>
              <p style="font-size: 11px; color: #666; margin: 0; line-height: 1.5;">${blocks.conclusao}</p>
            </div>`;
          }

          contentWrapper.innerHTML = html;
        }

        sectionEl.appendChild(contentWrapper);

        // Add separator
        const sep = document.createElement('div');
        sep.style.cssText = 'height: 1px; background: #e5e7eb; margin: 16px 28px 0 28px;';
        sectionEl.appendChild(sep);

        container.appendChild(sectionEl);
      }

      // Wait for any images/fonts to load
      await new Promise(r => setTimeout(r, 500));

      // Capture the entire container
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      // Remove offscreen container
      document.body.removeChild(container);

      // Create PDF from canvas slices
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidthMm = doc.internal.pageSize.getWidth();
      const pageHeightMm = doc.internal.pageSize.getHeight();
      const headerH = 14; // mm for header
      const footerH = 12; // mm for footer
      const contentHeightMm = pageHeightMm - headerH - footerH;

      // Calculate scaling
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const pxPerMm = imgWidthPx / pageWidthMm;
      const contentHeightPx = contentHeightMm * pxPerMm;

      const totalPages = Math.ceil(imgHeightPx / contentHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage();

        const srcY = page * contentHeightPx;
        const srcH = Math.min(contentHeightPx, imgHeightPx - srcY);

        // Create a slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidthPx;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imgWidthPx, srcH);
        ctx.drawImage(canvas, 0, srcY, imgWidthPx, srcH, 0, 0, imgWidthPx, srcH);

        const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = srcH / pxPerMm;

        doc.addImage(sliceImg, 'JPEG', 0, headerH, pageWidthMm, sliceHeightMm);

        // Header
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageWidthMm, headerH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Loyalty Academy Brasil — Plano Estratégico', 14, 9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${page + 1}/${totalPages}`, pageWidthMm - 14, 9, { align: 'right' });

        // Footer
        const fY = pageHeightMm - footerH;
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.3);
        doc.line(14, fY + 2, pageWidthMm - 14, fY + 2);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Documento gerado pela Plataforma Loyalty Academy Brasil', 14, fY + 7);
        doc.text(new Date().toLocaleDateString('pt-BR'), pageWidthMm - 14, fY + 7, { align: 'right' });
      }

      doc.save('Plano_Estrategico_Loyalty_LAB.pdf');
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
              <div className="flex items-start gap-2.5">
                <span className={cn('flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 mt-0.5', numColor)}>{num}</span>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-tight">{section.title.replace(/^\d+\.\s*/, '')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
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
