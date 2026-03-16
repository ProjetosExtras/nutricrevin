import { supabase } from '../lib/supabaseClient'

export async function listarProdutos({ search = '', categoria = '', limit = 50, page = null, offset = null, withCount = false } = {}) {
  const query = withCount ? supabase.from('produtos').select('*', { count: 'exact' }) : supabase.from('produtos').select('*')
  if (search) {
    query.or(`nome.ilike.%${search}%,marca.ilike.%${search}%,lote.ilike.%${search}%`)
  }
  if (categoria) {
    query.eq('categoria', categoria)
  }
  if (offset !== null && offset !== undefined) {
    const from = Number(offset) || 0
    query.range(from, from + limit - 1)
  } else if (page !== null && page !== undefined) {
    const p = Math.max(1, Number(page) || 1)
    const from = (p - 1) * limit
    query.range(from, from + limit - 1)
  } else {
    query.limit(limit)
  }
  const { data, error, count } = await query
  if (error) {
    return { data: [], error, count: withCount ? 0 : null }
  }
  return { data, error: null, count: withCount ? (count || 0) : null }
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

export async function deletarProduto(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) {
    return { error }
  }
  return { error: null }
}
