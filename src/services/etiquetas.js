import { supabase } from '../lib/supabaseClient'

export async function registrarEtiquetas(itens) {
  const rows = (itens || []).map((s) => ({
    produto_id: s.id ?? null,
    nome: s.nome ?? null,
    marca: s.marca ?? null,
    lote: s.lote ?? null,
    data_manipulacao: s.manipulacao || null,
    data_validade: s.validade || null,
    armazenamento: s.armazenamento ?? null,
    quantidade_produto: s.quantidadeProduto === '' ? null : Number(s.quantidadeProduto),
    unidade: s.unidade ?? null,
    qtd_etiquetas: s.qtd === '' ? 0 : Number(s.qtd),
  }))
  const { data, error } = await supabase.from('etiquetas').insert(rows).select()
  if (error) {
    return { data: null, error }
  }
  return { data, error: null }
}

export async function listarEtiquetasRecentes(limit = 5) {
  const { data, error } = await supabase
    .from('etiquetas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    return { data: [], error }
  }
  return { data, error: null }
}
