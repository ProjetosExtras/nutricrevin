import { supabase } from '../lib/supabaseClient'

export async function listarProdutos({ search = '', categoria = '', limit = 50 } = {}) {
  const query = supabase.from('produtos').select('*').limit(limit)
  if (search) {
    query.or(`nome.ilike.%${search}%,marca.ilike.%${search}%,lote.ilike.%${search}%`)
  }
  if (categoria) {
    query.eq('categoria', categoria)
  }
  const { data, error } = await query
  if (error) {
    return { data: [], error }
  }
  return { data, error: null }
}

export async function criarProduto(produto) {
  const sanitize = (v) => (v === '' || v === undefined ? null : v)
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))

  const payload = {
    nome: sanitize(produto.nome),
    marca: sanitize(produto.marca),
    categoria: sanitize(produto.categoria),
    lote: sanitize(produto.lote),
    quantidade: num(produto.quantidade) ?? 0,
    quantidade_minima: num(produto.quantidade_minima) ?? 0,
    unidade_medida: sanitize(produto.unidade_medida),
    validade_original: sanitize(produto.validade_original),
    data_manipulacao: sanitize(produto.data_manipulacao),
    validade_final: sanitize(produto.validade_final),
    localizacao: sanitize(produto.localizacao),
    forma_armazenamento: sanitize(produto.forma_armazenamento),
    fornecedor: sanitize(produto.fornecedor),
    preco_unitario: num(produto.preco_unitario) ?? 0,
    responsavel_id: num(produto.responsavel_id),
    observacoes: sanitize(produto.observacoes)
  }

  const { data, error } = await supabase
    .from('produtos')
    .insert([payload])
    .select()
    .single()

  if (error) {
    return { data: null, error }
  }
  return { data, error: null }
}

export async function atualizarProduto(id, produto) {
  const sanitize = (v) => (v === '' || v === undefined ? null : v)
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))

  const payload = {
    nome: sanitize(produto.nome),
    marca: sanitize(produto.marca),
    categoria: sanitize(produto.categoria),
    lote: sanitize(produto.lote),
    quantidade: num(produto.quantidade),
    quantidade_minima: num(produto.quantidade_minima),
    unidade_medida: sanitize(produto.unidade_medida),
    validade_original: sanitize(produto.validade_original),
    data_manipulacao: sanitize(produto.data_manipulacao),
    validade_final: sanitize(produto.validade_final),
    localizacao: sanitize(produto.localizacao),
    forma_armazenamento: sanitize(produto.forma_armazenamento),
    fornecedor: sanitize(produto.fornecedor),
    preco_unitario: num(produto.preco_unitario),
    responsavel_id: num(produto.responsavel_id),
    observacoes: sanitize(produto.observacoes)
  }

  const { data, error } = await supabase
    .from('produtos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    return { data: null, error }
  }
  return { data, error: null }
}

export async function listarProdutosRecentes(limit = 5) {
  // Tenta ordenar por 'criado_em', depois 'created_at', por fim 'id'
  let res = await supabase.from('produtos').select('*').order('criado_em', { ascending: false }).limit(limit)
  if (res.error) {
    res = await supabase.from('produtos').select('*').order('created_at', { ascending: false }).limit(limit)
  }
  if (res.error) {
    res = await supabase.from('produtos').select('*').order('id', { ascending: false }).limit(limit)
  }
  if (res.error) {
    return { data: [], error: res.error }
  }
  return { data: res.data || [], error: null }
}
