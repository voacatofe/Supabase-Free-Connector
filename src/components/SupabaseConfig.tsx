import React, { useState } from 'react'
import { testConnection } from '../supabase'
import type { ConnectionResult, TableInfo } from '../types'

interface SupabaseConfigFormProps {
  onSaveConfig: (url: string, key: string) => void
}

export function SupabaseConfigForm({ onSaveConfig }: SupabaseConfigFormProps) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSelectedTable(null)
    
    try {
      const result = await testConnection(url, key)
      setTestResult(result)
      
      if (result.success) {
        onSaveConfig(url, key)
        // Seleciona a primeira tabela disponível (que não seja "node")
        if (result.tables && result.tables.length > 0) {
          const availableTables = result.tables
            .filter(table => table.name !== 'node')
            .map(table => formatTableName(table.name))
          
          if (availableTables.length > 0) {
            setSelectedTable(availableTables[0])
          }
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao testar conexão',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para formatar o nome da tabela (remover "Collection" se existir)
  const formatTableName = (name: string): string => {
    return name.replace(/Collection$/, '')
  }

  // Filtrar tabelas disponíveis (excluindo "node")
  const getAvailableTables = () => {
    if (!testResult?.tables) return []
    return testResult.tables.filter(table => table.name !== 'node')
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%'
      }}
    >
      <div>
        <label 
          htmlFor="url"
          style={{ 
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--framer-color-text)'
          }}
        >
          URL do Projeto
        </label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://seu-projeto.supabase.co"
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid var(--framer-color-divider)',
            borderRadius: '4px',
            backgroundColor: 'var(--framer-color-bg-secondary)',
            color: 'var(--framer-color-text)',
            outline: 'none'
          }}
        />
      </div>

      <div>
        <label
          htmlFor="key"
          style={{ 
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--framer-color-text)'
          }}
        >
          Chave Anônima
        </label>
        <input
          id="key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          placeholder="sua-chave-anonima"
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid var(--framer-color-divider)',
            borderRadius: '4px',
            backgroundColor: 'var(--framer-color-bg-secondary)',
            color: 'var(--framer-color-text)',
            outline: 'none'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="framer-button-primary"
        style={{
          width: '100%',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.5 : 1,
          marginTop: '4px'
        }}
      >
        {isLoading ? 'Testando conexão...' : 'Testar Conexão'}
      </button>

      {testResult && (
        <div style={{
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: testResult.success 
            ? 'var(--framer-color-bg-secondary)'
            : 'var(--framer-color-bg-secondary)',
          border: '1px solid var(--framer-color-divider)',
          marginTop: '4px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: testResult.success
              ? 'var(--framer-color-tint)'
              : 'var(--framer-color-text-tertiary)'
          }}>
            {testResult.message}
          </p>

          {testResult.success && testResult.tables && getAvailableTables().length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--framer-color-text)',
                  margin: 0
                }}>
                  Selecione uma tabela:
                </p>
                {selectedTable && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--framer-color-text-secondary)',
                    margin: 0
                  }}>
                    Tabela: {selectedTable}
                  </p>
                )}
              </div>
              
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                backgroundColor: 'var(--framer-color-bg)',
                borderRadius: '4px',
                border: '1px solid var(--framer-color-divider)'
              }}>
                {getAvailableTables().map((table, index) => {
                  const formattedName = formatTableName(table.name);
                  const availableTables = getAvailableTables();
                  return (
                    <div
                      key={table.name}
                      style={{
                        padding: '8px 10px',
                        borderBottom: index < availableTables.length - 1
                          ? '1px solid var(--framer-color-divider)'
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedTable(formattedName)}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '1px solid var(--framer-color-divider)',
                          borderRadius: '50%',
                          backgroundColor: selectedTable === formattedName
                            ? 'var(--framer-color-tint)'
                            : 'transparent',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {selectedTable === formattedName && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'white'
                            }}
                          />
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--framer-color-text)'
                        }}>
                          {formattedName}
                        </p>
                        {table.description && (
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: 'var(--framer-color-text-secondary)'
                          }}>
                            {table.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedTable && (
                <button
                  type="button"
                  className="framer-button-primary"
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginTop: '12px'
                  }}
                  onClick={() => {
                    console.log('Tabela selecionada:', selectedTable);
                    // Aqui você pode implementar a lógica para usar a tabela selecionada
                  }}
                >
                  Usar Tabela Selecionada
                </button>
              )}
            </div>
          )}

          {testResult.error && (
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: 'var(--framer-color-text-tertiary)'
            }}>
              Detalhes: {testResult.error}
            </p>
          )}
        </div>
      )}
    </form>
  )
} 