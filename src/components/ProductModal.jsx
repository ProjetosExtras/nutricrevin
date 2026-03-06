import { useEffect, useState } from 'react'
import { criarProduto, atualizarProduto } from '../services/produtos'

export default function ProductModal({ open, onClose, onCreated, mode = 'create', initial = null, onUpdated }) {
  const [form, setForm] = useState({
    nome: '',
    marca: '',
    categoria: '',
    lote: '',
    quantidade: '',
    unidade_medida: 'unidade',
    quantidade_minima: '',
    validade_original: '',
    data_manipulacao: '',
    validade_final: '',
    localizacao: '',
    forma_armazenamento: '',
    fornecedor: '',
    preco_unitario: '',
    observacoes: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setForm({
        nome: initial.nome || '',
        marca: initial.marca || '',
        categoria: initial.categoria || '',
        lote: initial.lote || '',
        quantidade: initial.quantidade ?? '',
        unidade_medida: initial.unidade_medida || 'unidade',
        quantidade_minima: initial.quantidade_minima ?? '',
        validade_original: initial.validade_original || '',
        data_manipulacao: initial.data_manipulacao || '',
        validade_final: initial.validade_final || '',
        localizacao: initial.localizacao || '',
        forma_armazenamento: initial.forma_armazenamento || '',
        fornecedor: initial.fornecedor || '',
        preco_unitario: initial.preco_unitario ?? '',
        observacoes: initial.observacoes || ''
      })
    } else if (mode === 'create') {
      setForm({
        nome: '',
        marca: '',
        categoria: '',
        lote: '',
        quantidade: '',
        unidade_medida: 'unidade',
        quantidade_minima: '',
        validade_original: '',
        data_manipulacao: '',
        validade_final: '',
        localizacao: '',
        forma_armazenamento: '',
        fornecedor: '',
        preco_unitario: '',
        observacoes: ''
      })
    }
  }, [mode, initial, open])

  if (!open) return null

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome) {
      setErro('Informe o nome do produto.')
      return
    }
    if (!form.quantidade) {
      setErro('Informe a quantidade.')
      return
    }
    setSalvando(true)
    let resp
    if (mode === 'edit' && initial?.id) {
      resp = await atualizarProduto(initial.id, form)
    } else {
      resp = await criarProduto(form)
    }
    const { data, error } = resp
    setSalvando(false)
    if (error) {
      setErro(error.message || 'Erro ao salvar produto.')
      return
    }
    if (mode === 'edit') {
      if (onUpdated) onUpdated(data)
    } else {
      if (onCreated) onCreated(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="produto-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="produto-modal-title">{mode === 'edit' ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button
            type="button"
            aria-label="Fechar"
            className="btn btn-secondary"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {erro ? <div className="alert-error">{erro}</div> : null}

          <div className="grid-2">
            <div>
              <label>Nome*</label>
              <input value={form.nome} onChange={(e) => updateField('nome', e.target.value)} />
            </div>
            <div>
              <label>Marca</label>
              <input value={form.marca} onChange={(e) => updateField('marca', e.target.value)} />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Categoria</label>
              <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)}>
                <option value="">Selecione</option>
                <option value="Cereais">Cereais</option>
                <option value="Leguminosas">Leguminosas</option>
                <option value="Oleaginosas">Oleaginosas</option>
              </select>
            </div>
            <div>
              <label>Lote</label>
              <input value={form.lote} onChange={(e) => updateField('lote', e.target.value)} />
            </div>
            <div>
              <label>Unidade</label>
              <select value={form.unidade_medida} onChange={(e) => updateField('unidade_medida', e.target.value)}>
                <option value="unidade">unidade</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>

          <div className="grid-1">
            <div>
              <label>Quantidade*</label>
              <input type="number" step="0.01" value={form.quantidade} onChange={(e) => updateField('quantidade', e.target.value)} />
            </div>
          </div>

          <div className="grid-1">
            <div>
              <label>Validade final</label>
              <input type="date" value={form.validade_final} onChange={(e) => updateField('validade_final', e.target.value)} />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Localização</label>
              <input value={form.localizacao} onChange={(e) => updateField('localizacao', e.target.value)} />
            </div>
            <div>
              <label>Armazenamento</label>
              <select value={form.forma_armazenamento} onChange={(e) => updateField('forma_armazenamento', e.target.value)}>
                <option value="">Selecione</option>
                <option value="temperatura_ambiente">Temperatura ambiente</option>
                <option value="refrigerado">Refrigerado (geladeira)</option>
                <option value="congelado">Congelado (freezer)</option>
                <option value="seco">Ambiente seco</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Fornecedor</label>
              <input value={form.fornecedor} onChange={(e) => updateField('fornecedor', e.target.value)} />
            </div>
            <div>
              <label>Observações</label>
              <input value={form.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
