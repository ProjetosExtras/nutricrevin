import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarProdutos, deletarProduto } from '../services/produtos'
import ProductModal from '../components/ProductModal'
import './Estoque.css'

export default function Estoque() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [erro, setErro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [abrirNovo, setAbrirNovo] = useState(false)
  const [detalhesAberto, setDetalhesAberto] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState(null)
  const [editarAberto, setEditarAberto] = useState(false)
  const [produtoEdicao, setProdutoEdicao] = useState(null)
  const [excluirAberto, setExcluirAberto] = useState(false)
  const [produtoExcluir, setProdutoExcluir] = useState(null)
  const porPagina = 10

  function toBr(d) {
    if (!d) return '-'
    const dx = new Date(d)
    if (isNaN(dx.getTime())) return '-'
    return dx.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error, count } = await listarProdutos({ search: buscaDebounced, limit: porPagina, page: pagina, withCount: true })
    if (error) {
      // Se for erro de tabela inexistente, mostre uma mensagem amigável
      if (error.code === '42P01') {
        setErro('A tabela "produtos" ainda não existe no Supabase. Crie-a para ver os dados.')
      } else {
        setErro('Erro ao buscar produtos. Verifique sua conexão.')
      }
      setProdutos([])
      setTotal(0)
    } else {
      setErro('')
      setProdutos(data ?? [])
      setTotal(count ?? 0)
    }
    setCarregando(false)
  }, [buscaDebounced, pagina])

  // Debounce na busca para não chamar a API a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 500)
    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => {
    setPagina(1)
  }, [busca])

  useEffect(() => {
    carregar()
  }, [carregar])

  const totalPaginas = Math.max(1, Math.ceil((total || 0) / porPagina))
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas)

  function getPages() {
    const maxBtns = 7
    if (totalPaginas <= maxBtns) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    }
    const pages = new Set([1, totalPaginas])
    for (let p = paginaAtual - 2; p <= paginaAtual + 2; p += 1) {
      if (p > 1 && p < totalPaginas) pages.add(p)
    }
    const sorted = Array.from(pages).sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < sorted.length; i += 1) {
      out.push(sorted[i])
      if (sorted[i + 1] && sorted[i + 1] - sorted[i] > 1) out.push('gap')
    }
    return out
  }

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
                  <th>Observação</th>
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
                      <td data-label="Observação">{p.observacoes || '-'}</td>
                      <td data-label="Categoria">{p.categoria || '-'}</td>
                      <td data-label="Qtd." className="text-right font-bold">
                        {p.quantidade}
                      </td>
                      <td data-label="Ações" className="text-center">
                        <button
                          className="btn-icon"
                          title="Detalhes"
                          aria-label="Ver detalhes do produto"
                          onClick={() => {
                            setProdutoDetalhes(p)
                            setDetalhesAberto(true)
                          }}
                        >
                          🔎
                        </button>
                        <button
                          className="btn-icon"
                          title="Gerar etiqueta"
                          aria-label="Gerar etiqueta do produto"
                          onClick={() => navigate('/etiquetas', { state: { produtoParaEtiqueta: p } })}
                          style={{ marginLeft: 6 }}
                        >
                          🏷️
                        </button>
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => {
                            setProdutoEdicao(p)
                            setEditarAberto(true)
                          }}
                          style={{ marginLeft: 6 }}
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
      {!carregando && !erro && total > porPagina ? (
        <div className="pagination-bar">
          <div className="pagination-meta">
            Página {paginaAtual} de {totalPaginas} • {total} produto(s)
          </div>
          <div className="pagination">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
            >
              Anterior
            </button>
            {getPages().map((p, idx) => (
              p === 'gap' ? (
                <span key={`gap-${idx}`} className="pagination-gap">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  type="button"
                  className={`btn ${p === paginaAtual ? 'btn-primary' : 'btn-secondary'} pagination-page`}
                  onClick={() => setPagina(p)}
                  aria-current={p === paginaAtual ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
      {detalhesAberto ? (
        <div className="modal-backdrop" onClick={() => setDetalhesAberto(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes do produto</h3>
              <button type="button" className="btn btn-secondary" aria-label="Fechar" onClick={() => setDetalhesAberto(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div>
                  <label>Nome</label>
                  <input value={produtoDetalhes?.nome || ''} readOnly />
                </div>
                <div>
                  <label>Marca</label>
                  <input value={produtoDetalhes?.marca || ''} readOnly />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label>Categoria</label>
                  <input value={produtoDetalhes?.categoria || ''} readOnly />
                </div>
                <div>
                  <label>Lote</label>
                  <input value={produtoDetalhes?.lote || ''} readOnly />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label>Quantidade</label>
                  <input value={produtoDetalhes?.quantidade ?? ''} readOnly />
                </div>
                <div>
                  <label>Unidade</label>
                  <input value={produtoDetalhes?.unidade_medida || ''} readOnly />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label>Validade final</label>
                  <input value={toBr(produtoDetalhes?.validade_final || produtoDetalhes?.validade_original)} readOnly />
                </div>
                <div>
                  <label>Localização</label>
                  <input value={produtoDetalhes?.localizacao || ''} readOnly />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label>Armazenamento</label>
                  <input value={produtoDetalhes?.forma_armazenamento || ''} readOnly />
                </div>
                <div>
                  <label>Fornecedor</label>
                  <input value={produtoDetalhes?.fornecedor || ''} readOnly />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label>Preço unitário</label>
                  <input value={produtoDetalhes?.preco_unitario ?? ''} readOnly />
                </div>
              </div>
              <div className="grid-1">
                <div>
                  <label>Observações</label>
                  <textarea value={produtoDetalhes?.observacoes || ''} readOnly rows={3} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDetalhesAberto(false)}>Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
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
