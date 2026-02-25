import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { listarProdutos } from '../services/produtos'

export default function Relatorios() {
  const [deVal, setDeVal] = useState('')
  const [ateVal, setAteVal] = useState('')
  const [deVencer, setDeVencer] = useState('')
  const [ateVencer, setAteVencer] = useState('')
  const [deEst, setDeEst] = useState('')
  const [ateEst, setAteEst] = useState('')
  const [deVig, setDeVig] = useState('')
  const [ateVig, setAteVig] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  function parseDate(v) {
    if (!v) return null
    const d = new Date(v)
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  function toBr(d) {
    if (!d) return '-'
    const dx = new Date(d)
    if (isNaN(dx.getTime())) return '-'
    return dx.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function getProdutos() {
    const { data, error } = await listarProdutos({ limit: 5000 })
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  }

  function filtrarPorPeriodo(lista, getter, dIni, dFim, inicioHojeSeVazio = false) {
    const dDe = parseDate(dIni)
    const dAte = parseDate(dFim)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const start = inicioHojeSeVazio ? (dDe || hoje) : dDe
    return lista.filter((p) => {
      const dtRaw = getter(p)
      const dt = parseDate(dtRaw)
      if (!dt) return false
      if (start && dt < start) return false
      if (dAte && dt > dAte) return false
      return true
    })
  }

  function exportarPDFGenerico({ titulo, head, body, tipo }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const marginX = 40
    let y = 40
    const pageWidth = doc.internal.pageSize.getWidth()
    const centerX = pageWidth / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(titulo, centerX, y, { align: 'center' })
    y += 20
    doc.setFontSize(12)
    doc.text('CREVIN - Associação Esperança e Vida Nova • CNPJ: 01.600.253/0001-59', marginX, y)
    y += 12
    const itens = body.length
    const qtdGeral = body.reduce((acc, row) => {
      const last = row[row.length - 1]
      const maybeQtd = Number(String(last).replace(/\D+/g, '')) || 0
      return acc + maybeQtd
    }, 0)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.text(`Itens: ${itens}`, marginX, y)
    if (tipo === 'estoque' || tipo === 'validade' || tipo === 'a_vencer') doc.text(`Quantidade geral: ${qtdGeral}`, marginX + 140, y)
    y += 10
    if (!body.length) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text('Sem registros no período selecionado.', marginX, y + 12)
    } else {
      const columnStyles =
        tipo === 'validade' || tipo === 'a_vencer'
          ? { 0: { cellWidth: 300 }, 1: { cellWidth: 120, halign: 'center' }, 2: { cellWidth: 60, halign: 'right' } }
          : tipo === 'estoque'
          ? { 4: { halign: 'right' }, 7: { halign: 'center' } }
          : { 2: { halign: 'center' }, 3: { halign: 'center' } }
      autoTable(doc, {
        startY: y,
        head: head,
        body,
        styles: { fontSize: 9, cellPadding: 6, halign: 'left' },
        headStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold' },
        columnStyles,
        margin: { left: marginX, right: marginX },
        didDrawPage: (data) => {
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()
          doc.setFontSize(10)
          doc.setTextColor(120)
          doc.text(
            'Av. Floriano Peixoto, Qd. 63, Lt 12, Setor Tradicional, Planaltina - Brasília/DF.',
            marginX,
            pageHeight - 24
          )
          const pageNo = doc.internal.getNumberOfPages()
          doc.text(`Página ${data.pageNumber} / ${pageNo}`, pageWidth - marginX - 80, pageHeight - 24)
        },
      })
    }
    const base = tipo === 'validade' ? 'relatorio_validade' : tipo === 'a_vencer' ? 'relatorio_a_vencer' : tipo === 'estoque' ? 'relatorio_estoque' : 'relatorio_vigilancia'
    const fileName = `${base}_${new Date().toISOString().slice(0,10)}.pdf`
    doc.save(fileName)
  }

  async function gerarValidade() {
    setBusy(true); setErro('')
    const { data, error } = await getProdutos()
    if (error) { setErro('Erro ao carregar dados.'); setBusy(false); return }
    const filtrados = filtrarPorPeriodo(data, (p) => p.validade_final || p.validade_original, deVal, ateVal, true)
    const head = [['Produto', 'Validade', 'Qtd.']]
    const body = filtrados.map((p) => [p.nome || '-', (p.validade_final || p.validade_original) ? toBr(p.validade_final || p.validade_original) : '-', String(p.quantidade ?? 0)])
    const faixa = `${deVal ? `De ${toBr(deVal)}` : ''}${ateVal ? ` • Até ${toBr(ateVal)}` : ''}`
    exportarPDFGenerico({ titulo: `Relatório de Validade ${faixa}`, head, body, tipo: 'validade' })
    setBusy(false)
  }
  async function gerarAVencer() {
    setBusy(true); setErro('')
    const { data, error } = await getProdutos()
    if (error) { setErro('Erro ao carregar dados.'); setBusy(false); return }
    const filtrados = filtrarPorPeriodo(data, (p) => p.validade_final || p.validade_original, deVencer, ateVencer, true)
    const head = [['Produto', 'Validade', 'Qtd.']]
    const body = filtrados.map((p) => [p.nome || '-', (p.validade_final || p.validade_original) ? toBr(p.validade_final || p.validade_original) : '-', String(p.quantidade ?? 0)])
    const faixa = `${deVencer ? `De ${toBr(deVencer)}` : ''}${ateVencer ? ` • Até ${toBr(ateVencer)}` : ''}`
    exportarPDFGenerico({ titulo: `Relatório de Produtos a Vencer ${faixa}`, head, body, tipo: 'a_vencer' })
    setBusy(false)
  }
  async function gerarEstoque() {
    setBusy(true); setErro('')
    const { data, error } = await getProdutos()
    if (error) { setErro('Erro ao carregar dados.'); setBusy(false); return }
    const filtrados = !deEst && !ateEst ? data : filtrarPorPeriodo(data, (p) => p.criado_em || p.created_at, deEst, ateEst, false)
    const head = [['Produto', 'Marca', 'Categoria', 'Lote', 'Qtd.', 'Un.', 'Localização', 'Criado em']]
    const body = filtrados.map((p) => [p.nome || '-', p.marca || '-', p.categoria || '-', p.lote || '-', String(p.quantidade ?? 0), p.unidade_medida || '-', p.localizacao || '-', (p.criado_em || p.created_at) ? toBr(p.criado_em || p.created_at) : '-'])
    const faixa = `${deEst ? `De ${toBr(deEst)}` : ''}${ateEst ? ` • Até ${toBr(ateEst)}` : ''}`
    exportarPDFGenerico({ titulo: `Relatório de Estoque ${faixa}`, head, body, tipo: 'estoque' })
    setBusy(false)
  }
  async function gerarVigilancia() {
    setBusy(true); setErro('')
    const { data, error } = await getProdutos()
    if (error) { setErro('Erro ao carregar dados.'); setBusy(false); return }
    const filtrados = filtrarPorPeriodo(data, (p) => p.validade_final || p.validade_original, deVig, ateVig, false)
    const head = [['Produto', 'Lote', 'Manipulação', 'Validade', 'Armazenamento']]
    const body = filtrados.map((p) => [p.nome || '-', p.lote || '-', p.data_manipulacao ? toBr(p.data_manipulacao) : '-', (p.validade_final || p.validade_original) ? toBr(p.validade_final || p.validade_original) : '-', p.forma_armazenamento || '-'])
    const faixa = `${deVig ? `De ${toBr(deVig)}` : ''}${ateVig ? ` • Até ${toBr(ateVig)}` : ''}`
    exportarPDFGenerico({ titulo: `Relatório para Vigilância Sanitária ${faixa}`, head, body, tipo: 'vigilancia' })
    setBusy(false)
  }

  return (
    <div className="container">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="header-title">
          <h2>Relatórios</h2>
          <p>Escolha um módulo e gere o PDF específico.</p>
        </div>
      </div>

      {erro ? <div className="card"><div className="alert alert-error">{erro}</div></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <div className="card">
          <div className="report-title">Validade</div>
          <div className="report-subtitle">Produtos por data de validade.</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De</label>
              <input type="date" value={deVal} onChange={(e) => setDeVal(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até</label>
              <input type="date" value={ateVal} onChange={(e) => setAteVal(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={gerarValidade}>Gerar PDF</button>
        </div>

        <div className="card">
          <div className="report-title">Produtos a Vencer</div>
          <div className="report-subtitle">Itens com validade no período.</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De</label>
              <input type="date" value={deVencer} onChange={(e) => setDeVencer(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até</label>
              <input type="date" value={ateVencer} onChange={(e) => setAteVencer(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={gerarAVencer}>Gerar PDF</button>
        </div>

        <div className="card">
          <div className="report-title">Estoque</div>
          <div className="report-subtitle">Listagem geral com data de criação.</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De</label>
              <input type="date" value={deEst} onChange={(e) => setDeEst(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até</label>
              <input type="date" value={ateEst} onChange={(e) => setAteEst(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={gerarEstoque}>Gerar PDF</button>
        </div>

        <div className="card">
          <div className="report-title">Vigilância Sanitária</div>
          <div className="report-subtitle">Com dados de manipulação, validade e armazenamento.</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De</label>
              <input type="date" value={deVig} onChange={(e) => setDeVig(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até</label>
              <input type="date" value={ateVig} onChange={(e) => setAteVig(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={gerarVigilancia}>Gerar PDF</button>
        </div>
      </div>
    </div>
  )
}
