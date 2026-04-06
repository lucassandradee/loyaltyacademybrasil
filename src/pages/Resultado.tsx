import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, FileText, Shield, Target, Lightbulb, Award, Calendar, ListChecks, DollarSign, Megaphone, Settings, Users, ChevronLeft, ChevronRight, LayoutGrid, BookOpen, Filter, CheckCircle2 } from 'lucide-react';
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
    const periodMatch = part.match(/\*\*Período:\*\*\s*(.+)/i) || part.match(/Período:\s*(.+)/i) || part.match(/\*\*(.+?meses?.*?)\*\*/i);
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
  // skip header row
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

// ─── Section renderer ───

function SectionContent({ section }: { section: PlanSection }) {
  if (section.id === 'cronograma') return <TimelineView content={section.content} />;
  if (section.id === 'plano5w2h') return <ActionPlan5W2H content={section.content} />;

  const blockConfig: Record<string, { border: string; icon: any; label: string }> = {
    'contexto teorico': { border: 'border-l-red-400', icon: BookOpen, label: 'Contexto Teórico' },
    'nossa recomendacao': { border: 'border-l-emerald-400', icon: Target, label: 'Nossa Recomendação' },
  };

  // Split by marker headers (with or without emoji, accent-insensitive) — no more "Resumo dos Dados"
  const markerRegex = /^## (?:📚\s*)?Contexto Te[oó]rico|^## (?:🎯\s*)?Nossa Recomenda[cç][aã]o/gmi;

  const content = section.content;
  const markers: { index: number; key: string; fullMatch: string }[] = [];
  let m;
  while ((m = markerRegex.exec(content)) !== null) {
    const lower = m[0].replace(/## (?:📚|📊|🎯)?\s*/i, '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let key = '';
    if (lower.includes('contexto')) key = 'contexto teorico';
    else if (lower.includes('recomenda')) key = 'nossa recomendacao';
    if (key) markers.push({ index: m.index, key, fullMatch: m[0] });
  }

  // Build segments: each segment is either a marker block or free content
  const segments: { type: 'marker' | 'content'; key?: string; text: string }[] = [];
  let cursor = 0;
  for (const mk of markers) {
    if (mk.index > cursor) {
      segments.push({ type: 'content', text: content.slice(cursor, mk.index) });
    }
    // Find end of marker block: next ## header or next marker
    const afterHeader = mk.index + mk.fullMatch.length;
    const nextHeaderMatch = content.slice(afterHeader).match(/\n## /);
    const endIdx = nextHeaderMatch ? afterHeader + nextHeaderMatch.index! : content.length;
    // The marker block is only the text until the next ## header
    const blockText = content.slice(afterHeader, endIdx).replace(/^\n+/, '');
    // But take only the first paragraph as the marker content
    const firstParaEnd = blockText.indexOf('\n\n');
    const markerText = firstParaEnd > 0 ? blockText.slice(0, firstParaEnd).trim() : blockText.trim();
    segments.push({ type: 'marker', key: mk.key, text: markerText });
    // Everything after the first paragraph goes back as content
    if (firstParaEnd > 0) {
      const remaining = blockText.slice(firstParaEnd).trim();
      if (remaining) segments.push({ type: 'content', text: remaining });
    }
    cursor = endIdx;
  }
  if (cursor < content.length) {
    segments.push({ type: 'content', text: content.slice(cursor) });
  }

  // If no markers found, render everything as plain content
  if (markers.length === 0) {
    const parts = parseDiagrams(content);
    return (
      <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_strong]:text-foreground">
        {parts.map((part, i) => {
          if (typeof part === 'string') return <div key={i} dangerouslySetInnerHTML={{ __html: markdownToHtml(part) }} />;
          return <DiagramRenderer key={i} diagram={part} />;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((seg, i) => {
        if (seg.type === 'marker' && seg.key) {
          const cfg = blockConfig[seg.key];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <div key={i} className={cn('border-l-4 rounded-r-lg px-4 py-3 bg-muted/20', cfg.border)}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{seg.text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}</p>
            </div>
          );
        }

        // Regular content
        const parts = parseDiagrams(seg.text);
        return (
          <div key={i} className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_strong]:text-foreground">
            {parts.map((part, j) => {
              if (typeof part === 'string') return <div key={j} dangerouslySetInnerHTML={{ __html: markdownToHtml(part) }} />;
              return <DiagramRenderer key={j} diagram={part} />;
            })}
          </div>
        );
      })}
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

    // Extract company data from diagnostic answers
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
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = doc.internal.pageSize.getWidth();
      const maxW = w - 28;
      const BRAND_BLUE: [number, number, number] = [30, 64, 175];
      const DARK_GRAY: [number, number, number] = [51, 51, 51];
      const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

      const checkBreak = (yy: number, needed: number) => {
        if (yy + needed > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); return 28; }
        return yy;
      };

      const stripEmojis = (text: string) => text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]/gu, '').trim();

      const renderTextBlock = (text: string, startY: number): number => {
        let y = startY;
        const clean = stripEmojis(text)
          .replace(/^\|.*\|$/gm, '')
          .replace(/^[-:| ]+$/gm, '')
          .replace(/<!--.*?-->/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (!clean) return y;

        const pdfLines = clean.split('\n');
        for (const rawLine of pdfLines) {
          const trimmed = rawLine.trim();
          if (!trimmed) { y += 2; continue; }

          // Sub-headers (## or ###)
          if (/^#{2,4}\s+/.test(trimmed)) {
            const headerText = trimmed.replace(/^#{2,4}\s+/, '').replace(/\*\*/g, '');
            y = checkBreak(y, 8);
            y += 3;
            doc.setTextColor(...DARK_GRAY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(stripEmojis(headerText), 14, y);
            y += 6;
            continue;
          }

          // Numbered list items: 1. **Title** — description
          const numberedMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*[—–-]?\s*(.*)/);
          if (numberedMatch) {
            y = checkBreak(y, 8);
            doc.setTextColor(...DARK_GRAY);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`${numberedMatch[1]}. ${numberedMatch[2]}`, 16, y);
            y += 4.2;
            if (numberedMatch[3]) {
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(80, 80, 80);
              const descLines = doc.splitTextToSize(numberedMatch[3], maxW - 6);
              for (const dl of descLines) { y = checkBreak(y, 5); doc.text(dl, 20, y); y += 4.2; }
            }
            continue;
          }

          // Bullet items
          if (/^[-•]\s+/.test(trimmed)) {
            y = checkBreak(y, 5);
            const bulletText = trimmed.replace(/^[-•]\s+/, '');
            const boldMatch = bulletText.match(/^\*\*(.+?)\*\*\s*(.*)/);
            if (boldMatch) {
              doc.setTextColor(...DARK_GRAY);
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.text(`• ${boldMatch[1]}`, 16, y);
              y += 4.2;
              if (boldMatch[2]) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                const subLines = doc.splitTextToSize(boldMatch[2], maxW - 6);
                for (const sl of subLines) { y = checkBreak(y, 5); doc.text(sl, 20, y); y += 4.2; }
              }
            } else {
              doc.setTextColor(80, 80, 80);
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const bLines = doc.splitTextToSize(`• ${bulletText}`, maxW - 2);
              for (const bl of bLines) { y = checkBreak(y, 5); doc.text(bl, 16, y); y += 4.2; }
            }
            continue;
          }

          // Regular paragraph
          const plainLine = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const wrappedLines = doc.splitTextToSize(plainLine, maxW);
          for (const wl of wrappedLines) { y = checkBreak(y, 5); doc.text(wl, 14, y); y += 4.2; }
        }
        return y;
      };

      const renderMarkerBlock = (label: string, text: string, color: [number, number, number], startY: number): number => {
        let y = checkBreak(startY, 18);
        doc.setFillColor(...color);
        doc.rect(14, y - 1, 2.5, 10, 'F');
        doc.setTextColor(...color);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), 19, y + 3);
        y += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const clean = stripEmojis(text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();
        const lines = doc.splitTextToSize(clean, maxW - 5);
        for (const line of lines) { y = checkBreak(y, 5); doc.text(line, 19, y); y += 4; }
        return y + 3;
      };

      const renderTable = (tableBlock: string, startY: number): number => {
        let y = startY;
        const tRows = tableBlock.trim().split('\n').filter(r => r.trim().startsWith('|'));
        const isSepar = (r: string) => /^\|[\s-:]+\|$/.test(r.trim().replace(/\|/g, '|'));
        const dRows = tRows.filter(r => !isSepar(r));
        if (dRows.length < 2) return y;
        const parse = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());
        y = checkBreak(y, 20);
        autoTable(doc, {
          startY: y,
          head: [parse(dRows[0])],
          body: dRows.slice(1).map(r => parse(r)),
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [...DARK_GRAY] as [number, number, number] },
          alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
        });
        return (doc as any).lastAutoTable.finalY + 6;
      };

      const renderDiagram = (type: string, items: string[], startY: number): number => {
        let y = checkBreak(startY, 20);
        const typeLabel = type === 'pyramid' ? 'Hierarquia' : type === 'funnel' ? 'Funil' : type === 'flow' ? 'Fluxo' : type === 'gauge' ? 'Indicador' : 'Comparativo';
        autoTable(doc, {
          startY: y,
          head: [[typeLabel, 'Detalhe']],
          body: items.map(item => {
            const parts = item.includes(':') ? [item.split(':')[0].trim(), item.split(':').slice(1).join(':').trim()] : [item, ''];
            return parts;
          }),
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [...DARK_GRAY] as [number, number, number] },
          alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
          columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
        });
        return (doc as any).lastAutoTable.finalY + 6;
      };

      // Cover
      doc.setFillColor(...BRAND_BLUE);
      doc.rect(0, 0, w, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Plano Estrategico de Loyalty', 14, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatorio personalizado - Framework LAB', 14, 38);
      doc.text(new Date().toLocaleDateString('pt-BR'), 14, 45);
      let y = 60;

      for (const section of sections) {
        y = checkBreak(y, 20);
        // Section title
        doc.setFillColor(...BRAND_BLUE);
        doc.rect(14, y, 3, 8, 'F');
        doc.setTextColor(...DARK_GRAY);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        const cleanTitle = stripEmojis(section.title);
        const titleLines = doc.splitTextToSize(cleanTitle, maxW - 10);
        titleLines.forEach((line: string) => { doc.text(line, 20, y + 6); y += 6; });
        y += 8;

        // 5W2H
        if (section.id === 'plano5w2h') {
          const actions = parse5W2H(section.content);
          if (actions.length > 0) {
            autoTable(doc, {
              startY: y,
              head: [['Area', 'O Que', 'Por Que', 'Onde', 'Quando', 'Quem', 'Como', 'Quanto']],
              body: actions.map(a => [a.area, a.oQue, a.porQue, a.onde, a.quando, a.quem, a.como, a.quanto]),
              margin: { left: 14, right: 14 },
              headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 7, cellPadding: 2 },
              bodyStyles: { fontSize: 7, textColor: [...DARK_GRAY] as [number, number, number], cellPadding: 2 },
              alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
              columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold' } },
              styles: { overflow: 'linebreak' },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
            continue;
          }
        }

        // Cronograma
        if (section.id === 'cronograma') {
          const phases = parseTimeline(section.content);
          if (phases.length > 0) {
            const rows: string[][] = [];
            phases.forEach(p => {
              p.milestones.forEach((m, mi) => {
                rows.push([mi === 0 ? p.name : '', mi === 0 ? p.period : '', m]);
              });
              if (p.milestones.length === 0) rows.push([p.name, p.period, '—']);
            });
            autoTable(doc, {
              startY: y,
              head: [['Fase', 'Periodo', 'Marco']],
              body: rows,
              margin: { left: 14, right: 14 },
              headStyles: { fillColor: [...BRAND_BLUE] as [number, number, number], fontSize: 8 },
              bodyStyles: { fontSize: 8, textColor: [...DARK_GRAY] as [number, number, number] },
              alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
              columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 30 } },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
            continue;
          }
        }

        // Process content sequentially: split into text, tables, diagrams, markers
        const rawContent = section.content;
        const chunks: { type: 'text' | 'table' | 'diagram' | 'marker'; data: string; items?: string[]; dType?: string; label?: string }[] = [];

        // Find all tables
        const tableRegex2 = /(\|.+\|(?:\r?\n)?){3,}/g;
        // Find all diagrams
        const diagramRegex2 = /<!--\s*DIAGRAM:\s*(pyramid|funnel|flow|comparison|gauge)\s*\|(.+?)-->/g;
        // Find all markers
        const markerRegex2 = /^## (?:📚\s*)?Contexto Te[oó]rico|^## (?:🎯\s*)?Nossa Recomenda[cç][aã]o/gmi;

        interface ContentSlice { start: number; end: number; type: 'table' | 'diagram' | 'marker'; raw: string; dType?: string; items?: string[]; label?: string }
        const slices: ContentSlice[] = [];

        let tm;
        while ((tm = tableRegex2.exec(rawContent)) !== null) {
          slices.push({ start: tm.index, end: tm.index + tm[0].length, type: 'table', raw: tm[0] });
        }
        while ((tm = diagramRegex2.exec(rawContent)) !== null) {
          const dItems = tm[2].split('|').map(s => s.trim()).filter(Boolean);
          slices.push({ start: tm.index, end: tm.index + tm[0].length, type: 'diagram', raw: tm[0], dType: tm[1], items: dItems });
        }
        while ((tm = markerRegex2.exec(rawContent)) !== null) {
          const lower = tm[0].replace(/## (?:📚|📊|🎯)?\s*/i, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          let lbl = '';
          if (lower.includes('contexto')) lbl = 'Contexto Teorico';
          else if (lower.includes('recomenda')) lbl = 'Nossa Recomendacao';
          // Find end: next line break then next ## or end
          const afterH = tm.index + tm[0].length;
          const nextH = rawContent.slice(afterH).match(/\n## /);
          const endIdx = nextH ? afterH + nextH.index! : rawContent.length;
          // Take only first paragraph
          const blockText = rawContent.slice(afterH, endIdx).replace(/^\n+/, '');
          const fpEnd = blockText.indexOf('\n\n');
          const markerContent = fpEnd > 0 ? blockText.slice(0, fpEnd).trim() : blockText.trim();
          if (lbl) slices.push({ start: tm.index, end: fpEnd > 0 ? afterH + fpEnd : endIdx, type: 'marker', raw: markerContent, label: lbl });
        }

        // Sort by position
        slices.sort((a, b) => a.start - b.start);

        // Remove overlapping slices
        const cleanSlices: ContentSlice[] = [];
        let lastEnd = 0;
        for (const s of slices) {
          if (s.start >= lastEnd) { cleanSlices.push(s); lastEnd = s.end; }
        }

        // Build chunks
        let cursor2 = 0;
        for (const s of cleanSlices) {
          if (s.start > cursor2) chunks.push({ type: 'text', data: rawContent.slice(cursor2, s.start) });
          if (s.type === 'table') chunks.push({ type: 'table', data: s.raw });
          else if (s.type === 'diagram') chunks.push({ type: 'diagram', data: '', dType: s.dType, items: s.items });
          else if (s.type === 'marker') chunks.push({ type: 'marker', data: s.raw, label: s.label });
          cursor2 = s.end;
        }
        if (cursor2 < rawContent.length) chunks.push({ type: 'text', data: rawContent.slice(cursor2) });

        // Render chunks sequentially
        const MARKER_COLORS: Record<string, [number, number, number]> = {
          'Contexto Teorico': [220, 38, 38],
          'Nossa Recomendacao': [5, 150, 105],
        };

        for (const chunk of chunks) {
          if (chunk.type === 'text') {
            y = renderTextBlock(chunk.data, y);
            y += 2;
          } else if (chunk.type === 'table') {
            y = renderTable(chunk.data, y);
          } else if (chunk.type === 'diagram' && chunk.dType && chunk.items) {
            y = renderDiagram(chunk.dType, chunk.items, y);
          } else if (chunk.type === 'marker' && chunk.label) {
            const color = MARKER_COLORS[chunk.label] || DARK_GRAY;
            y = renderMarkerBlock(chunk.label, chunk.data, color, y);
          }
        }
        y += 8;
      }

      // Headers & footers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          doc.setFillColor(...BRAND_BLUE);
          doc.rect(0, 0, w, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Loyalty Academy Brasil - Plano Estrategico', 14, 9);
          doc.text(`${i}/${totalPages}`, w - 14, 9, { align: 'right' });
        }
        const h = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...BRAND_BLUE);
        doc.setLineWidth(0.3);
        doc.line(14, h - 12, w - 14, h - 12);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Documento gerado pela Plataforma Loyalty Academy Brasil', 14, h - 8);
      }

      doc.save('Plano_Estrategico_Loyalty_LAB.pdf');
      toast({ title: 'PDF gerado com sucesso!', description: `${totalPages} paginas exportadas.` });
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

      {/* Canvas Mode — Business Model Canvas layout */}
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
            {/* Row 1: Sumário (full width) */}
            <div className="grid grid-cols-1">
              <CanvasCell id="sumario" className="rounded-none border-0 border-b-2 border-border/60 min-h-[80px]" />
            </div>
            {/* Row 2: Objetivos | Diagnóstico de Maturidade */}
            <div className="grid grid-cols-2">
              <CanvasCell id="objetivos" className="rounded-none border-0 border-r-2 border-b-2 border-border/60 min-h-[90px]" />
              <CanvasCell id="maturidade" className="rounded-none border-0 border-b-2 border-border/60 min-h-[90px]" />
            </div>
            {/* Row 3: Estratégia | (Benefícios + Segmentação) | (Canais + Operações) | Estrutura */}
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
            {/* Row 4: Custos | Cronograma | Plano de Ação */}
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
                <CardTitle className="text-xl">{currentSection.title}</CardTitle>
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
