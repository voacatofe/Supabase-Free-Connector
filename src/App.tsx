import { useState, useEffect } from 'react'
import { framer, CanvasNode } from "framer-plugin"
import "./App.css"
import { SupabaseConfigForm } from './components/SupabaseConfig'
import { TableSelector } from './components/TableSelector'
import type { SupabaseConfig, TableInfo } from './types'
import { getSupabaseConfig, clearSupabaseConfig } from './supabase'

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
    width: 350,
    height: 540,
})

export function App() {
    const [config, setConfig] = useState<SupabaseConfig | null>(null)
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
    const [isCreatingCollection, setIsCreatingCollection] = useState(false)

    // Carrega as credenciais salvas quando o plugin é aberto
    useEffect(() => {
        const savedConfig = getSupabaseConfig()
        if (savedConfig) {
            setConfig(savedConfig)
        }
    }, []) // Executa apenas uma vez na montagem do componente

    const handleSaveConfig = (url: string, key: string) => {
        setConfig({ url, key })
    }

    const handleResetConfig = () => {
        // Dupla confirmação
        const confirmacao1 = confirm("Tem certeza que deseja resetar a conexão? Todos os dados serão perdidos.");
        if (!confirmacao1) return;
        
        const confirmacao2 = confirm("ATENÇÃO: Esta ação não pode ser desfeita. Confirma o reset da conexão?");
        if (!confirmacao2) return;
        
        clearSupabaseConfig()
        setConfig(null)
        setTables([])
        setSelectedTable(null)
    }

    const handleTestResult = (result: any) => {
        if (result.success && result.tables) {
            setTables(result.tables)
        }
    }

    const handleSelectTable = (table: TableInfo) => {
        setSelectedTable(table)
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

            <SupabaseConfigForm 
                onSaveConfig={handleSaveConfig} 
                initialUrl={config?.url || ''}
                initialKey={config?.key || ''}
                onResetConfig={handleResetConfig}
                isConfigured={!!config}
                onTestResult={handleTestResult}
            />

            {config && tables.length > 0 && (
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
                        hideSearch={true}
                    />

                    {selectedTable && (
                        <div style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={() => handleCreateCollection(selectedTable.name)}
                                disabled={isCreatingCollection}
                                className="framer-button-primary"
                                style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: isCreatingCollection ? 'not-allowed' : 'pointer',
                                    opacity: isCreatingCollection ? 0.5 : 1
                                }}
                            >
                                {isCreatingCollection 
                                    ? 'Criando collection...' 
                                    : `Criar Collection a partir de ${selectedTable.name}`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {config && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--framer-color-bg-secondary)',
                    borderRadius: '4px',
                    border: '1px solid var(--framer-color-divider)'
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
            )}
            
            {config && (
                <div style={{ marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={handleResetConfig}
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
                </div>
            )}
        </div>
    )
}
