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
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => 
            prev < tables.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => 
            prev > 0 ? prev - 1 : prev
          );
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const table = tables[highlightedIndex]
          setSelectedTable(table);
          setIsOpen(false);
          setHighlightedIndex(-1);
          onSelectTable(table);
        } else {
          setIsOpen((prev) => !prev);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

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
    <div 
      style={{ position: 'relative', width: '100%', maxWidth: '300px' }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="table-selector-listbox"
        aria-label="Selecionar tabela"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'var(--framer-color-bg-secondary)',
          border: '1px solid var(--framer-color-divider)',
          borderRadius: '4px',
          color: 'var(--framer-color-text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px'
        }}
      >
        <span>{selectedTable?.name || 'Selecione uma tabela'}</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease'
          }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          id="table-selector-listbox"
          role="listbox"
          aria-label="Lista de tabelas"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--framer-color-bg)',
            border: '1px solid var(--framer-color-divider)',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {tables.map((table, index) => (
            <div
              key={table.name}
              role="option"
              aria-selected={table.name === selectedTableName}
              tabIndex={0}
              onClick={() => {
                setSelectedTable(table);
                setIsOpen(false);
                setHighlightedIndex(-1);
                onSelectTable(table);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTable(table);
                  setIsOpen(false);
                  setHighlightedIndex(-1);
                  onSelectTable(table);
                }
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: highlightedIndex === index 
                  ? 'var(--framer-color-tint-dimmed)' 
                  : table.name === selectedTableName 
                    ? 'var(--framer-color-bg-secondary)' 
                    : 'transparent',
                color: 'var(--framer-color-text)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseLeave={() => setHighlightedIndex(-1)}
            >
              {formatTableName(table.name)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 