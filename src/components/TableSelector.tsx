import React, { useState, useEffect, useRef } from 'react'
import { TableInfo, SupabaseConfig } from '../types/supabase'

interface TableSelectorProps {
  tables: TableInfo[]
  config: SupabaseConfig
  onSelectTable: (table: TableInfo) => void
  selectedTableName?: string
  hideSearch?: boolean
}

export function TableSelector({ tables, config, onSelectTable, selectedTableName }: TableSelectorProps) {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const initialSelectionMade = useRef(false)

  // Log inicial para depuração
  useEffect(() => {
    console.log('TableSelector montado/atualizado:', {
      tablesCount: tables.length,
      selectedTableName
    });
  }, [tables, selectedTableName]);

  // Função para formatar o nome da tabela para exibição (primeira letra maiúscula)
  const formatTableName = (name: string): string => {
    // Apenas capitaliza a primeira letra
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Quando as tabelas mudam, atualize a seleção
  useEffect(() => {
    // Só continua se houver tabelas para processar
    if (tables.length === 0) {
      setSelectedTable(null);
      return;
    }
    
    // Se temos um nome de tabela selecionado, encontre a tabela correspondente
    if (selectedTableName) {
      const table = tables.find(t => 
        t.name === selectedTableName || 
        formatTableName(t.name) === selectedTableName
      );
      
      if (table) {
        console.log('Tabela encontrada pelo nome:', table.name);
        setSelectedTable(table);
        initialSelectionMade.current = true;
        return;
      } else {
        console.log('Tabela não encontrada pelo nome:', selectedTableName);
      }
    }
    
    // Se não temos uma tabela selecionada e há tabelas disponíveis, selecione a primeira
    if (!initialSelectionMade.current && tables.length > 0) {
      console.log('Selecionando primeira tabela por padrão:', tables[0].name);
      setSelectedTable(tables[0]);
      initialSelectionMade.current = true;
    }
  }, [tables, selectedTableName]);

  // Quando a tabela selecionada muda, notifique o componente pai, mas apenas
  // se tiver sido realmente alterada e se a seleção for diferente do nome atual
  useEffect(() => {
    if (selectedTable && (!selectedTableName || selectedTable.name !== selectedTableName)) {
      console.log('Notificando componente pai sobre seleção de tabela:', selectedTable.name);
      onSelectTable(selectedTable);
    }
  }, [selectedTable, onSelectTable, selectedTableName]);

  // Se não houver tabelas disponíveis, mostrar mensagem
  if (tables.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'var(--framer-color-bg-secondary)',
        borderRadius: '4px',
        color: 'var(--framer-color-text-secondary)', 
        textAlign: 'center',
        fontSize: '14px',
        border: '1px solid var(--framer-color-divider)'
      }}>
        Nenhuma tabela disponível no banco de dados Supabase.
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
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
          Selecione uma tabela ({tables.length} disponíveis)
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
          {tables.map(table => (
            <option key={table.name} value={table.name}>
              {formatTableName(table.name)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
} 