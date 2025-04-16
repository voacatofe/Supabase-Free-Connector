import { createClient } from '@supabase/supabase-js'

// Configuração do cliente Supabase
export const createSupabaseClient = (url: string, key: string) => {
  return createClient(url, key)
}

// Função para testar a conexão
export const testConnection = async (url: string, key: string) => {
  try {
    const client = createSupabaseClient(url, key)
    const { data, error } = await client.from('_tables').select('*').limit(1)
    
    if (error) throw error
    return { success: true, message: 'Conexão estabelecida com sucesso!' }
  } catch (error) {
    return { 
      success: false, 
      message: 'Erro ao conectar com o Supabase',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
} 