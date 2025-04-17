import { useState, useEffect } from 'react'
import { framer, CanvasNode } from "framer-plugin"
import "./App.css"
import { SupabaseConfigForm } from './components/SupabaseConfig'
import { TableSelector } from './components/TableSelector'
import { FieldMapper } from './components/FieldMapper'
import { SyncManager } from './components/SyncManager'
import type { SupabaseConfig, TableInfo } from './types'
import type { FieldMapping } from './types/framer'
import { getSupabaseConfig, clearSupabaseConfig, testConnection } from './supabase'

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

framer.showUI({
    position: "center",
    width: 500, // Aumentado para acomodar os novos componentes
    height: 700, // Aumentado para acomodar os novos componentes
})

export function App() {
    const [config, setConfig] = useState<SupabaseConfig | null>(null)
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
    const [isCreatingCollection, setIsCreatingCollection] = useState(false)
    const [activeTab, setActiveTab] = useState<'tables' | 'mapping' | 'sync'>('tables')
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
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
        setFieldMappings([])
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
        // Quando seleciona uma nova tabela, limpa os mapeamentos anteriores
        setFieldMappings([])
    }

    const handleFieldMappingChange = (mappings: FieldMapping[]) => {
        setFieldMappings(mappings)
    }

    const handleCreateCollection = async (tableName: string) => {
        setIsCreatingCollection(true)
        try {
            // Remove "Collection" do final do nome, se existir
            const cleanTableName = tableName.replace(/Collection$/, '');
            
            // Cria uma nova collection no Framer usando a API dinâmica
            // @ts-ignore - O método createCollection existe no runtime mas não está tipado
            const collection = await framer.createCollection({
                name: cleanTableName,
                type: "data",
                fields: [
                    { name: "id", type: "string" },
                    { name: "createdAt", type: "date" },
                    { name: "updatedAt", type: "date" }
                ]
            })

            // Retorna o ID da collection criada
            alert(`Collection criada com sucesso!`);
            return collection.id
        } catch (error) {
            console.error('Erro ao criar collection:', error)
            alert(`Erro ao criar collection: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            throw error
        } finally {
            setIsCreatingCollection(false)
        }
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

        if (activeTab === 'tables') {
            console.log('Renderizando aba de tabelas com', tables.length, 'tabelas disponíveis');
            return (
                <div style={{
                    borderTop: '1px solid var(--framer-color-divider)',
                    paddingTop: '16px'
                }}>
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
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => handleCreateCollection(selectedTable.name)}
                                disabled={isCreatingCollection}
                                className="framer-button-primary"
                                style={{
                                    flex: 1,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: isCreatingCollection ? 'not-allowed' : 'pointer',
                                    opacity: isCreatingCollection ? 0.5 : 1
                                }}
                            >
                                {isCreatingCollection 
                                    ? 'Criando collection...' 
                                    : 'Criar Collection'}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setActiveTab('mapping')}
                                style={{
                                    flex: 1,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    backgroundColor: 'var(--framer-color-tint)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Mapear Campos
                            </button>
                        </div>
                    )}
                </div>
            )
        }

        if (activeTab === 'mapping' && selectedTable) {
            return (
                <div>
                    <FieldMapper 
                        table={selectedTable}
                        config={config}
                        onFieldMappingsChange={handleFieldMappingChange}
                        initialMappings={fieldMappings}
                    />
                    
                    <div style={{ 
                        marginTop: '16px', 
                        display: 'flex', 
                        gap: '8px' 
                    }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('tables')}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 500,
                                backgroundColor: 'var(--framer-color-bg-secondary)',
                                color: 'var(--framer-color-text)',
                                border: '1px solid var(--framer-color-divider)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Voltar para Tabelas
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => setActiveTab('sync')}
                            disabled={fieldMappings.length === 0}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 500,
                                backgroundColor: 'var(--framer-color-tint)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: fieldMappings.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: fieldMappings.length === 0 ? 0.5 : 1
                            }}
                        >
                            Prosseguir para Sincronização
                        </button>
                    </div>
                </div>
            )
        }

        if (activeTab === 'sync' && selectedTable && fieldMappings.length > 0) {
            return (
                <div>
                    <SyncManager 
                        table={selectedTable}
                        config={config}
                        fieldMappings={fieldMappings}
                    />
                    
                    <div style={{ 
                        marginTop: '16px', 
                        display: 'flex', 
                        justifyContent: 'flex-start'
                    }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('mapping')}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 500,
                                backgroundColor: 'var(--framer-color-bg-secondary)',
                                color: 'var(--framer-color-text)',
                                border: '1px solid var(--framer-color-divider)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Voltar para Mapeamento
                        </button>
                    </div>
                </div>
            )
        }

        return (
            <div style={{
                padding: '20px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                border: '1px solid var(--framer-color-divider)',
                borderRadius: '4px',
                textAlign: 'center'
            }}>
                <p style={{ fontSize: '14px', color: 'var(--framer-color-text-secondary)' }}>
                    Selecione uma tabela para começar
                </p>
            </div>
        )
    }

    return (
        <div style={{
            backgroundColor: 'var(--framer-color-bg)',
            color: 'var(--framer-color-text)',
            padding: '20px',
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ 
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--framer-color-text)',
                    marginBottom: '8px'
                }}>
                    Supabase Free Connect
                </h1>
                <p style={{
                    fontSize: '13px',
                    color: 'var(--framer-color-text-secondary)',
                    marginBottom: '1px'
                }}>
                    {config 
                        ? 'Sua conexão está configurada com sucesso'
                        : 'Configure sua conexão com o Supabase gratuitamente'}
                </p>
            </div>

            {/* Renderiza o conteúdo baseado no estado */}
            {renderContent()}

            {/* Sempre mostra a configuração salva e o botão de resetar no rodapé */}
            {config && (
                <div style={{
                    marginTop: 'auto',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--framer-color-divider)'
                }}>
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'var(--framer-color-bg-secondary)',
                        borderRadius: '4px',
                        border: '1px solid var(--framer-color-divider)',
                        marginBottom: '12px'
                    }}>
                        <h2 style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            marginBottom: '8px',
                            color: 'var(--framer-color-text)'
                        }}>
                            Configuração Salva
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--framer-color-text-secondary)' }}>
                                <span style={{ fontWeight: 500 }}>URL:</span> {config.url}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--framer-color-text-secondary)' }}>
                                <span style={{ fontWeight: 500 }}>Chave:</span>{' '}
                                {'*'.repeat(Math.min(config.key.length, 20))}
                            </p>
                        </div>
                    </div>

                    {!showResetConfirm ? (
                        <button
                            type="button"
                            onClick={handleResetClick}
                            className="framer-button-danger"
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                backgroundColor: '#e53e3e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                        >
                            Resetar Conexão
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleResetCancel}
                                style={{
                                    flex: 1,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    backgroundColor: 'var(--framer-color-bg-secondary)',
                                    color: 'var(--framer-color-text)',
                                    border: '1px solid var(--framer-color-divider)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleResetConfirm}
                                className="framer-button-danger"
                                style={{
                                    flex: 1,
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    backgroundColor: '#e53e3e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Confirmar Reset
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
