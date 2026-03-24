import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import { listarProdutos } from '../services/produtos'
import { registrarEtiquetas } from '../services/etiquetas'

export default function Etiquetas() {
  const location = useLocation()
  const preselectRef = useRef(null)
  const storageKey = 'nutricrevin_etiquetas_pdf_last_download'
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [colunas, setColunas] = useState(3)
  const [preview, setPreview] = useState(null)
  const [previewPdfOpen, setPreviewPdfOpen] = useState(false)
  const [lastPdfDownload, setLastPdfDownload] = useState('')
  const [pdfFeedback, setPdfFeedback] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await listarProdutos({ search: busca, limit: 100 })
    setProdutos(data || [])
    setCarregando(false)
  }, [busca])

  useEffect(() => {
    try {
      setLastPdfDownload(localStorage.getItem(storageKey) || '')
    } catch {
      setLastPdfDownload('')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 400)
    return () => clearTimeout(t)
  }, [carregar])

  function validadePreferencial(p) {
    return p.validade_final || p.validade_original || null
  }

  function formatDate(value) {
    if (!value) return '-'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const addProduto = useCallback((p) => {
    const novoSel = {
      id: p.id,
      nome: p.nome,
      marca: p.marca || '',
      lote: p.lote || '',
      validade: p.validade_final || p.validade_original || null,
      manipulacao: p.data_manipulacao || '',
      armazenamento: p.forma_armazenamento || '',
      unidade: p.unidade_medida || '',
      quantidadeProduto: p.quantidade ?? '',
      qtd: 1,
    }
    setPreview(novoSel)
    setSelecionados((prev) => {
      if (prev.some((x) => x.id === p.id && x.lote === (p.lote || ''))) return prev
      return [
        ...prev,
        novoSel,
      ]
    })
  }, [])

  useEffect(() => {
    const p = location.state?.produtoParaEtiqueta
    if (!p?.id) return
    if (preselectRef.current === p.id) return
    preselectRef.current = p.id
    addProduto(p)
  }, [location.state, addProduto])

  function removerSel(i) {
    setSelecionados((prev) => prev.filter((_, idx) => idx !== i))
  }

  function editarQtd(i, qtd) {
    setSelecionados((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, qtd: Math.max(0, Number(qtd) || 0) } : it))
    )
  }

  const etiquetas = useMemo(() => {
    const list = []
    for (const s of selecionados) {
      for (let i = 0; i < s.qtd; i++) {
        list.push(s)
      }
    }
    return list
  }, [selecionados])

  const perPagePreview = useMemo(() => {
    const pageH = 842
    const margin = 24
    const gap = 8
    const cols = colunas === 2 ? 2 : 3
    const cellH = 180
    const rows = Math.max(1, Math.floor((pageH - margin * 2 + gap) / (cellH + gap)))
    return cols * rows
  }, [colunas])

  const paginas = useMemo(() => {
    const res = []
    for (let i = 0; i < etiquetas.length; i += perPagePreview) {
      res.push(etiquetas.slice(i, i + perPagePreview))
    }
    return res
  }, [etiquetas, perPagePreview])

  function fitText(doc, value, maxWidth) {
    const raw = String(value ?? '')
    if (!raw) return '-'
    if (doc.getTextWidth(raw) <= maxWidth) return raw
    const ell = '…'
    let t = raw
    while (t.length > 0 && doc.getTextWidth(t + ell) > maxWidth) t = t.slice(0, -1)
    return t ? t + ell : ell
  }

  async function gerarPDF() {
    if (!selecionados.length) return
    await registrarEtiquetas(selecionados)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const cols = colunas === 2 ? 2 : 3
    const margin = 24
    const gap = 8
    const cellH = 180
    const rows = Math.max(1, Math.floor((pageH - margin * 2 + gap) / (cellH + gap)))
    const perPage = cols * rows
    const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols
    const pad = 10
    const fieldGap = 12
    const fw = (cellW - pad * 2 - fieldGap) / 2

    const labels = []
    for (const s of selecionados) {
      const q = Math.max(0, Number(s.qtd) || 0)
      for (let i = 0; i < q; i += 1) labels.push(s)
    }
    if (!labels.length) return

    doc.setDrawColor(209, 213, 219)
    doc.setTextColor(17, 24, 39)

    labels.forEach((s, idx) => {
      if (idx > 0 && idx % perPage === 0) doc.addPage()
      const pos = idx % perPage
      const r = Math.floor(pos / cols)
      const c = pos % cols
      const x = margin + c * (cellW + gap)
      const y = margin + r * (cellH + gap)

      doc.roundedRect(x, y, cellW, cellH, 8, 8)

      const titleY = y + pad + 12
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(fitText(doc, s.nome || '-', cellW - pad * 2), x + pad, titleY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(107, 114, 128)
      doc.text(fitText(doc, s.marca || '-', cellW - pad * 2), x + pad, titleY + 14)

      doc.setTextColor(107, 114, 128)
      doc.setFontSize(7)
      doc.text('Lote', x + pad, titleY + 34)
      doc.text('Manipulação', x + pad + fw + fieldGap, titleY + 34)
      doc.text('Validade', x + pad, titleY + 62)
      doc.text('Armazenamento', x + pad + fw + fieldGap, titleY + 62)
      doc.text('Quantidade', x + pad, titleY + 90)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(17, 24, 39)
      doc.text(fitText(doc, s.lote || '-', fw), x + pad, titleY + 46)
      doc.text(fitText(doc, formatDate(s.manipulacao), fw), x + pad + fw + fieldGap, titleY + 46)
      doc.text(fitText(doc, formatDate(s.validade), fw), x + pad, titleY + 74)
      doc.text(fitText(doc, s.armazenamento || '-', fw), x + pad + fw + fieldGap, titleY + 74)

      const qtdTxt = `${s.quantidadeProduto || '-'} ${s.unidade || ''}`.trim()
      doc.text(fitText(doc, qtdTxt, cellW - pad * 2), x + pad, titleY + 102)

      doc.setFont('helvetica', 'normal')
    })

    doc.save('etiquetas.pdf')
    const today = new Date().toISOString().slice(0, 10)
    setLastPdfDownload(today)
    setPdfFeedback('PDF baixado com sucesso.')
    try {
      localStorage.setItem(storageKey, today)
    } catch {
      // ignore
    }
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const baixadoHoje = lastPdfDownload === todayKey

  return (
    <div className="container">
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Selecionados ({selecionados.length})</h3>
          <small className="text-secondary">Cada item pode gerar múltiplas etiquetas</small>
        </div>
        {selecionados.length ? (
          <div className="table-container" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Validade</th>
                  <th>Manipulação</th>
                  <th>Armazenamento</th>
                  <th>Unidade</th>
                  <th>Qtd. Produto</th>
                  <th style={{ width: 120 }}>Qtd. etiquetas</th>
                  <th className="text-center">Remover</th>
                </tr>
              </thead>
              <tbody>
                {selecionados.map((s, i) => (
                  <tr key={`${s.id}-${i}`}>
                    <td>
                      <div className="product-name">{s.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.marca || '-'}</div>
                    </td>
                    <td>
                      <input value={s.lote} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, lote: v } : it))
                      }} />
                    </td>
                    <td>
                      <input type="date" value={s.validade || ''} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, validade: v } : it))
                      }} />
                    </td>
                    <td>
                      <input type="date" value={s.manipulacao || ''} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, manipulacao: v } : it))
                      }} />
                    </td>
                    <td>
                      <input value={s.armazenamento} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, armazenamento: v } : it))
                      }} />
                    </td>
                    <td>
                      <input value={s.unidade} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, unidade: v } : it))
                      }} />
                    </td>
                    <td>
                      <input type="number" step="0.01" value={s.quantidadeProduto} onChange={(e) => {
                        const v = e.target.value
                        setSelecionados(prev => prev.map((it, idx) => idx === i ? { ...it, quantidadeProduto: v } : it))
                      }} />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={s.qtd}
                        onChange={(e) => editarQtd(i, e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <button className="btn btn-secondary" onClick={() => removerSel(i)}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-table">Nenhum produto selecionado.</div>
        )}
      </div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Gerar Etiquetas</h2>
        {pdfFeedback ? (
          <div className="alert alert-info" style={{ marginBottom: 10 }}>
            {pdfFeedback}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produtos por nome, marca ou lote"
            style={{ maxWidth: 380 }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Colunas</label>
            <select value={colunas} onChange={(e) => setColunas(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            <button className="btn btn-primary" onClick={() => setPreviewPdfOpen(true)} disabled={!etiquetas.length}>
              Pré-visualizar
            </button>
          </div>
        </div>
        {preview ? (
          <div style={{ marginTop: 12 }}>
            <div className="alert alert-info">
              Pré-visualização da etiqueta do produto selecionado. Ajuste dados abaixo se necessário antes de gerar o PDF.
            </div>
            <div className="label-card label-nutri" style={{ maxWidth: 420 }}>
              <div className="label-nutri-title">{preview.nome}</div>
              <div className="label-nutri-sub">{preview.marca || '-'}</div>
              <div className="label-nutri-grid">
                <div className="label-nutri-field"><span>Lote</span><strong>{preview.lote || '-'}</strong></div>
                <div className="label-nutri-field"><span>Manipulação</span><strong>{formatDate(preview.manipulacao)}</strong></div>
                <div className="label-nutri-field"><span>Validade</span><strong>{formatDate(preview.validade)}</strong></div>
                <div className="label-nutri-field"><span>Armazenamento</span><strong>{preview.armazenamento || '-'}</strong></div>
                <div className="label-nutri-field"><span>Quantidade</span><strong>{preview.quantidadeProduto || '-'} {preview.unidade || ''}</strong></div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          {carregando ? (
            <div className="text-secondary">Carregando...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {(produtos || []).map((p) => (
                <div key={p.id} className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {p.marca || '-'} • Lote: {p.lote || '-'} • Val.: {formatDate(validadePreferencial(p))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={() => addProduto(p)}>+ Selecionar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewPdfOpen ? (
        <div className="modal-backdrop" onClick={() => setPreviewPdfOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pré-visualização do PDF</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => setPreviewPdfOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                Confira as etiquetas abaixo. Ao baixar, será gerado somente o arquivo PDF das etiquetas.
              </div>
              {baixadoHoje ? (
                <div className="alert alert-info">
                  As etiquetas já foram baixadas hoje. Você ainda pode baixar novamente.
                </div>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paginas.map((grupo, pIndex) => (
                  <div key={`page-${pIndex}`} className="labels-page" style={{ marginBottom: 0 }}>
                    <div className="labels-grid" style={{ ['--labels-cols']: colunas }}>
                      {grupo.map((s, idx) => (
                        <div key={`${s.id}-${pIndex}-${idx}`} className="label-card label-nutri">
                          <div className="label-nutri-title">{s.nome}</div>
                          <div className="label-nutri-sub">{s.marca || '-'}</div>
                          <div className="label-nutri-grid">
                            <div className="label-nutri-field"><span>Lote</span><strong>{s.lote || '-'}</strong></div>
                            <div className="label-nutri-field"><span>Manipulação</span><strong>{formatDate(s.manipulacao)}</strong></div>
                            <div className="label-nutri-field"><span>Validade</span><strong>{formatDate(s.validade)}</strong></div>
                            <div className="label-nutri-field"><span>Armazenamento</span><strong>{s.armazenamento || '-'}</strong></div>
                            <div className="label-nutri-field"><span>Quantidade</span><strong>{s.quantidadeProduto || '-'} {s.unidade || ''}</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewPdfOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  setPdfFeedback('')
                  await gerarPDF()
                  setPreviewPdfOpen(false)
                }}
                disabled={!etiquetas.length}
              >
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
