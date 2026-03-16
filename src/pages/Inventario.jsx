import { useEffect, useMemo, useState } from 'react'
import { listarProdutos } from '../services/produtos'
import { ajustarEstoque, listarAjustes } from '../services/inventario'
import { supabase } from '../lib/supabaseClient'

export default function Inventario() {
  const [busca, setBusca] = useState('')
  const [produtos, setProdutos] = useState([])
  const [contagem, setContagem] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [produtoSel, setProdutoSel] = useState('')
  const [tipo, setTipo] = useState('INC')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [historico, setHistorico] = useState([])
  const [histBusca, setHistBusca] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  async function carregarProdutos() {
    setCarregando(true)
    setErro('')
    const { data, error } = await listarProdutos({ search: busca, limit: 500 })
    if (error) {
      setErro('Erro ao listar produtos.')
      setProdutos([])
    } else {
      setProdutos(data || [])
    }
    setCarregando(false)
  }
  useEffect(() => {
    carregarProdutos()
  }, [])

  const produtosFiltrados = useMemo(() => {
    if (!busca) return produtos
    const b = busca.toLowerCase()
    return produtos.filter(p =>
      (p.nome || '').toLowerCase().includes(b) ||
      (p.marca || '').toLowerCase().includes(b) ||
      (p.lote || '').toLowerCase().includes(b)
    )
  }, [produtos, busca])

  function toBrDate(v) {
    if (!v) return '-'
    const d = new Date(v)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function setQtdContada(id, v) {
    setContagem(prev => ({ ...prev, [id]: v }))
  }

  async function aplicarContagem() {
    const entries = Object.entries(contagem).filter(([, v]) => v !== '' && !isNaN(Number(v)))
    if (!entries.length) return
    setCarregando(true)
    for (const [idStr, vStr] of entries) {
      const id = Number(idStr)
      const p = produtos.find(x => x.id === id)
      if (!p) continue
      const atual = Number(p.quantidade ?? 0)
      const contado = Number(vStr)
      const delta = contado - atual
      const t = delta === 0 ? 'SET' : delta > 0 ? 'INC' : 'DEC'
      const val = t === 'SET' ? contado : Math.abs(delta)
      await ajustarEstoque(id, t, val, 'Contagem manual', userId)
    }
    setContagem({})
    await carregarProdutos()
    await carregarHistorico()
    setCarregando(false)
  }

  async function aplicarAjusteManual() {
    if (!produtoSel || !valor) return
    setCarregando(true)
    await ajustarEstoque(Number(produtoSel), tipo, Number(valor), motivo || 'Ajuste manual', userId)
    setValor('')
    setMotivo('')
    await carregarProdutos()
    await carregarHistorico()
    setCarregando(false)
  }

  async function carregarHistorico() {
    const { data } = await listarAjustes({ search: histBusca, de, ate, limit: 200 })
    setHistorico(data || [])
  }
  useEffect(() => {
    carregarHistorico()
  }, [])

  return (
    <div className="container">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="header-title">
          <h2>Inventário</h2>
          <p>Contagem manual, ajustes de estoque e histórico.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <div className="card">
          <div className="report-title">Contagem manual</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <input placeholder="Buscar por nome, marca ou lote" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <button className="btn btn-secondary" onClick={carregarProdutos}>Atualizar</button>
            <button className="btn btn-primary" onClick={aplicarContagem} disabled={carregando}>Aplicar ajustes da contagem</button>
          </div>
          {erro ? <div className="alert alert-error">{erro}</div> : null}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Validade</th>
                  <th>Categoria</th>
                  <th>Qtd. atual</th>
                  <th>Qtd. contada</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map(p => {
                  const atual = Number(p.quantidade ?? 0)
                  const contado = Number(contagem[p.id] ?? '')
                  const diff = isNaN(contado) ? 0 : contado - atual
                  return (
                    <tr key={p.id}>
                      <td><span className="product-name">{p.nome}</span></td>
                      <td>{toBrDate(p.validade_final || p.validade_original)}</td>
                      <td>{p.categoria || '-'}</td>
                      <td className="text-right">{atual}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={contagem[p.id] ?? ''}
                          onChange={(e) => setQtdContada(p.id, e.target.value)}
                          style={{ width: 120 }}
                        />
                      </td>
                      <td className="text-right" style={{ color: diff === 0 ? 'inherit' : diff > 0 ? '#059669' : '#EF4444' }}>
                        {isNaN(contado) ? '-' : diff}
                      </td>
                    </tr>
                  )
                })}
                {!produtosFiltrados.length ? (
                  <tr><td colSpan={6} className="empty-table">Sem produtos.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="report-title">Ajuste de estoque</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr pipeline 1fr 1fr 2fr auto'.replace('pipeline',''), gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Produto</label>
              <select value={produtoSel} onChange={(e) => setProdutoSel(e.target.value)}>
                <option value="">Selecione</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="INC">Incrementar</option>
                <option value="DEC">Decrementar</option>
                <option value="SET">Definir</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Quantidade</label>
              <input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Motivo</label>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: perda, doação, correção" />
            </div>
            <div>
              <button className="btn btn-primary" onClick={aplicarAjusteManual} disabled={!produtoSel || !valor || carregando}>Aplicar</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="report-title">Histórico de ajustes</div>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <input placeholder="Buscar por produto ou motivo" value={histBusca} onChange={(e) => setHistBusca(e.target.value)} />
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            <button className="btn btn-secondary" onClick={carregarHistorico}>Filtrar</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Delta</th>
                  <th>Qtd. anterior</th>
                  <th>Qtd. nova</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {historico.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.criado_em).toLocaleString('pt-BR')}</td>
                    <td>{h.produto_nome}</td>
                    <td>{h.tipo}</td>
                    <td className="text-right" style={{ color: Number(h.delta) >= 0 ? '#059669' : '#EF4444' }}>{h.delta}</td>
                    <td className="text-right">{h.quantidade_anterior}</td>
                    <td className="text-right">{h.quantidade_nova}</td>
                    <td>{h.motivo || '-'}</td>
                  </tr>
                ))}
                {!historico.length ? <tr><td colSpan={7} className="empty-table">Sem registros.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
