import { supabase } from '../lib/supabaseClient'

export async function ajustarEstoque(produtoId, tipo, valor, motivo = '', responsavelId = null) {
  const { data: prod, error: e1 } = await supabase.from('produtos').select('id,nome,quantidade').eq('id', produtoId).single()
  if (e1 || !prod) return { data: null, error: e1 || new Error('Produto não encontrado') }
  const atual = Number(prod.quantidade ?? 0)
  const v = Number(valor ?? 0)
  let nova = atual
  if (tipo === 'INC') nova = atual + v
  else if (tipo === 'DEC') nova = Math.max(0, atual - v)
  else if (tipo === 'SET') nova = Math.max(0, v)
  const delta = nova - atual
  const { data: up, error: e2 } = await supabase.from('produtos').update({ quantidade: nova }).eq('id', produtoId).select().single()
  if (e2) return { data: null, error: e2 }
  const ajustePayload = {
    produto_id: produtoId,
    produto_nome: prod.nome || '',
    tipo,
    delta,
    quantidade_anterior: atual,
    quantidade_nova: nova,
    motivo: motivo || '',
    responsavel_id: responsavelId
  }
  const { error: e3 } = await supabase.from('ajustes_estoque').insert([ajustePayload])
  if (e3) return { data: up, error: e3 }
  return { data: up, error: null }
}

export async function listarAjustes({ search = '', de = '', ate = '', limit = 100 } = {}) {
  let q = supabase.from('ajustes_estoque').select('*').order('criado_em', { ascending: false }).limit(limit)
  if (search) q = q.or(`produto_nome.ilike.%${search}%,motivo.ilike.%${search}%`)
  if (de) q = q.gte('criado_em', new Date(de).toISOString())
  if (ate) q = q.lte('criado_em', new Date(ate).toISOString())
  const { data, error } = await q
  if (error) return { data: [], error }
  return { data: data || [], error: null }
}
