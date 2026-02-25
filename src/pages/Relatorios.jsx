import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { listarProdutos } from '../services/produtos'

export default function Relatorios() {
  const [tipo, setTipo] = useState('validade')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState([])
  const [erro, setErro] = useState('')
  const [titulo, setTitulo] = useState('Relatório de Validade')

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

  async function gerar() {
    setCarregando(true)
    setErro('')
    const { data, error } = await listarProdutos({ limit: 2000 })
    if (error) {
      setErro('Erro ao carregar dados.')
      setDados([])
      setCarregando(false)
      return
    }
    const todos = data || []
    const dDe = parseDate(de)
    const dAte = parseDate(ate)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    function dentroPeriodo(dt) {
      if (!dt) return false
      if (dDe && dt < dDe) return false
      if (dAte && dt > dAte) return false
      return true
    }
    let filtrados = []
    if (tipo === 'validade') {
      const inicio = dDe || hoje
      filtrados = todos.filter(p => {
        const dt = parseDate(p.validade_final || p.validade_original)
        if (!dt) return false
        if (dt < inicio) return false
        if (dAte && dt > dAte) return false
        return true
      })
    } else if (tipo === 'a_vencer') {
      const inicio = dDe || hoje
      filtrados = todos.filter(p => {
        const dt = parseDate(p.validade_final || p.validade_original)
        if (!dt) return false
        if (dt < inicio) return false
        if (dAte && dt > dAte) return false
        return true
      })
    } else if (tipo === 'estoque') {
      filtrados = todos.filter(p => {
        const criado = parseDate(p.criado_em || p.created_at || null)
        if (!dDe && !dAte) return true
        return dentroPeriodo(criado)
      })
    } else if (tipo === 'vigilancia') {
      filtrados = todos.filter(p => {
        const dt = parseDate(p.validade_final || p.validade_original)
        return dentroPeriodo(dt)
      })
    }
    setDados(filtrados)
    setCarregando(false)
  }

  useEffect(() => {
    gerar()
    if (tipo === 'validade') setTitulo('Relatório de Validade')
    else if (tipo === 'a_vencer') setTitulo('Relatório de Produtos a Vencer')
    else if (tipo === 'estoque') setTitulo('Relatório de Estoque')
    else if (tipo === 'vigilancia') setTitulo('Relatório para Vigilância Sanitária')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const total = dados.length
  const totalQuantidade = dados.reduce((acc, p) => acc + (Number(p.quantidade ?? 0) || 0), 0)

  const printRef = useRef(null)

  function exportarPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const marginX = 40
    let y = 40
    const tituloDoc = `${titulo}${de ? ` - De ${toBr(de)}` : ''}${ate ? ` - Até ${toBr(ate)}` : ''}`
    const pageWidth = doc.internal.pageSize.getWidth()
    const centerX = pageWidth / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(tituloDoc, centerX, y, { align: 'center' })
    y += 20
    doc.setFontSize(12)
    doc.text('CREVIN - Associação Esperança e Vida Nova • CNPJ: 01.600.253/0001-59', marginX, y)
    y += 12
    const itens = total
    const qtdGeral = totalQuantidade
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    if (tipo === 'estoque') {
      doc.text(`Itens: ${itens}`, marginX, y)
      doc.text(`Quantidade geral: ${qtdGeral}`, marginX + 140, y)
    } else if (tipo === 'validade' || tipo === 'a_vencer') {
      doc.text(`Itens: ${itens}`, marginX, y)
      doc.text(`Quantidade geral: ${qtdGeral}`, marginX + 140, y)
    } else {
      doc.text(`Itens: ${itens}`, marginX, y)
    }
    y += 10
    let head = []
    let body = []
    if (tipo === 'validade' || tipo === 'a_vencer') {
      head = [['Produto', 'Validade', 'Qtd.']]
      body = (dados || []).map((p) => [
        p.nome || '-',
        (p.validade_final || p.validade_original) ? toBr(p.validade_final || p.validade_original) : '-',
        String(p.quantidade ?? 0),
      ])
    } else if (tipo === 'estoque') {
      head = [['Produto', 'Marca', 'Categoria', 'Lote', 'Qtd.', 'Un.', 'Localização', 'Criado em']]
      body = (dados || []).map((p) => [
        p.nome || '-',
        p.marca || '-',
        p.categoria || '-',
        p.lote || '-',
        String(p.quantidade ?? 0),
        p.unidade_medida || '-',
        p.localizacao || '-',
        (p.criado_em || p.created_at) ? toBr(p.criado_em || p.created_at) : '-',
      ])
    } else if (tipo === 'vigilancia') {
      head = [['Produto', 'Lote', 'Manipulação', 'Validade', 'Armazenamento']]
      body = (dados || []).map((p) => [
        p.nome || '-',
        p.lote || '-',
        p.data_manipulacao ? toBr(p.data_manipulacao) : '-',
        (p.validade_final || p.validade_original) ? toBr(p.validade_final || p.validade_original) : '-',
        p.forma_armazenamento || '-',
      ])
    }
    if (!body.length) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text('Sem registros no período selecionado.', marginX, y + 12)
    } else {
      const columnStyles =
        tipo === 'validade' || tipo === 'a_vencer'
          ? { 0: { cellWidth: 300 }, 1: { cellWidth: 120, halign: 'center' }, 2: { cellWidth: 60, halign: 'right' } }
          : tipo === 'estoque'
          ? {
              4: { halign: 'right' },
              7: { halign: 'center' },
            }
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

  return (
    <div className="container">
      <div className="print-header">
        <div className="title">CREVIN - Associação Esperança e Vida Nova • CNPJ: 01.600.253/0001-59</div>
        <div className="meta">{titulo}{de ? ` • De ${toBr(de)}` : ''}{ate ? ` • Até ${toBr(ate)}` : ''}</div>
      </div>
      <div className="print-spacer-top" />
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="header-title">
          <h2>Relatórios</h2>
          <p>Central de relatórios e exportações.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="validade">Validade</option>
            <option value="a_vencer">Produtos a vencer</option>
            <option value="estoque">Estoque</option>
            <option value="vigilancia">Vigilância Sanitária</option>
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={gerar}>Gerar</button>
          <button className="btn btn-secondary" onClick={exportarPDF}>Exportar PDF</button>
          <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>Total: {total}</div>
        </div>
      </div>

      {erro ? (
        <div className="card"><div className="alert alert-error">{erro}</div></div>
      ) : carregando ? (
        <div className="card">Carregando...</div>
      ) : (
        <>
          <div className="card no-print">
            Selecione o módulo, período e clique em “Exportar PDF”. O conteúdo do relatório não será listado nesta página.
          </div>
          <div className="only-print" ref={printRef}>
            <div className="card">
              {tipo === 'validade' && (
                <div className="table-container">
                  <div className="report-title">Relatório de Validade</div>
                  <div className="report-subtitle">{de ? `De ${toBr(de)}` : ''} {ate ? `Até ${toBr(ate)}` : ''}</div>
                  <div className="report-summary">
                    <span>Itens: {total}</span>
                    <span>Quantidade geral: {totalQuantidade}</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Validade</th>
                        <th>Qtd.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.length ? dados.map(p => {
                        const dt = p.validade_final || p.validade_original
                        return (
                          <tr key={p.id}>
                            <td><span className="product-name">{p.nome}</span></td>
                            <td>{toBr(dt)}</td>
                            <td>{p.quantidade ?? 0}</td>
                          </tr>
                        )
                      }) : (
                        <tr><td colSpan={3} className="empty-table">Sem registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tipo === 'a_vencer' && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Marca</th>
                        <th>Lote</th>
                        <th>Validade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.length ? dados.map(p => (
                        <tr key={p.id}>
                          <td><span className="product-name">{p.nome}</span></td>
                          <td>{p.marca || '-'}</td>
                          <td>{p.lote || '-'}</td>
                          <td>{toBr(p.validade_final || p.validade_original)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="empty-table">Sem registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tipo === 'estoque' && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Marca</th>
                        <th>Categoria</th>
                        <th>Lote</th>
                        <th>Qtd.</th>
                        <th>Un.</th>
                        <th>Localização</th>
                        <th>Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.length ? dados.map(p => (
                        <tr key={p.id}>
                          <td><span className="product-name">{p.nome}</span></td>
                          <td>{p.marca || '-'}</td>
                          <td>{p.categoria || '-'}</td>
                          <td>{p.lote || '-'}</td>
                          <td>{p.quantidade ?? '-'}</td>
                          <td>{p.unidade_medida || '-'}</td>
                          <td>{p.localizacao || '-'}</td>
                          <td>{toBr(p.criado_em || p.created_at)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={8} className="empty-table">Sem registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tipo === 'vigilancia' && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Lote</th>
                        <th>Manipulação</th>
                        <th>Validade</th>
                        <th>Armazenamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.length ? dados.map(p => (
                        <tr key={p.id}>
                          <td><span className="product-name">{p.nome}</span></td>
                          <td>{p.lote || '-'}</td>
                          <td>{toBr(p.data_manipulacao)}</td>
                          <td>{toBr(p.validade_final || p.validade_original)}</td>
                          <td>{p.forma_armazenamento || '-'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="empty-table">Sem registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <div className="print-spacer-bottom" />
      <div className="print-footer">
        Av. Floriano Peixoto, Qd. 63, Lt 12, Setor Tradicional, Planaltina - Brasília/DF.
      </div>
    </div>
  )
}
