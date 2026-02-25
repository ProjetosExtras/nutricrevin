import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Dashboard.css'
import { listarProdutosRecentes } from '../services/produtos'

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
                    <th>Lote</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProdutos.map((p) => {
                    const criado = p.criado_em || p.created_at || null
                    return (
                      <tr key={p.id}>
                        <td><div className="product-name">{p.nome}</div></td>
                        <td>{p.marca || '-'}</td>
                        <td>{p.lote || '-'}</td>
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
            <button className="action-btn">Nova Etiqueta</button>
            <button className="action-btn">Registrar Entrada</button>
            <button className="action-btn">Registrar Saída</button>
          </div>
        </div>
      </div>
    </div>
  )
}
