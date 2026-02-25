import { useEffect, useState, useCallback } from 'react'
import { listarProdutos, deletarProduto } from '../services/produtos'
import ProductModal from '../components/ProductModal'
import './Estoque.css'

export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [abrirNovo, setAbrirNovo] = useState(false)
  const [editarAberto, setEditarAberto] = useState(false)
  const [produtoEdicao, setProdutoEdicao] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await listarProdutos({ search: busca, limit: 100 })
    if (error) {
      // Se for erro de tabela inexistente, mostre uma mensagem amigável
      if (error.code === '42P01') {
        setErro('A tabela "produtos" ainda não existe no Supabase. Crie-a para ver os dados.')
      } else {
        setErro('Erro ao buscar produtos. Verifique sua conexão.')
      }
      setProdutos([])
    } else {
      setErro('')
      setProdutos(data ?? [])
    }
    setCarregando(false)
  }, [busca])

  // Debounce na busca para não chamar a API a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      carregar()
    }, 500)
    return () => clearTimeout(timer)
  }, [carregar])

  return (
    <div className="estoque-container">
      <div className="page-header">
        <div className="header-title">
          <h2>Controle de Estoque</h2>
          <p>Gerencie os produtos, quantidades e vencimentos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAbrirNovo(true)}>
          + Novo Produto
        </button>
      </div>

      <div className="card filters-card">
        <div className="search-group">
          <input
            className="search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome, marca ou lote..."
          />
        </div>
      </div>

      <div className="card table-card">
        {carregando ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando produtos...</p>
          </div>
        ) : erro ? (
          <div className="error-state">
            <p>⚠️ {erro}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Lote</th>
                  <th>Categoria</th>
                  <th className="text-right">Qtd.</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length > 0 ? (
                  produtos.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Produto">
                        <div className="product-name">{p.nome}</div>
                      </td>
                      <td data-label="Marca">{p.marca || '-'}</td>
                      <td data-label="Lote">
                        <span className="badge badge-gray">{p.lote || 'N/A'}</span>
                      </td>
                      <td data-label="Categoria">{p.categoria || '-'}</td>
                      <td data-label="Qtd." className="text-right font-bold">
                        {p.quantidade}
                      </td>
                      <td data-label="Ações" className="text-center">
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => {
                            setProdutoEdicao(p)
                            setEditarAberto(true)
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          title="Excluir"
                          aria-label="Excluir produto"
                          onClick={async () => {
                            const ok = window.confirm('Excluir este produto? Esta ação não pode ser desfeita.')
                            if (!ok) return
                            const { error } = await deletarProduto(p.id)
                            if (error) {
                              alert('Não foi possível excluir. Verifique permissões/RLS no Supabase.')
                              return
                            }
                            carregar()
                          }}
                          style={{ color: '#EF4444', marginLeft: 6 }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-table">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ProductModal
        open={abrirNovo}
        onClose={() => setAbrirNovo(false)}
        onCreated={() => carregar()}
      />
      <ProductModal
        open={editarAberto}
        onClose={() => {
          setEditarAberto(false)
          setProdutoEdicao(null)
        }}
        mode="edit"
        initial={produtoEdicao}
        onUpdated={() => carregar()}
      />
    </div>
  )
}
