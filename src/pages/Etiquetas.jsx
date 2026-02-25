import { useCallback, useEffect, useMemo, useState } from 'react'
import { listarProdutos } from '../services/produtos'
import { registrarEtiquetas } from '../services/etiquetas'

export default function Etiquetas() {
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [colunas, setColunas] = useState(3)
  const [preview, setPreview] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await listarProdutos({ search: busca, limit: 100 })
    setProdutos(data || [])
    setCarregando(false)
  }, [busca])

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

  function addProduto(p) {
    const novoSel = {
      id: p.id,
      nome: p.nome,
      marca: p.marca || '',
      lote: p.lote || '',
      validade: validadePreferencial(p),
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
  }

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

  const paginas = useMemo(() => {
    const chunk = 6
    const res = []
    for (let i = 0; i < etiquetas.length; i += chunk) {
      res.push(etiquetas.slice(i, i + chunk))
    }
    return res
  }, [etiquetas])

  async function imprimir() {
    if (!selecionados.length) return
    await registrarEtiquetas(selecionados)
    window.print()
  }

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
            <button className="btn btn-primary" onClick={imprimir} disabled={!etiquetas.length}>
              Imprimir etiquetas
            </button>
          </div>
        </div>
        {preview ? (
          <div style={{ marginTop: 12 }}>
            <div className="alert alert-info">
              Pré-visualização da etiqueta do produto selecionado. Ajuste dados abaixo se necessário antes de imprimir.
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

      

      <div aria-label="Área de impressão">
        {paginas.map((grupo, pIndex) => (
          <div key={`page-${pIndex}`} className="labels-page">
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
  )
}
