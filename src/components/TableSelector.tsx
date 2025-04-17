import React, { useState, useEffect } from 'react'
import { TableInfo, SupabaseConfig, TablePreviewResult } from '../types/supabase'
import { fetchTablePreview } from '../supabase'

interface TableSelectorProps {
  tables: TableInfo[]
  config: SupabaseConfig
  onSelectTable: (table: TableInfo) => void
  selectedTableName?: string
  hideSearch?: boolean
}

export function TableSelector({ tables, config, onSelectTable, selectedTableName, hideSearch = false }: TableSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [preview, setPreview] = useState<TablePreviewResult | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Função para formatar o nome da tabela (remover "Collection")
  const formatTableName = (name: string): string => {
    return name.replace(/Collection$/, '')
  }

  // Filtra as tabelas com base na pesquisa
  const filteredTables = tables.filter(table => 
    hideSearch ? true : formatTableName(table.name).toLowerCase().includes(search.toLowerCase())
  )

  // Quando as tabelas ou o nome da tabela selecionada mudam, atualize a seleção
  useEffect(() => {
    if (selectedTableName && tables.length > 0) {
      const table = tables.find(t => formatTableName(t.name) === selectedTableName || t.name === selectedTableName)
      if (table) {
        setSelectedTable(table)
      }
    } else if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0])
    }
  }, [tables, selectedTableName])

  // Quando uma tabela é selecionada, notifique o componente pai
  useEffect(() => {
    if (selectedTable) {
      const formattedTable = {
        ...selectedTable,
        name: formatTableName(selectedTable.name)
      }
      onSelectTable(formattedTable)
    }
  }, [selectedTable])

  // Carrega a prévia da tabela selecionada
  const loadPreview = async () => {
    if (!selectedTable) return
    
    setIsLoadingPreview(true)
    try {
      const result = await fetchTablePreview(config, selectedTable.name)
      setPreview(result)
    } catch (error) {
      setPreview({
        success: false,
        message: 'Erro ao carregar prévia',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Formata o nome do tipo da coluna para exibição
  const formatColumnType = (type: string) => {
    switch (type) {
      case 'integer':
      case 'number':
      case 'Int':
        return 'Número inteiro'
      case 'float':
      case 'Float':
      case 'double':
      case 'decimal':
        return 'Número decimal'
      case 'string':
      case 'String':
      case 'text':
        return 'Texto'
      case 'boolean':
      case 'Boolean':
        return 'Booleano'
      case 'datetime':
      case 'DateTime':
      case 'timestamp':
      case 'date':
        return 'Data e hora'
      case 'object':
        return 'Objeto'
      case 'array':
        return 'Lista'
      default:
        return type
    }
  }

  // Alterna a exibição dos detalhes da tabela
  const toggleDetails = () => {
    setShowDetails(!showDetails)
    if (!showDetails && !preview && selectedTable) {
      loadPreview()
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {!hideSearch && (
        <div style={{ marginBottom: '12px' }}>
          <label 
            htmlFor="table-search"
            style={{ 
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--framer-color-text)'
            }}
          >
            Buscar tabelas
          </label>
          <input
            id="table-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite para filtrar..."
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
      )}

      <div style={{ marginBottom: '12px' }}>
        <label 
          htmlFor="table-select"
          style={{ 
            display: 'block',
            marginBottom: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--framer-color-text)'
          }}
        >
          Selecione uma tabela ({filteredTables.length} disponíveis)
        </label>
        <select
          id="table-select"
          value={selectedTable?.name || ''}
          onChange={(e) => {
            const table = tables.find(t => t.name === e.target.value)
            if (table) setSelectedTable(table)
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid var(--framer-color-divider)',
            borderRadius: '4px',
            backgroundColor: 'var(--framer-color-bg-secondary)',
            color: 'var(--framer-color-text)',
            height: '36px',
            textOverflow: 'ellipsis'
          }}
        >
          {filteredTables.map(table => (
            <option key={table.name} value={table.name}>
              {formatTableName(table.name)}
            </option>
          ))}
        </select>
      </div>

      {selectedTable && (
        <div>
          <button
            type="button"
            onClick={toggleDetails}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: 'var(--framer-color-bg-secondary)',
              border: '1px solid var(--framer-color-divider)',
              borderRadius: '4px',
              color: 'var(--framer-color-text)',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            {showDetails ? 'Esconder detalhes' : 'Mostrar detalhes da tabela'}
          </button>

          {showDetails && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--framer-color-divider)',
                marginBottom: '16px'
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0' }}>
                Estrutura da tabela
              </h3>
              
              {selectedTable.description && (
                <p style={{ fontSize: '13px', color: 'var(--framer-color-text-secondary)', margin: '0 0 12px 0' }}>
                  {selectedTable.description}
                </p>
              )}

              {selectedTable.columns && selectedTable.columns.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)' }}>Coluna</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)' }}>Tipo</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)' }}>Obrigatório</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTable.columns.map(column => (
                        <tr key={column.name}>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)', fontWeight: column.name === 'id' ? 'bold' : 'normal' }}>
                            {column.name}
                          </td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)' }}>
                            {formatColumnType(column.type)}
                            {column.isList && ' (Lista)'}
                          </td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--framer-color-divider)' }}>
                            {!column.isNullable ? 'Sim' : 'Não'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--framer-color-text-secondary)' }}>
                  Não foi possível obter a estrutura desta tabela.
                </p>
              )}

              <div style={{ marginTop: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0' }}>
                  Prévia dos dados
                </h3>
                
                {isLoadingPreview ? (
                  <p style={{ fontSize: '13px', color: 'var(--framer-color-text-secondary)' }}>
                    Carregando prévia...
                  </p>
                ) : preview?.success ? (
                  preview.data && preview.data.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {Object.keys(preview.data[0]).map(key => (
                              <th 
                                key={key} 
                                style={{ 
                                  textAlign: 'left', 
                                  padding: '4px 8px', 
                                  borderBottom: '1px solid var(--framer-color-divider)' 
                                }}
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.data.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value: any, idx) => (
                                <td 
                                  key={idx} 
                                  style={{ 
                                    padding: '4px 8px', 
                                    borderBottom: '1px solid var(--framer-color-divider)' 
                                  }}
                                >
                                  {value === null ? 'null' : 
                                   typeof value === 'object' ? JSON.stringify(value) : 
                                   String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--framer-color-text-secondary)' }}>
                      Não foram encontrados dados nesta tabela.
                    </p>
                  )
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--framer-color-text-tertiary)' }}>
                    {preview?.message || 'Não foi possível carregar a prévia dos dados.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 