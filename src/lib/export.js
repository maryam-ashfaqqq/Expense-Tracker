import { budgetStatus, monthTotals } from './analytics.js'
import { formatMonth, formatShortDate, pkr, toIsoDate } from './format.js'

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function buildReport(transactions, budgets, month, userName) {
  const totals = monthTotals(transactions, budgets, month)
  const rows = transactions
    .filter((item) => item.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  const budgetsRows = budgetStatus(transactions, budgets, month).filter((item) => item.budget > 0 || item.spent > 0)
  return {
    month,
    title: formatMonth(month),
    userName: userName || 'Aurum member',
    generated: formatShortDate(toIsoDate()) + ' ' + toIsoDate().slice(0, 4),
    totals,
    rows,
    budgetsRows,
  }
}

export function reportFilename(month, extension) {
  return `aurum-${formatMonth(month).toLowerCase().replace(/\s+/g, '-')}.${extension}`
}

export function reportToCsv(report) {
  const lines = [
    ['Report', report.title].map(csvCell).join(','),
    ['Prepared for', report.userName].map(csvCell).join(','),
    ['Income', report.totals.income].map(csvCell).join(','),
    ['Spent', report.totals.spent].map(csvCell).join(','),
    ['Net', report.totals.net].map(csvCell).join(','),
    ['Remaining budget', report.totals.remaining].map(csvCell).join(','),
    '',
    ['Date', 'Type', 'Title', 'Category', 'Amount', 'Payment method', 'Note', 'Recurring'].map(csvCell).join(','),
    ...report.rows.map((item) =>
      [item.date, item.type, item.title, item.category, item.amount, item.method, item.note, item.recurringId ? 'Yes' : 'No']
        .map(csvCell)
        .join(','),
    ),
  ]
  return `\uFEFF${lines.join('\n')}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadMonthlyCsv(report) {
  const blob = new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, reportFilename(report.month, 'csv'))
}

function clip(doc, text, width) {
  let value = String(text || '')
  if (doc.getTextWidth(value) <= width) return value
  while (value.length > 1 && doc.getTextWidth(`${value}...`) > width) value = value.slice(0, -1)
  return `${value}...`
}

export async function pdfBytes(report) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 36
  let y = 0

  const header = () => {
    doc.setFillColor(16, 63, 53)
    doc.rect(0, 0, width, 78, 'F')
    doc.setTextColor(198, 161, 91)
    doc.setFont('times', 'italic')
    doc.setFontSize(22)
    doc.text('Aurum.', margin, 34)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(247, 247, 242)
    doc.text('Monthly statement', margin, 54)
    doc.text(report.title, width - margin, 34, { align: 'right' })
    doc.setTextColor(198, 161, 91)
    doc.text(report.userName, width - margin, 54, { align: 'right' })
    y = 102
  }

  const ensure = (needed) => {
    if (y + needed <= height - 40) return
    doc.addPage()
    header()
  }

  header()
  doc.setTextColor(92, 111, 102)
  doc.setFontSize(10)
  doc.text(`Generated ${report.generated}  ·  Figures in Pakistani rupees  ·  Aurum private ledger`, margin, y)
  y += 22

  const cards = [
    ['Income', pkr(report.totals.income)],
    ['Spent', pkr(report.totals.spent)],
    ['Net', pkr(report.totals.net)],
    ['Remaining', pkr(report.totals.remaining)],
  ]
  const gap = 10
  const cardW = (width - margin * 2 - gap * 3) / 4
  cards.forEach((card, index) => {
    const x = margin + index * (cardW + gap)
    doc.setFillColor(247, 247, 242)
    doc.roundedRect(x, y, cardW, 52, 6, 6, 'F')
    doc.setFontSize(8)
    doc.setTextColor(138, 106, 46)
    doc.text(card[0].toUpperCase(), x + 10, y + 18)
    doc.setFontSize(12)
    doc.setTextColor(31, 48, 42)
    doc.text(card[1], x + 10, y + 38)
  })
  y += 72

  doc.setFontSize(12)
  doc.setTextColor(31, 48, 42)
  doc.text('Budgets', margin, y)
  y += 14
  const budgetCols = [150, 90, 90, 70]
  const budgetHead = ['Category', 'Budget', 'Spent', 'Used']
  doc.setFillColor(16, 63, 53)
  doc.rect(margin, y, width - margin * 2, 18, 'F')
  doc.setTextColor(247, 247, 242)
  doc.setFontSize(8)
  let x = margin + 8
  budgetHead.forEach((label, index) => {
    doc.text(label, x, y + 12)
    x += budgetCols[index]
  })
  y += 18
  report.budgetsRows.forEach((item, index) => {
    ensure(18)
    if (index % 2 === 0) {
      doc.setFillColor(247, 247, 242)
      doc.rect(margin, y, width - margin * 2, 18, 'F')
    }
    const used = item.budget > 0 ? `${Math.round(item.ratio * 100)}%` : '—'
    const values = [item.category, pkr(item.budget), pkr(item.spent), used]
    doc.setTextColor(31, 48, 42)
    x = margin + 8
    values.forEach((value, col) => {
      doc.text(String(value), x, y + 12)
      x += budgetCols[col]
    })
    y += 18
  })

  y += 18
  ensure(36)
  doc.setFontSize(12)
  doc.setTextColor(31, 48, 42)
  doc.text('Transactions', margin, y)
  y += 14
  const cols = [
    { label: 'Date', w: 72 },
    { label: 'Title', w: 180 },
    { label: 'Category', w: 80 },
    { label: 'Method', w: 68 },
    { label: 'Amount', w: 90 },
  ]
  const drawTxHead = () => {
    doc.setFillColor(16, 63, 53)
    doc.rect(margin, y, width - margin * 2, 18, 'F')
    doc.setTextColor(247, 247, 242)
    doc.setFontSize(8)
    let cursor = margin + 8
    cols.forEach((col) => {
      doc.text(col.label, cursor, y + 12)
      cursor += col.w
    })
    y += 18
  }
  drawTxHead()
  if (!report.rows.length) {
    doc.setTextColor(92, 111, 102)
    doc.text('No transactions recorded for this month.', margin + 8, y + 16)
    y += 24
  }
  report.rows.forEach((item, index) => {
    if (y + 18 > height - 40) {
      doc.addPage()
      header()
      drawTxHead()
    }
    if (index % 2 === 0) {
      doc.setFillColor(247, 247, 242)
      doc.rect(margin, y, width - margin * 2, 18, 'F')
    }
    const sign = item.type === 'income' ? '+' : '-'
    const values = [`${formatShortDate(item.date)} ${item.date.slice(0, 4)}`, item.title, item.category, item.method, `${sign}${pkr(item.amount)}`]
    let cursor = margin + 8
    values.forEach((value, col) => {
      if (col === 4) doc.setTextColor(...(item.type === 'income' ? [38, 150, 109] : [216, 92, 92]))
      else doc.setTextColor(31, 48, 42)
      doc.text(clip(doc, value, cols[col].w - 10), cursor, y + 12)
      cursor += cols[col].w
    })
    y += 18
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(138, 106, 46)
    doc.text(`Aurum ledger  ·  ${report.title}  ·  Page ${page} of ${pages}`, margin, height - 22)
  }

  return doc.output('arraybuffer')
}

export async function downloadMonthlyPdf(report) {
  const bytes = await pdfBytes(report)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  downloadBlob(blob, reportFilename(report.month, 'pdf'))
}
