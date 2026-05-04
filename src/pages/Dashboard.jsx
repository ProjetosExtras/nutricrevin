import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Dashboard.css'
import { listarProdutosRecentes, listarProdutos } from '../services/produtos'
import { ajustarEstoque } from '../services/inventario'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const formatDatePt = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const formatDateTimeBr = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo'
    }).format(d)
  }
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    produtos: 0,
    etiquetasHoje: 0,
    vencidos: 0,
    lotesA30: 0,
    cadastradosHoje: 0
  })
  const [recentProdutos, setRecentProdutos] = useState([])
  const [saidaAberta, setSaidaAberta] = useState(false)
  const [saidaLista, setSaidaLista] = useState([])
  const [saidaForm, setSaidaForm] = useState({ produtoId: '', quantidade: '', motivo: '' })
  const [saidaCarregando, setSaidaCarregando] = useState(false)
  const [saidaErro, setSaidaErro] = useState('')
  const [entradaAberta, setEntradaAberta] = useState(false)
  const [entradaLista, setEntradaLista] = useState([])
  const [entradaForm, setEntradaForm] = useState({ produtoId: '', quantidade: '', motivo: '' })
  const [entradaCarregando, setEntradaCarregando] = useState(false)
  const [entradaErro, setEntradaErro] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    
    // Buscar estatísticas reais (exemplo simplificado)
    async function fetchStats() {
      // Contagem de produtos
      let produtosCount = 0
      try {
        const res = await supabase.from('produtos').select('*', { count: 'exact', head: true })
        produtosCount = res.count || 0
      } catch {
        produtosCount = 0
      }

      // Contagem de vencidos (validade_final OU validade_original < hoje)
      let vencidosCount = 0
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().slice(0, 10)
        const resV = await supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .or(`validade_final.lt.${todayStr},validade_original.lt.${todayStr}`)
        vencidosCount = resV.count || 0
      } catch {
        vencidosCount = 0
      }

      // Contagem de lotes com vencimento nos próximos 30 dias (distinct por lote)
      let lotesA30 = 0
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(today)
        end.setDate(end.getDate() + 30)
        const todayStr = today.toISOString().slice(0, 10)
        const endStr = end.toISOString().slice(0, 10)

        const orFilter = `and(validade_final.gte.${todayStr},validade_final.lte.${endStr}),and(validade_final.is.null,validade_original.gte.${todayStr},validade_original.lte.${endStr})`
        const resL = await supabase
          .from('produtos')
          .select('lote,validade_final,validade_original')
          .or(orFilter)
          .limit(2000)
        if (!resL.error) {
          const setLotes = new Set(
            (resL.data || [])
              .map(r => (r.lote || '').trim())
              .filter(l => l.length > 0)
          )
          lotesA30 = setLotes.size
        }
      } catch {
        lotesA30 = 0
      }

      // Contagem de produtos criados hoje (considera criado_em ou created_at)
      let cadastradosHoje = 0
      try {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        const startIso = start.toISOString()
        const endIso = end.toISOString()
        const orCreated = `and(criado_em.gte.${startIso},criado_em.lt.${endIso}),and(criado_em.is.null,created_at.gte.${startIso},created_at.lt.${endIso})`
        const resC = await supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .or(orCreated)
        cadastradosHoje = resC.count || 0
      } catch {
        cadastradosHoje = 0
      }

      setStats(prev => ({ ...prev, produtos: produtosCount, vencidos: vencidosCount, lotesA30, cadastradosHoje }))
    }

    fetchStats()
    
    async function fetchRecent() {
      const { data } = await listarProdutosRecentes(5)
      setRecentProdutos(data || [])
    }
    fetchRecent()
  }, [])

  async function abrirSaida() {
    setSaidaErro('')
    setSaidaAberta(true)
    const { data } = await listarProdutos({ limit: 200 })
    setSaidaLista(data || [])
  }

  function updateSaida(key, value) {
    setSaidaForm(prev => ({ ...prev, [key]: value }))
  }

  async function confirmarSaida(e) {
    e.preventDefault()
    setSaidaErro('')
    const pid = Number(saidaForm.produtoId)
    const qtd = Number(saidaForm.quantidade)
    if (!pid || !qtd || isNaN(qtd) || qtd <= 0) {
      setSaidaErro('Selecione um produto e informe a quantidade.')
      return
    }
    setSaidaCarregando(true)
    const { error } = await ajustarEstoque(pid, 'DEC', qtd, saidaForm.motivo || 'Saída')
    setSaidaCarregando(false)
    if (error) {
      setSaidaErro(error.message || 'Falha ao registrar saída.')
      return
    }
    setSaidaAberta(false)
    setSaidaForm({ produtoId: '', quantidade: '', motivo: '' })
    const { data } = await listarProdutosRecentes(5)
    setRecentProdutos(data || [])
  }

  async function abrirEntrada() {
    setEntradaErro('')
    setEntradaAberta(true)
    const { data } = await listarProdutos({ limit: 200 })
    setEntradaLista(data || [])
  }

  function updateEntrada(key, value) {
    setEntradaForm(prev => ({ ...prev, [key]: value }))
  }

  async function confirmarEntrada(e) {
    e.preventDefault()
    setEntradaErro('')
    const pid = Number(entradaForm.produtoId)
    const qtd = Number(entradaForm.quantidade)
    if (!pid || !qtd || isNaN(qtd) || qtd <= 0) {
      setEntradaErro('Selecione um produto e informe a quantidade.')
      return
    }
    setEntradaCarregando(true)
    const { error } = await ajustarEstoque(pid, 'INC', qtd, entradaForm.motivo || 'Entrada')
    setEntradaCarregando(false)
    if (error) {
      setEntradaErro(error.message || 'Falha ao registrar entrada.')
      return
    }
    setEntradaAberta(false)
    setEntradaForm({ produtoId: '', quantidade: '', motivo: '' })
    const { data } = await listarProdutosRecentes(5)
    setRecentProdutos(data || [])
  }

  const navigate = useNavigate()
  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <h2>Olá, {user?.email} 👋</h2>
        <p className="text-secondary">Bem-vindo ao sistema de gestão NutriCrevin.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">📦</div>
          <div className="stat-info">
            <h3>{stats.produtos}</h3>
            <p>Produtos no Estoque</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">🏷️</div>
          <div className="stat-info">
            <h3>--</h3>
            <p>Etiquetas Hoje</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">📅</div>
          <div className="stat-info">
            <h3>{stats.lotesA30}</h3>
            <p>Lotes a vencer (30d)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-orange">🆕</div>
          <div className="stat-info">
            <h3>{stats.cadastradosHoje}</h3>
            <p>Cadastrados Hoje</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">👥</div>
          <div className="stat-info">
            <h3>Ativo</h3>
            <p>Status do Sistema</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card recent-activity">
          <h3>Atividades Recentes</h3>
          {recentProdutos.length ? (
            <div className="table-container" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Marca</th>
                    <th>Validade</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProdutos.map((p) => {
                    const criado = p.criado_em || p.created_at || null
                    const validade = p.validade_final || p.validade_original || null
                    return (
                      <tr key={p.id}>
                        <td><div className="product-name">{p.nome}</div></td>
                        <td>{p.marca || '-'}</td>
                        <td>{formatDatePt(validade)}</td>
                        <td>{formatDateTimeBr(criado)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma atividade registrada recentemente.</p>
            </div>
          )}
        </div>

        <div className="card quick-actions">
          <h3>Ações Rápidas</h3>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => navigate('/etiquetas')}>Nova Etiqueta</button>
            <button className="action-btn" onClick={abrirEntrada}>Registrar Entrada</button>
            <button className="action-btn" onClick={abrirSaida}>Registrar Saída</button>
          </div>
        </div>
      </div>
      {saidaAberta ? (
        <div className="modal-backdrop" onClick={() => setSaidaAberta(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Saída</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => setSaidaAberta(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={confirmarSaida}>
              {saidaErro ? <div className="alert-error">{saidaErro}</div> : null}
              <div className="grid-2">
                <div>
                  <label>Produto</label>
                  <select value={saidaForm.produtoId} onChange={(e) => updateSaida('produtoId', e.target.value)}>
                    <option value="">Selecione</option>
                    {saidaLista.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Quantidade</label>
                  <input type="number" min="0.01" step="0.01" value={saidaForm.quantidade} onChange={(e) => updateSaida('quantidade', e.target.value)} />
                </div>
              </div>
              <div className="grid-1">
                <div>
                  <label>Motivo</label>
                  <input value={saidaForm.motivo} onChange={(e) => updateSaida('motivo', e.target.value)} placeholder="Ex.: consumo, descarte, doação" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSaidaAberta(false)} disabled={saidaCarregando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saidaCarregando}>
                  {saidaCarregando ? 'Salvando...' : 'Confirmar Saída'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {entradaAberta ? (
        <div className="modal-backdrop" onClick={() => setEntradaAberta(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Entrada</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => setEntradaAberta(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={confirmarEntrada}>
              {entradaErro ? <div className="alert-error">{entradaErro}</div> : null}
              <div className="grid-2">
                <div>
                  <label>Produto</label>
                  <select value={entradaForm.produtoId} onChange={(e) => updateEntrada('produtoId', e.target.value)}>
                    <option value="">Selecione</option>
                    {entradaLista.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Quantidade</label>
                  <input type="number" min="0.01" step="0.01" value={entradaForm.quantidade} onChange={(e) => updateEntrada('quantidade', e.target.value)} />
                </div>
              </div>
              <div className="grid-1">
                <div>
                  <label>Motivo</label>
                  <input value={entradaForm.motivo} onChange={(e) => updateEntrada('motivo', e.target.value)} placeholder="Ex.: compra, doação, correção" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEntradaAberta(false)} disabled={entradaCarregando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={entradaCarregando}>
                  {entradaCarregando ? 'Salvando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
