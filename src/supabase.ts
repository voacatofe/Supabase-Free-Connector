import { createClient } from '@supabase/supabase-js'
import type { SupabaseConfig, ConnectionResult, TablePreviewResult } from './types/supabase'

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

        // Primeiro faz uma requisição GraphQL para obter as tabelas disponíveis
        const schemaResponse = await fetch(`${url}/graphql/v1`, {
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

        if (!schemaResponse.ok) {
            throw new Error(`Erro na conexão: ${schemaResponse.statusText}`)
        }

        const schemaData = await schemaResponse.json()
        
        // Filtra apenas as tabelas (excluindo campos que terminam com _by_pk)
        const tableNames = schemaData.data.__schema.queryType.fields
            .filter((field: any) => !field.name.endsWith('_by_pk'))
            .filter((field: any) => field.name !== 'node')
            .map((field: any) => field.name)

        // Para cada tabela, obtém informações detalhadas da estrutura via API RESTful
        const tables = await Promise.all(
            tableNames.map(async (tableName: string) => {
                try {
                    // Obtém a estrutura da tabela usando a API RESTful
                    const tableInfoResponse = await fetch(`${url}/rest/v1/${tableName}?limit=0`, {
                        method: 'GET',
                        headers: {
                            'apikey': key,
                            'Authorization': `Bearer ${key}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Prefer': 'count=exact'
                        }
                    })

                    if (!tableInfoResponse.ok) {
                        console.warn(`Erro ao obter estrutura da tabela ${tableName}:`, tableInfoResponse.statusText)
                        return {
                            name: tableName,
                            description: 'Tabela disponível para consulta',
                            columns: []
                        }
                    }

                    // Obtém a estrutura da tabela a partir do cabeçalho
                    const contentRange = tableInfoResponse.headers.get('content-range')
                    const rowCount = contentRange ? parseInt(contentRange.split('/')[1]) : 0

                    // Obtém as definições de coluna da tabela usando outra API
                    const columnResponse = await fetch(`${url}/rest/v1/`, {
                        method: 'GET',
                        headers: {
                            'apikey': key,
                            'Authorization': `Bearer ${key}`
                        }
                    })

                    const definitions = await columnResponse.json()
                    const tableDefinition = definitions.definitions && definitions.definitions[tableName]
                    
                    // Extrai as colunas da definição da tabela
                    const columns = tableDefinition && tableDefinition.properties 
                        ? Object.entries(tableDefinition.properties).map(([name, props]: [string, any]) => ({
                            name,
                            type: props.type || 'string',
                            description: props.description || '',
                            isNullable: !tableDefinition.required?.includes(name),
                            isList: props.type === 'array'
                        }))
                        : []

                    return {
                        name: tableName,
                        description: `${tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/Collection$/, '')}`,
                        columns,
                        rowCount
                    }
                } catch (error) {
                    console.error(`Erro ao obter estrutura da tabela ${tableName}:`, error)
                    return {
                        name: tableName,
                        description: 'Não foi possível carregar a estrutura desta tabela',
                        columns: []
                    }
                }
            })
        )

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

// Função para obter uma amostra de dados de uma tabela específica
export async function fetchTablePreview(config: SupabaseConfig, tableName: string, limit: number = 5): Promise<TablePreviewResult> {
    try {
        const { url, key } = config;
        
        // Remover "Collection" do final do nome da tabela, se presente
        const cleanTableName = tableName.replace(/Collection$/, '');
        
        // Usar a API RESTful para obter os dados da tabela
        const response = await fetch(`${url}/rest/v1/${tableName}?limit=${limit}`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            success: true,
            data: Array.isArray(data) ? data : []
        };
    } catch (error) {
        console.error('Erro ao buscar prévia da tabela:', error);
        return {
            success: false,
            message: 'Não foi possível obter uma prévia da tabela',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
} 