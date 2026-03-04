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
  const [excluirAberto, setExcluirAberto] = useState(false)
  const [produtoExcluir, setProdutoExcluir] = useState(null)

  function toBr(d) {
    if (!d) return '-'
    const dx = new Date(d)
    if (isNaN(dx.getTime())) return '-'
    return dx.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

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
                  <th>Localização</th>
                  <th>Validade</th>
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
                      <td data-label="Localização">{p.localizacao || '-'}</td>
                      <td data-label="Validade">
                        <span className="badge badge-gray">{toBr(p.validade_final || p.validade_original)}</span>
                      </td>
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
                            setProdutoExcluir(p)
                            setExcluirAberto(true)
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
                    <td colSpan={8} className="empty-table">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal de confirmação de exclusão */}
      {excluirAberto ? (
        <div className="modal-backdrop" onClick={() => setExcluirAberto(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirmar exclusão</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => setExcluirAberto(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir o produto <strong>{produtoExcluir?.nome}</strong>?</p>
              <p>Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setExcluirAberto(false)}>Cancelar</button>
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
          </div>
        </div>
      ) : null}
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
