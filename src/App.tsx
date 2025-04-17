import { useState, useEffect } from 'react'
import { framer } from "framer-plugin"
import "./App.css"
import { SupabaseConfigForm } from './components/SupabaseConfig'
import { TableSelector } from './components/TableSelector'
// Import de funções do Framer
import { isConfigureMode, isSyncMode, isCanvasMode } from './services/framer'
import type { SupabaseConfig, TableInfo } from './types'
import { getSupabaseConfig, clearSupabaseConfig, testConnection } from './supabase'
import { quickSyncDataToFramer, SyncResult, formatLastSyncTime } from './utils/sync'

// Declaração para estender a API do Framer com o método createCollection
declare module "framer-plugin" {
    interface FramerPluginAPI {
        createCollection(options: {
            name: string;
            type: string;
            fields: Array<{ name: string; type: string }>;
        }): Promise<any>;
    }
}

// Configura a UI baseado no modo do Framer
if (isCanvasMode()) {
    framer.showUI({
        position: "center",
        width: 500, // Aumentado para acomodar os novos componentes
        height: 700, // Aumentado para acomodar os novos componentes
    })
} else if (isConfigureMode()) {
    // Modo de configuração - mostra UI para configurar o plugin
    framer.showUI({
        position: "center",
        width: 500,
        height: 700,
    })
} else if (isSyncMode()) {
    // Em modo de sincronização, não mostramos UI inicial
    // A sincronização será iniciada automaticamente
}

