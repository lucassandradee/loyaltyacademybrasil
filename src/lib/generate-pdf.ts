import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiagnosticResult } from './diagnostic-logic';

const ESPM_RED: [number, number, number] = [168, 0, 48];
const DARK_GRAY: [number, number, number] = [51, 51, 51];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

function addHeader(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  // Red bar
  doc.setFillColor(...ESPM_RED);
  doc.rect(0, 0, w, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPM — Loyalty & RFV | Plataforma Educacional', 14, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, 12, { align: 'right' });
}

function addFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...ESPM_RED);
  doc.setLineWidth(0.5);
  doc.line(14, h - 15, w - 14, h - 15);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento gerado automaticamente pela Plataforma de Loyalty & RFV — ESPM', 14, h - 10);
  doc.text(new Date().toLocaleDateString('pt-BR'), w - 14, h - 10, { align: 'right' });
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...ESPM_RED);
  doc.rect(14, y, 3, 8, 'F');
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, y + 6);
  return y + 14;
}

function bodyText(doc: jsPDF, y: number, text: string, maxWidth: number): number {
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 14, y);
  return y + lines.length * 4.5 + 4;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - 25) {
    doc.addPage();
    return 28;
  }
  return y;
}

export function generatePDF(result: DiagnosticResult): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - 28;
  let y = 28;

  // === PAGE 1: Cover + Summary + Maturity ===
  // Title block
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(0, 18, w, 30, 'F');
  doc.setTextColor(...ESPM_RED);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Plano Estratégico de Loyalty', 14, 36);
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório personalizado baseado no diagnóstico estratégico', 14, 43);
  y = 56;

  // Sumário Executivo
  y = sectionTitle(doc, y, '1. Sumário Executivo');
  y = bodyText(doc, y, result.sumarioExecutivo, maxW);
  y += 4;

  // Maturidade
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, '2. Diagnóstico de Maturidade');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ESPM_RED);
  doc.text(`Nível: ${result.maturidade.nivel} (${result.maturidade.score}/10)`, 14, y);
  y += 6;
  y = bodyText(doc, y, result.maturidade.descricao, maxW);

  // Pontos fortes
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_GRAY);
  doc.text('Pontos Fortes:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  result.maturidade.pontosFortes.forEach(p => {
    doc.text(`• ${p}`, 18, y);
    y += 4.5;
  });
  y += 2;

  // Gaps
  doc.setFont('helvetica', 'bold');
  doc.text('Gaps Identificados:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  result.maturidade.gaps.forEach(g => {
    doc.text(`• ${g}`, 18, y);
    y += 4.5;
  });
  y += 6;

  // === Estrutura ===
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, '3. Modelo de Programa Recomendado');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_GRAY);
  doc.text(result.estrutura.tipo, 14, y);
  y += 6;
  y = bodyText(doc, y, result.estrutura.descricao, maxW);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_GRAY);
  doc.text('Mecânica de Funcionamento:', 14, y);
  y += 5;
  y = bodyText(doc, y, result.estrutura.mecanica, maxW);

  doc.setFont('helvetica', 'bold');
  doc.text('Exemplos de Mercado:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  result.estrutura.exemplos.forEach(ex => {
    const lines = doc.splitTextToSize(`• ${ex}`, maxW - 4);
    doc.text(lines, 18, y);
    y += lines.length * 4.5;
  });
  y += 6;

  // === Tiers ===
  if (result.tiers.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = sectionTitle(doc, y, '4. Estrutura de Tiers');
    result.tiers.forEach(tier => {
      y = checkPageBreak(doc, y, 30);
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(14, y - 2, maxW, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ESPM_RED);
      doc.text(tier.nome, 16, y + 3);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(tier.criterio, 50, y + 3);
      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(...DARK_GRAY);
      tier.beneficios.forEach(b => {
        doc.text(`• ${b}`, 18, y);
        y += 4.5;
      });
      y += 4;
    });
    y += 2;
  }

  // === Foco Estratégico ===
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, `5. Foco Estratégico: ${result.foco.titulo}`);
  y = bodyText(doc, y, result.foco.descricao, maxW);

  autoTable(doc, {
    startY: y,
    head: [['Prioridade', 'Ação']],
    body: result.foco.acoes.map(a => [a.prioridade, a.acao]),
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: ESPM_RED as unknown as number[], fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: DARK_GRAY as unknown as number[] },
    alternateRowStyles: { fillColor: LIGHT_GRAY as unknown as number[] },
    columnStyles: { 0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // === KPIs ===
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, '6. KPIs e Métricas de Sucesso');

  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Descrição', 'Meta']],
    body: result.kpis.map(k => [k.metrica, k.descricao, k.meta]),
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: ESPM_RED as unknown as number[], fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: DARK_GRAY as unknown as number[] },
    alternateRowStyles: { fillColor: LIGHT_GRAY as unknown as number[] },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' }, 2: { cellWidth: 35 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // === Cronograma ===
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, '7. Cronograma de Implementação');

  result.cronograma.forEach(fase => {
    y = checkPageBreak(doc, y, 35);
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(14, y - 2, maxW, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ESPM_RED);
    doc.text(fase.fase, 16, y + 3);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(fase.periodo, maxW - 10, y + 3, { align: 'right' });
    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_GRAY);
    fase.marcos.forEach(m => {
      y = checkPageBreak(doc, y, 8);
      doc.text(`• ${m}`, 18, y);
      y += 4.5;
    });
    y += 4;
  });

  // === Checklist ===
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, y, '8. Checklist de Próximos Passos');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_GRAY);
  result.checklist.forEach((item, i) => {
    y = checkPageBreak(doc, y, 8);
    doc.rect(16, y - 3, 3.5, 3.5);
    doc.text(`${i + 1}. ${item}`, 22, y);
    y += 5.5;
  });

  // Add headers and footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i, totalPages);
    addFooter(doc);
  }

  doc.save('Plano_Estrategico_Loyalty_ESPM.pdf');
}
