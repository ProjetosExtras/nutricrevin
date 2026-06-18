import { useEffect, useMemo, useState } from 'react'
import { listarProdutos, deletarProduto } from '../services/produtos'
import Modal from '../components/Modal'

export default function Vencimentos() {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [produtos, setProdutos] = useState([])
  const [dias, setDias] = useState(30)
  const [excluirAberto, setExcluirAberto] = useState(false)
  const [produtoExcluir, setProdutoExcluir] = useState(null)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await listarProdutos({ limit: 500 })
    if (error) {
      setErro('Erro ao carregar produtos. Verifique sua conexão.')
      setProdutos([])
    } else {
      setErro('')
      setProdutos((data || []).filter(p => p.validade_final || p.validade_original))
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const hoje = useMemo(() => {
    const d = new Date()
    d.setHours(0,0,0,0)
    return d
  }, [])

  const fimJanela = useMemo(() => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + Number(dias || 0))
    return d
  }, [hoje, dias])

  function parseDate(value) {
    if (!value) return null
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    d.setHours(0,0,0,0)
    return d
  }

  const classificados = useMemo(() => {
    const vencidos = []
    const proximos = []
    for (const p of produtos) {
      const dt = parseDate(p.validade_final || p.validade_original)
      if (!dt) continue
      if (dt < hoje) {
        vencidos.push(p)
      } else if (dt <= fimJanela) {
        proximos.push(p)
      }
    }
    const byDate = (a, b) => {
      const ad = parseDate(a.validade_final || a.validade_original)
      const bd = parseDate(b.validade_final || b.validade_original)
      return ad - bd
    }
    return {
      vencidos: vencidos.sort(byDate),
      proximos: proximos.sort(byDate),
    }
  }, [produtos, hoje, fimJanela])

  function formatDate(value) {
    const d = parseDate(value)
    if (!d) return '-'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function diasRestantes(value) {
    const d = parseDate(value)
    if (!d) return null
    const diff = Math.round((d - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600 }}>Vencimentos</div>
          <div className="alert alert-info" style={{ marginLeft: 'auto' }}>
            Monitora produtos vencidos e que vencem nos próximos dias.
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Próximos dias</label>
            <input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              style={{ width: 120 }}
            />
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="card">
          Carregando...
        </div>
      ) : erro ? (
        <div className="card">
          <div className="alert alert-error">{erro}</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Vencidos ({classificados.vencidos.length})</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Marca</th>
                    <th>Localização</th>
                    <th>Lote</th>
                    <th>Validade</th>
                    <th>Qtd.</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classificados.vencidos.length ? classificados.vencidos.map(p => (
                    <tr key={`v-${p.id}`}>
                      <td><span className="product-name">{p.nome}</span></td>
                      <td>{p.marca || '-'}</td>
                      <td>{p.localizacao || '-'}</td>
                      <td>{p.lote || '-'}</td>
                      <td>{formatDate(p.validade_final || p.validade_original)}</td>
                      <td className="text-right">{p.quantidade ?? '-'}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-red">Vencido</span>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => {
                          setProdutoExcluir(p)
                          setExcluirAberto(true)
                        }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="empty-table">Nenhum produto vencido.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>A vencer</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Marca</th>
                    <th>Localização</th>
                    <th>Lote</th>
                    <th>Validade</th>
                    <th>Qtd.</th>
                    <th>Em</th>
                  </tr>
                </thead>
                <tbody>
                  {classificados.proximos.length ? classificados.proximos.map(p => {
                    const d = p.validade_final || p.validade_original
                    const rest = diasRestantes(d)
                    return (
                      <tr key={`p-${p.id}`}>
                        <td><span className="product-name">{p.nome}</span></td>
                        <td>{p.marca || '-'}</td>
                        <td>{p.localizacao || '-'}</td>
                        <td>{p.lote || '-'}</td>
                        <td>{formatDate(d)}</td>
                        <td className="text-right">{p.quantidade ?? '-'}</td>
                        <td>
                          <span className="badge badge-yellow">
                            {rest === 0 ? 'Hoje' : `${rest} dia(s)`}
                          </span>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan={7} className="empty-table">Nenhum produto a vencer no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Modal open={excluirAberto} onClose={() => {
            setExcluirAberto(false)
            setProdutoExcluir(null)
          }} size="sm">
            <div className="modal-header">
              <h3>Confirmar exclusão</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => {
                setExcluirAberto(false)
                setProdutoExcluir(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir o produto <strong>{produtoExcluir?.nome}</strong>?</p>
              <p>Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setExcluirAberto(false)
                setProdutoExcluir(null)
              }}>Cancelar</button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: '#EF4444' }}
                onClick={async () => {
                  if (!produtoExcluir) return
                  const { error } = await deletarProduto(produtoExcluir.id)
                  if (error) {
                    alert('Não foi possível excluir. Verifique permissões/RLS no Supabase.')
                    return
                  }
                  setExcluirAberto(false)
                  setProdutoExcluir(null)
                  carregar()
                }}
              >
                Excluir
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