export function App() {
    const [config, setConfig] = useState<SupabaseConfig | null>(null)
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
    const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined)
    const [showResetConfirm, setShowResetConfirm] = useState(false)

    // Carrega as credenciais salvas quando o plugin é aberto
    useEffect(() => {
        console.log('Carregando configurações iniciais...');
        const savedConfig = getSupabaseConfig()
        
        if (savedConfig) {
            console.log('Configuração encontrada, fazendo teste de conexão inicial');
            setConfig(savedConfig)
            
            // Fazer um teste de conexão inicial para carregar as tabelas
            const testInitialConnection = async () => {
                try {
                    console.log('Testando conexão inicial...');
                    const result = await testConnection(savedConfig.url, savedConfig.key);
                    console.log('Resultado do teste inicial:', {
                        success: result.success,
                        tablesCount: result.tables?.length || 0
                    });
                    
                    if (result.success && result.tables) {
                        setTables(result.tables);
                        console.log(`${result.tables.length} tabelas carregadas no estado inicial`);
                        
                        // Se estamos no modo de sincronização, inicie a sincronização automaticamente
                        if (isSyncMode() && result.tables.length > 0) {
                            // Tenta sincronizar a primeira tabela disponível
                            await syncTable(result.tables[0]);
                            // Fecha o plugin automaticamente após a sincronização
                            await framer.closePlugin();
                        }
                    }
                } catch (error) {
                    console.error('Erro ao testar conexão inicial:', error);
                }
            };
            
            testInitialConnection();
        } else {
            console.log('Nenhuma configuração encontrada');
        }
    }, []) // Executa apenas uma vez na montagem do componente

    // Função para sincronizar uma tabela específica
    const syncTable = async (table: TableInfo) => {
        if (!config) return;
        
        setIsSyncing(true);
        
        try {
            // Usa a nova função de sincronização rápida que não requer mapeamento
            const result = await quickSyncDataToFramer(config, table);
            setLastSyncResult(result);
            
            if (result.success) {
                setLastSyncTime(new Date());
            }
            
            return result;
        } catch (error) {
            const errorResult: SyncResult = {
                success: false,
                message: 'Erro durante a sincronização',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
            
            setLastSyncResult(errorResult);
            return errorResult;
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveConfig = (url: string, key: string) => {
        setConfig({ url, key })
    }

    const handleResetClick = () => {
        setShowResetConfirm(true)
    }

    const handleResetConfirm = () => {
        console.log('Confirmado reset da conexão. Limpando dados...');
        clearSupabaseConfig()
        setConfig(null)
        setTables([])
        setSelectedTable(null)
        setLastSyncResult(null)
        setLastSyncTime(undefined)
        setShowResetConfirm(false)
        console.log('Dados limpos com sucesso. Estado atual:', {
            config: null,
            tablesCount: 0,
            selectedTable: null
        });
    }

    const handleResetCancel = () => {
        setShowResetConfirm(false)
    }

    const handleTestResult = (result: any) => {
        console.log('Resultado do teste de conexão:', {
            success: result.success,
            tablesCount: result.tables?.length || 0
        });
        
        if (result.success && result.tables) {
            setTables(result.tables)
            console.log(`Tabelas definidas: ${result.tables.length}`);
        }
    }

    const handleSelectTable = (table: TableInfo) => {
        setSelectedTable(table)
        setLastSyncResult(null) // Limpa resultados anteriores ao selecionar nova tabela
    }

    // Função para sincronizar dados
    const handleSyncData = async () => {
        if (!config || !selectedTable || isSyncing) return;
        
        return syncTable(selectedTable);
    };

    // Retorna vazio para o modo de sincronização
    if (isSyncMode()) {
        return null;
    }

    const renderContent = () => {
        console.log('Renderizando conteúdo com config:', config ? 'existente' : 'nulo', 'e tabelas:', tables.length);
        
        if (!config) {
            return (
                <SupabaseConfigForm 
                    onSaveConfig={handleSaveConfig} 
                    initialUrl={''}
                    initialKey={''}
                    onResetConfig={handleResetConfirm}
                    isConfigured={false}
                    onTestResult={handleTestResult}
                />
            )
        }

        return (
            <div style={{
                borderTop: '1px solid var(--framer-color-divider)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div>
                    <h2 style={{
                        fontSize: '16px',
                        fontWeight: 500,
                        marginBottom: '12px',
                        color: 'var(--framer-color-text)'
                    }}>
                        Tabelas Disponíveis
                    </h2>
                    
                    <TableSelector 
                        tables={tables} 
                        config={config}
                        onSelectTable={handleSelectTable}
                        selectedTableName={selectedTable?.name}
                    />

                    {selectedTable && (
                        <div style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={handleSyncData}
                                disabled={isSyncing}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    backgroundColor: 'var(--framer-color-tint)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                                    opacity: isSyncing ? 0.5 : 1
                                }}
                            >
                                {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                            </button>
                        </div>
                    )}

                    {lastSyncResult && (
                        <div style={{ 
                            marginTop: '16px',
                            padding: '12px',
                            borderRadius: '4px',
                            backgroundColor: lastSyncResult.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                            border: `1px solid ${lastSyncResult.success ? 'rgba(0, 128, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'}`,
                            color: 'var(--framer-color-text)'
                        }}>
                            <p style={{ margin: 0, fontWeight: 500 }}>
                                {lastSyncResult.success ? '✅ ' : '❌ '}
                                {lastSyncResult.message}
                            </p>
                            
                            {lastSyncResult.success && lastSyncResult.totalRecords !== undefined && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                                    Total de registros: {lastSyncResult.totalRecords}
                                </p>
                            )}
                            
                            {lastSyncTime && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                                    Última sincronização: {formatLastSyncTime(lastSyncTime)}
                                </p>
                            )}
                            
                            {!lastSyncResult.success && lastSyncResult.error && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'rgba(255, 0, 0, 0.8)' }}>
                                    Erro: {lastSyncResult.error}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <button
                        type="button"
                        onClick={handleResetClick}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: 'var(--framer-color-danger)',
                            border: '1px solid var(--framer-color-danger)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Redefinir Conexão
                    </button>
                </div>
                
                {showResetConfirm && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            maxWidth: '90%',
                            width: '400px'
                        }}>
                            <h3 style={{
                                margin: '0 0 16px 0',
                                color: 'var(--framer-color-text)'
                            }}>
                                Confirmar Redefinição
                            </h3>
                            
                            <p style={{
                                margin: '0 0 20px 0',
                                color: 'var(--framer-color-text-secondary)'
                            }}>
                                Tem certeza de que deseja redefinir a conexão do Supabase? Essa ação não pode ser desfeita.
                            </p>
                            
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={handleResetCancel}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'transparent',
                                        color: 'var(--framer-color-text)',
                                        border: '1px solid var(--framer-color-divider)',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                
                                <button
                                    onClick={handleResetConfirm}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--framer-color-danger)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Redefinir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="container">
            <header className="header">
                <h1 style={{
                    fontSize: '20px',
                    margin: 0,
                    color: 'var(--framer-color-text)'
                }}>
                    Supabase Free Connect
                </h1>
                <p style={{
                    fontSize: '14px',
                    margin: '4px 0 0 0',
                    color: 'var(--framer-color-text-secondary)'
                }}>
                    Conecte dados do Supabase ao Framer
                </p>
            </header>
            
            {renderContent()}
        </div>
    )
}
