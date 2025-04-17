import { createClient } from '@supabase/supabase-js'
import type { SupabaseConfig, ConnectionResult } from './types'

export function saveSupabaseConfig(config: SupabaseConfig) {
    localStorage.setItem('supabase_config', JSON.stringify(config))
}

export function getSupabaseConfig(): SupabaseConfig | null {
    const config = localStorage.getItem('supabase_config')
    return config ? JSON.parse(config) : null
}

export function clearSupabaseConfig() {
    localStorage.removeItem('supabase_config')
}

export function createSupabaseClient(url: string, key: string) {
    return createClient(url, key)
}

function validateCredentials(url: string, key: string): string | null {
    if (!url.startsWith('https://')) {
        return 'A URL deve começar com https://'
    }

    if (key.length < 20) {
        return 'A chave anônima deve ter pelo menos 20 caracteres'
    }

    return null
}

export async function testConnection(url: string, key: string): Promise<ConnectionResult> {
    try {
        // Primeiro valida as credenciais
        const validationError = validateCredentials(url, key)
        if (validationError) {
            return {
                success: false,
                message: validationError
            }
        }

        // Faz a requisição GraphQL para introspecção
        const response = await fetch(`${url}/graphql/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                query: `
                    query {
                        __schema {
                            queryType {
                                fields {
                                    name
                                    description
                                }
                            }
                        }
                    }
                `
            })
        })

        if (!response.ok) {
            throw new Error(`Erro na conexão: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Filtra apenas as tabelas (excluindo campos que terminam com _by_pk)
        const tables = data.data.__schema.queryType.fields
            .filter((field: any) => !field.name.endsWith('_by_pk'))
            .map((field: any) => ({
                // Remove o "Collection" do final do nome, se existir
                name: field.name,
                description: field.description || 'Sem descrição disponível'
            }))

        // Se chegou até aqui, a conexão foi bem sucedida
        saveSupabaseConfig({ url, key })

        return {
            success: true,
            message: `Conexão estabelecida com sucesso! ${tables.length} tabelas encontradas.`,
            tables
        }

    } catch (error) {
        console.error('Erro ao testar conexão:', error)
        return {
            success: false,
            message: 'Erro ao conectar com o Supabase. Verifique suas credenciais.',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
    }
} 