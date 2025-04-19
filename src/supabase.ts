import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig, ConnectionResult, TablePreviewResult, TableInfo, ColumnInfo } from './types/supabase'

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
        console.log('-------------------------------');
        console.log('Iniciando teste de conexão com Supabase...');
        console.log('URL:', url);
        console.log('Key (primeiros 5 chars):', key.substring(0, 5) + '...');
        
        // Primeiro valida as credenciais
        const validationError = validateCredentials(url, key)
        if (validationError) {
            console.error('Erro de validação:', validationError);
            return {
                success: false,
                message: validationError
            }
        }

        // Cria um cliente Supabase para fazer a consulta
        const supabase = createClient(url, key);
        
        // Como visto nos logs, o método GraphQL é o que está funcionando melhor
        // Então vamos tentar esse método primeiro para obter as tabelas
        console.log('Tentando obter tabelas via GraphQL...');
        const tableNames = await fetchTablesViaGraphQL(url, key);
        
        if (tableNames.length === 0) {
            // Se o GraphQL falhar, tente métodos alternativos como fallback
            console.log('GraphQL falhou, tentando métodos alternativos...');
            
            // Tenta o método OpenAPI
            const openApiNames = await fetchTablesViaOpenAPI(url, key);
            if (openApiNames.length > 0) {
                tableNames.push(...openApiNames);
            } else {
                // Tenta um terceiro método com tabelas comuns
                console.log('Tentando último recurso: verificação manual de tabelas comuns...');
                const commonTables = ['users', 'profiles', 'posts', 'products', 'items', 'blog', 'documents', 'todos'];
                const testResults = await testCommonTables(url, key, commonTables);
                tableNames.push(...testResults);
            }
        }
        
        // Garantir que a tabela 'node' seja removida (caso tenha sido incluída de alguma forma)
        const filteredTableNames = tableNames.filter(name => name !== 'node');
        
        if (filteredTableNames.length === 0) {
            console.warn('Nenhuma tabela encontrada através dos métodos disponíveis');
            saveSupabaseConfig({ url, key });
            return {
                success: true,
                message: "Conexão estabelecida, mas não foram encontradas tabelas.",
                tables: []
            };
        }
        
        // Processa as tabelas encontradas (sem a tabela 'node')
        const tables = await processTableNames(url, key, filteredTableNames);
        
        // Salva a configuração e retorna sucesso
        saveSupabaseConfig({ url, key });
        
        const resultMessage = `Conexão estabelecida com sucesso! ${tables.length} tabelas encontradas.`;
        console.log(resultMessage);
        console.log('-------------------------------');
        
        return {
            success: true,
            message: resultMessage,
            tables
        };
    } catch (error) {
        console.error('Erro fatal ao testar conexão:', error);
        console.log('-------------------------------');
        return {
            success: false,
            message: 'Erro ao conectar com o Supabase. Verifique suas credenciais.',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

// Função para obter tabelas via GraphQL introspection
async function fetchTablesViaGraphQL(url: string, key: string): Promise<string[]> {
    try {
        console.log('Executando consulta GraphQL para obter tabelas...');
        const graphqlQuery = {
            query: `
                query {
                    __schema {
                        queryType {
                            fields {
                                name
                            }
                        }
                    }
                }
            `
        };
        
        const graphqlResponse = await fetch(`${url}/graphql/v1`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(graphqlQuery)
        });
        
        if (!graphqlResponse.ok) {
            console.error('Erro na introspection GraphQL:', graphqlResponse.statusText);
            return [];
        }
        
        const graphqlData = await graphqlResponse.json();
        console.log('Resposta GraphQL bruta:', graphqlData);
        
        if (graphqlData.data && 
            graphqlData.data.__schema && 
            graphqlData.data.__schema.queryType && 
            graphqlData.data.__schema.queryType.fields) {
            
            // Filtra os campos para pegar apenas os que são tabelas e remove Collection
            // Também excluímos explicitamente a tabela "node" conforme solicitado
            const tableNames = graphqlData.data.__schema.queryType.fields
                .map((field: any) => field.name)
                .filter((name: string) => 
                    name !== 'node' && 
                    !name.endsWith('_by_pk') && 
                    !name.endsWith('_aggregate') && 
                    !name.endsWith('_stream')
                )
                .map((name: string) => name.replace(/Collection$/, '')); // Remove Collection imediatamente
            
            console.log('Tabelas encontradas via GraphQL (sem Collection):', tableNames);
            return tableNames;
        }
    } catch (error) {
        console.error('Falha ao obter tabelas via GraphQL:', error);
    }
    
    return [];
}

// Função para obter tabelas via OpenAPI spec
async function fetchTablesViaOpenAPI(url: string, key: string): Promise<string[]> {
    try {
        console.log('Tentando obter tabelas via OpenAPI spec...');
        
        const openApiResponse = await fetch(`${url}/rest/v1/openapi.json`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        if (openApiResponse.ok) {
            const openApiSpec = await openApiResponse.json();
            
            if (openApiSpec && openApiSpec.paths) {
                // Extrai nomes de tabelas do objeto paths e remove Collection
                // Filtra rotas que são tabelas (começam com / e não contêm /rpc/ ou parâmetros extras)
                // Também excluímos explicitamente a tabela "node"
                const tableNames = Object.keys(openApiSpec.paths)
                    .filter(path => /^\/[A-Za-z0-9_]+$/.test(path) && path !== '/node')
                    .map(path => path.slice(1)) // Remove a barra inicial
                    .map((name: string) => name.replace(/Collection$/, '')); // Remove Collection imediatamente
                
                console.log('Tabelas encontradas via OpenAPI (sem Collection):', tableNames);
                if (tableNames.length > 0) {
                    return tableNames;
                }
            }
        } else {
            console.warn('Não foi possível obter o OpenAPI spec:', openApiResponse.statusText);
        }
    } catch (error) {
        console.error('Falha ao obter tabelas via OpenAPI:', error);
    }
    
    return [];
}

// Função auxiliar para buscar tabelas via API (mantida para compatibilidade)
async function fetchTablesViaAPI(url: string, key: string): Promise<string[]> {
    // Primeiro tenta GraphQL, depois OpenAPI
    const graphqlTables = await fetchTablesViaGraphQL(url, key);
    if (graphqlTables.length > 0) {
        return graphqlTables;
    }
    
    return await fetchTablesViaOpenAPI(url, key);
}

// Função auxiliar para testar tabelas comuns
async function testCommonTables(url: string, key: string, tables: string[]): Promise<string[]> {
    // Remover a tabela 'node' da lista de tabelas comuns para testar
    const filteredTables = tables.filter(table => table !== 'node');
    
    const testResults = await Promise.all(
        filteredTables.map(async (tableName) => {
            try {
                console.log(`Testando tabela comum: ${tableName}`);
                const response = await fetch(`${url}/rest/v1/${tableName}?limit=1`, {
                    method: 'GET',
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`
                    }
                });
                
                if (response.ok) {
                    console.log(`Tabela comum encontrada: ${tableName}`);
                    return tableName;
                }
                return null;
            } catch (e) {
                console.log(`Erro ao testar tabela ${tableName}:`, e);
                return null;
            }
        })
    );
    
    // Filtra apenas as tabelas que existem
    return testResults.filter(name => name !== null) as string[];
}

// Função para processar os nomes das tabelas e obter mais detalhes
async function processTableNames(url: string, key: string, tableNames: string[]): Promise<TableInfo[]> {
    console.log(`Processando ${tableNames.length} tabelas...`);
    const supabase = createClient(url, key);
    
    const tablesWithColumns: TableInfo[] = await Promise.all(
        tableNames.map(async (tableName) => {
            try {
                // A esta altura, tableName já deve estar sem o sufixo Collection
                console.log(`Obtendo estrutura da tabela: ${tableName}`);
                
                // Vamos começar direto com a inferência a partir dos dados
                // já que é o método que está funcionando conforme vimos nos logs
                console.log(`Inferindo colunas a partir de dados para ${tableName}...`);
                let columns: ColumnInfo[] = [];
                
                // Método para inferir colunas: obter alguns registros para inferir estrutura
                const { data: sampleData, error: sampleError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(5);
                
                if (!sampleError && sampleData && sampleData.length > 0) {
                    columns = Object.keys(sampleData[0]).map(name => ({
                        name,
                        type: typeof sampleData[0][name],
                        isNullable: true // assumimos que é nullable por padrão
                    }));
                    console.log(`Inferidas ${columns.length} colunas da tabela ${tableName} com base em amostra`);
                } else {
                    console.warn(`Não foi possível obter dados para inferir colunas da tabela ${tableName}`);
                    
                    // Apenas como fallback, tenta usar a função RPC (provavelmente vai falhar)
                    try {
                        const { data: columnData, error: columnError } = await supabase
                            .rpc('get_table_columns', { table_name: tableName })
                            .select('*');
                        
                        if (!columnError && columnData && columnData.length > 0) {
                            columns = columnData.map(col => ({
                                name: col.column_name,
                                type: col.data_type,
                                isNullable: col.is_nullable === 'YES',
                                description: col.comment || undefined
                            }));
                            console.log(`Obtidas ${columns.length} colunas da tabela ${tableName} via RPC`);
                        }
                    } catch (e) {
                        // Ignora o erro silenciosamente, já que esperamos que esse método falhe
                    }
                }
                
                // Se nenhum método funcionou, retorna uma estrutura mínima
                if (columns.length === 0) {
                    console.warn(`Não foi possível obter estrutura para tabela ${tableName}`);
                    return {
                        name: tableName,
                        columns: [],
                        schema: 'public'
                    };
                }
                
                return {
                    name: tableName,
                    columns: columns,
                    schema: 'public'
                };
            } catch (error) {
                console.error(`Erro ao processar tabela ${tableName}:`, error);
                // Retorna a tabela com informações mínimas em caso de erro
                return {
                    name: tableName,
                    columns: [],
                    schema: 'public'
                };
            }
        })
    );
    
    return tablesWithColumns;
}

// Função para verificar se o banco de dados tem uma stored procedure específica
// Esta função será usada para verificar se podemos usar o método RPC para obter colunas
async function hasStoredProcedure(supabase: SupabaseClient, procedureName: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('pg_proc')
            .select('proname')
            .eq('proname', procedureName)
            .limit(1);
            
        return !error && data && data.length > 0;
    } catch (e) {
        console.error('Erro ao verificar stored procedure:', e);
        return false;
    }
}

// Função para obter uma amostra de dados de uma tabela específica
export async function fetchTablePreview(config: SupabaseConfig, tableName: string, limit: number = 5): Promise<TablePreviewResult> {
    try {
        const { url, key } = config;
        
        console.log(`Obtendo prévia da tabela: ${tableName}`);
        
        // Usar a API RESTful para obter os dados da tabela - tableName já deve estar sem Collection
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