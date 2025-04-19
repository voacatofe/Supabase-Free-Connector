import React, { useState, useEffect, useRef } from 'react';
import { ColumnInfo } from '../types/supabase';
import { FieldMapping, FieldType } from '../types';
import { framer } from 'framer-plugin';
import { Toast } from './Toast';

interface FieldMappingInterfaceProps {
  columns: ColumnInfo[];
  onSaveMapping: (mappings: FieldMapping[]) => void;
  tableName: string;
  initialMappings?: FieldMapping[];
  primaryKeyColumn?: string;
  onPrimaryKeyChange?: (columnName: string) => void;
  autoSave?: boolean;
}

export function FieldMappingInterface({ 
  columns, 
  onSaveMapping, 
  tableName,
  initialMappings,
  primaryKeyColumn,
  onPrimaryKeyChange,
  autoSave = false
}: FieldMappingInterfaceProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedPrimaryKey, setSelectedPrimaryKey] = useState<string>(primaryKeyColumn || '');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const formRef = useRef<HTMLFormElement>(null);
  
  // Tipos oficiais suportados pelo Framer
  const framerTypes: FieldType[] = [
    'string',
    'number',
    'boolean',
    'date',
    'color',
    'formattedText',
    'image',
    'file',
    'link',
    'enum',
    'collectionReference',
    'multiCollectionReference'
  ];

  // Descrições detalhadas dos tipos de campo
  const typeDescriptions = {
    'string': 'Texto simples sem formatação. Ideal para nomes, títulos, descrições curtas, etc.',
    'number': 'Valores numéricos como inteiros ou decimais. Suporta operações matemáticas.',
    'boolean': 'Valores verdadeiro/falso. Útil para estados, flags e condições.',
    'date': 'Datas e horários. Suporta formatação e operações com datas.',
    'color': 'Cores em formato hexadecimal ou RGB. Ideal para personalização visual.',
    'formattedText': 'Texto com formatação HTML. Perfeito para conteúdo rico com estilos.',
    'image': 'URLs de imagens. Suporta visualização e manipulação de imagens.',
    'file': 'Links para arquivos como PDFs, documentos, planilhas, etc.',
    'link': 'URLs e links externos. Ideal para referências web.',
    'enum': 'Lista predefinida de opções. Útil para categorias e estados.',
    'collectionReference': 'Referência a um item em outra coleção. Para relações 1:1.',
    'multiCollectionReference': 'Referências múltiplas a itens. Para relações 1:N.'
  } as const;

  /**
   * Inicializa os mapeamentos quando as colunas mudam ou quando recebemos mapeamentos iniciais
   * - Se tivermos colunas mas não temos mapeamentos iniciais, cria mapeamentos padrão
   * - Se temos mapeamentos iniciais, utiliza-os diretamente
   */
  useEffect(() => {
    if (columns && !initialMappings) {
      const defaultMappings = columns.map(column => ({
        sourceField: column.name,
        targetField: column.name,
        type: inferFramerType(column.type, column.name),
        isPrimaryKey: false
      }));
      setMappings(defaultMappings);
    } else if (initialMappings) {
      setMappings(initialMappings);
    }
  }, [columns, initialMappings]);

  /**
   * Carrega os mapeamentos salvos anteriormente do armazenamento do plugin Framer
   * Esta função é executada uma vez quando o componente é montado
   */
  useEffect(() => {
    const loadSavedMappings = async () => {
      try {
        const key = `fieldMappings_${tableName}`;
        const savedMappingsJson = await framer.getPluginData(key);
        
        if (savedMappingsJson) {
          const savedMappings = JSON.parse(savedMappingsJson);
          if (Array.isArray(savedMappings) && savedMappings.length > 0) {
            setMappings(savedMappings);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar mapeamentos:', error);
      }
    };
    
    loadSavedMappings();
  }, [tableName]);

  /**
   * Define o valor inicial da chave primária quando o prop primaryKeyColumn muda
   */
  useEffect(() => {
    if (primaryKeyColumn) {
      setSelectedPrimaryKey(primaryKeyColumn);
    }
  }, [primaryKeyColumn]);

  /**
   * Adiciona event listener para salvar mapeamento quando solicitado externamente
   * Permite que componentes pais possam acionar o salvamento via eventos DOM
   */
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSaveMappings();
    };

    // Adiciona listener no form
    const form = formRef.current;
    if (form) {
      form.addEventListener('saveMapping', handleSaveEvent);
    }

    // Cleanup
    return () => {
      if (form) {
        form.removeEventListener('saveMapping', handleSaveEvent);
      }
    };
  }, [mappings]);

  /**
   * Verifica se já houve sincronização anterior para este tableName
   * Esta verificação determina se os botões de gerenciamento (Redefinir/Limpar) devem ser exibidos
   */
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const key = `fieldMappings_${tableName}`;
        const savedMappingsJson = await framer.getPluginData(key);
        setHasSynced(!!savedMappingsJson);
      } catch (error) {
        console.error('Erro ao verificar status de sincronização:', error);
      }
    };
    
    checkSyncStatus();
  }, [tableName]);

  /**
   * Infere o tipo de campo do Framer baseado no tipo da coluna do Supabase e no nome do campo
   * Esta função inteligente analisa tanto o tipo PostgreSQL quanto padrões de nomenclatura
   * para sugerir o tipo de campo mais apropriado no Framer
   * 
   * @param {string} supabaseType - O tipo de dados da coluna no Supabase (tipo PostgreSQL)
   * @param {string} fieldName - O nome da coluna no Supabase
   * @returns {FieldType} O tipo de campo Framer inferido
   */
  const inferFramerType = (supabaseType: string, fieldName: string): FieldType => {
    // Converte tipos do PostgreSQL para tipos do Framer
    const lowerType = supabaseType.toLowerCase();
    const lowerFieldName = fieldName.toLowerCase();
    
    // Inferências baseadas no nome do campo
    if (lowerFieldName.includes('color') || lowerFieldName.includes('cor') || 
        lowerFieldName.endsWith('rgb') || lowerFieldName.endsWith('hex')) {
      return 'color';
    }
    
    if (lowerFieldName.includes('url') || lowerFieldName.includes('link') || 
        lowerFieldName.includes('website') || lowerFieldName.includes('site')) {
      return 'link';
    }
    
    if (lowerFieldName.includes('image') || lowerFieldName.includes('imagem') || 
        lowerFieldName.includes('photo') || lowerFieldName.includes('foto') || 
        lowerFieldName.includes('picture') || lowerFieldName.endsWith('img')) {
      return 'image';
    }
    
    if (lowerFieldName.includes('file') || lowerFieldName.includes('arquivo') || 
        lowerFieldName.includes('document') || lowerFieldName.includes('documento') || 
        lowerFieldName.endsWith('pdf') || lowerFieldName.endsWith('doc')) {
      return 'file';
    }
    
    if (lowerFieldName.includes('html') || lowerFieldName.includes('formatted') || 
        lowerFieldName.includes('rich_text') || lowerFieldName.includes('rich_content') || 
        lowerFieldName.includes('texto_formatado')) {
      return 'formattedText';
    }
    
    if (lowerFieldName.includes('reference') || lowerFieldName.includes('referencia') || 
        lowerFieldName.includes('ref_') || lowerFieldName.endsWith('_ref') || 
        lowerFieldName.endsWith('_id')) {
      return 'collectionReference';
    }
    
    if (lowerFieldName.includes('references') || lowerFieldName.includes('refs') || 
        lowerFieldName.includes('ids')) {
      return 'multiCollectionReference';
    }
    
    // Inferências baseadas no tipo PostgreSQL
    if (lowerType.includes('int') || lowerType.includes('float') || 
        lowerType.includes('decimal') || lowerType.includes('numeric') ||
        lowerType.includes('real') || lowerType.includes('double')) {
      return 'number';
    }
    
    if (lowerType.includes('bool')) {
      return 'boolean';
    }
    
    if (lowerType.includes('date') || lowerType.includes('time') || 
        lowerType.includes('timestamp')) {
      return 'date';
    }
    
    if (lowerType.includes('enum')) {
      return 'enum';
    }
    
    // Inferências específicas para certos formatos
    if (lowerType.includes('char') || lowerType.includes('text')) {
      // Para campos de texto, podemos fazer inferências adicionais
      if (lowerType.includes('uuid') && (
          lowerFieldName.endsWith('_id') || 
          lowerFieldName.includes('reference') || 
          lowerFieldName.includes('ref'))) {
        return 'collectionReference';
      }
      
      // Para URLs e links
      if (lowerFieldName.includes('url') || lowerFieldName.includes('link') || 
          lowerFieldName.includes('website')) {
        return 'link';
      }
      
      // Para códigos de cores
      if (lowerFieldName.includes('color') || lowerFieldName.includes('cor')) {
        return 'color';
      }
      
      // Padrão para tipos string
      return 'string';
    }
    
    // Padrão para tudo mais
    return 'string';
  };

  /**
   * Altera o tipo de um campo específico nos mapeamentos
   * Se autoSave estiver habilitado, salva automaticamente a alteração
   * 
   * @param {number} index - Índice do mapeamento a ser alterado
   * @param {FieldType} newType - Novo tipo de campo a ser definido
   */
  const handleTypeChange = (index: number, newType: FieldType) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      type: newType
    };
    setMappings(updatedMappings);

    // Se autoSave estiver habilitado, salva automaticamente quando o tipo mudar
    if (autoSave) {
      handleSaveMappings();
    }
  };

  /**
   * Altera o nome do campo no Framer
   * Se autoSave estiver habilitado, salva automaticamente a alteração
   * 
   * @param {number} index - Índice do mapeamento a ser alterado
   * @param {string} newName - Novo nome para o campo no Framer
   */
  const handleFieldNameChange = (index: number, newName: string) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      targetField: newName
    };
    setMappings(updatedMappings);
    
    // Se autoSave estiver habilitado, salva automaticamente quando o nome mudar
    if (autoSave) {
      handleSaveMappings();
    }
  };

  /**
   * Lida com a mudança da chave primária
   * Atualiza o estado local e notifica o componente pai via callback
   * 
   * @param {string} columnName - Nome da coluna selecionada como chave primária
   */
  const handlePrimaryKeyChange = (columnName: string) => {
    setSelectedPrimaryKey(columnName);
    if (onPrimaryKeyChange) {
      onPrimaryKeyChange(columnName);
    }
    
    // Se autoSave estiver habilitado, salva automaticamente quando a chave primária mudar
    if (autoSave) {
      handleSaveMappings();
    }
  };

  /**
   * Salva os mapeamentos no armazenamento do plugin Framer
   * Notifica o componente pai via callback e exibe feedback visual
   */
  const handleSaveMappings = async () => {
    try {
      const key = `fieldMappings_${tableName}`;
      await framer.setPluginData(key, JSON.stringify(mappings));
      
      // Notifica o componente pai
      onSaveMapping(mappings);

      // Mostra toast de sucesso apenas se não estiver em modo autoSave
      if (!autoSave) {
        setToast({
          show: true,
          message: 'Configurações salvas com sucesso!',
          type: 'success'
        });

        // Adiciona classe de animação ao formulário
        const form = formRef.current;
        if (form) {
          form.classList.add('save-success');
          setTimeout(() => {
            form.classList.remove('save-success');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar mapeamentos:', error);
      
      // Mostra toast de erro
      setToast({
        show: true,
        message: 'Erro ao salvar configurações',
        type: 'error'
      });
    }
  };

  /**
   * Retorna uma descrição amigável em português para cada tipo de campo
   * 
   * @param {FieldType} type - Tipo de campo do Framer
   * @returns {string} Descrição em português do tipo
   */
  const getTypeDescription = (type: FieldType): string => {
    switch (type) {
      case 'string': return 'Texto';
      case 'number': return 'Número';
      case 'boolean': return 'Booleano';
      case 'date': return 'Data';
      case 'color': return 'Cor';
      case 'formattedText': return 'Texto Formatado';
      case 'image': return 'Imagem';
      case 'file': return 'Arquivo';
      case 'link': return 'Link';
      case 'enum': return 'Enumeração';
      case 'collectionReference': return 'Referência';
      case 'multiCollectionReference': return 'Múltiplas Refs';
      default: return type;
    }
  };

  /**
   * Formata o título da seção com o nome da tabela
   * 
   * @returns {string} Título formatado
   */
  const formatTitle = () => {
    return `Estrutura da tabela: ${tableName}`;
  };

  /**
   * Redefine todos os mapeamentos para os valores sugeridos automaticamente
   * Utiliza a função inferFramerType para determinar os tipos apropriados
   */
  const handleResetToDefaults = () => {
    if (!columns) return;
    
    const defaultMappings = columns.map(column => ({
      sourceField: column.name,
      targetField: column.name,
      type: inferFramerType(column.type, column.name),
      isPrimaryKey: column.name === selectedPrimaryKey
    }));
    
    setMappings(defaultMappings);
    setShowResetConfirm(false);
    
    if (autoSave) {
      handleSaveMappings();
    }
  };

  /**
   * Limpa todos os mapeamentos, deixando os campos alvo vazios
   * Mantém os tipos sugeridos mas limpa a seleção de chave primária
   */
  const handleClearMappings = () => {
    if (!columns) return;
    
    const emptyMappings = columns.map(column => ({
      sourceField: column.name,
      targetField: '',
      type: inferFramerType(column.type, column.name),
      isPrimaryKey: false
    }));
    
    setMappings(emptyMappings);
    setShowClearConfirm(false);
    setSelectedPrimaryKey('');
    
    if (autoSave) {
      handleSaveMappings();
    }
  };

  /**
   * Manipulador de atalhos de teclado para melhorar a acessibilidade
   * Implementa os seguintes atalhos:
   * - Ctrl/Cmd + S: Salvar mapeamentos
   * - Ctrl/Cmd + Z: Abrir diálogo de redefinição
   * - Esc: Fechar diálogos de confirmação
   * 
   * @param {KeyboardEvent} e - Evento de teclado
   */
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // Ctrl/Cmd + S para salvar
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!autoSave) {
        handleSaveMappings();
      }
    }

    // Ctrl/Cmd + Z para desfazer (reset)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      setShowResetConfirm(true);
    }

    // Esc para fechar diálogos
    if (e.key === 'Escape') {
      setShowResetConfirm(false);
      setShowClearConfirm(false);
    }
  };

  /**
   * Adiciona os event listeners de teclado quando o componente é montado
   * e os remove quando o componente é desmontado
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [autoSave]);

  return (
    <>
      <form 
        ref={formRef}
        data-field-mapping="true"
        style={{ 
          marginBottom: '16px', 
          padding: '12px',
          backgroundColor: 'var(--framer-color-bg-tertiary)',
          borderRadius: '8px',
          color: 'var(--framer-color-text)',
          transition: 'all 0.3s ease'
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!autoSave) {
            handleSaveMappings();
          }
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            fontSize: '16px',
            fontWeight: '500',
            margin: '0',
            color: 'var(--framer-color-text)'
          }}>
            {formatTitle()}
          </h3>

          {/* Barra de ações - só aparece após primeira sincronização */}
          {hasSynced && (
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                title="Redefinir para Padrões (Ctrl+Z)"
                aria-label="Redefinir para Padrões"
                style={{
                  padding: '8px',
                  backgroundColor: 'var(--framer-color-bg-secondary)',
                  border: '1px solid var(--framer-color-divider)',
                  borderRadius: '4px',
                  color: 'var(--framer-color-text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowResetConfirm(true);
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                title="Limpar Mapeamentos (Del)"
                aria-label="Limpar Mapeamentos"
                style={{
                  padding: '8px',
                  backgroundColor: 'var(--framer-color-bg-secondary)',
                  border: '1px solid var(--framer-color-divider)',
                  borderRadius: '4px',
                  color: 'var(--framer-color-text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowClearConfirm(true);
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Diálogo de confirmação para redefinir com suporte a teclado */}
        {showResetConfirm && (
          <div 
            role="dialog"
            aria-labelledby="reset-dialog-title"
            aria-describedby="reset-dialog-description"
            style={{
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
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowResetConfirm(false);
              } else if (e.key === 'Enter') {
                handleResetToDefaults();
              }
            }}
          >
            <div 
              style={{
                backgroundColor: 'var(--framer-color-bg)',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '400px'
              }}
              tabIndex={-1}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                <h3 id="reset-dialog-title" style={{ margin: '0', color: 'var(--framer-color-text)' }}>Redefinir Mapeamentos</h3>
              </div>
              <p id="reset-dialog-description" style={{ margin: '0 0 16px 0', color: 'var(--framer-color-text-secondary)' }}>
                Tem certeza que deseja redefinir todos os mapeamentos para os valores padrão?
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={handleResetToDefaults}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'var(--framer-color-tint)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--framer-color-text-reversed)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  autoFocus
                >
                  Sim
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--framer-color-divider)',
                    borderRadius: '6px',
                    color: 'var(--framer-color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diálogo de confirmação para limpar com suporte a teclado */}
        {showClearConfirm && (
          <div 
            role="dialog"
            aria-labelledby="clear-dialog-title"
            aria-describedby="clear-dialog-description"
            style={{
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
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowClearConfirm(false);
              } else if (e.key === 'Enter') {
                handleClearMappings();
              }
            }}
          >
            <div 
              style={{
                backgroundColor: 'var(--framer-color-bg)',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '400px'
              }}
              tabIndex={-1}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <h3 id="clear-dialog-title" style={{ margin: '0', color: 'var(--framer-color-text)' }}>Limpar Mapeamentos</h3>
              </div>
              <p id="clear-dialog-description" style={{ margin: '0 0 16px 0', color: 'var(--framer-color-text-secondary)' }}>
                Tem certeza que deseja limpar todos os mapeamentos?
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={handleClearMappings}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'var(--framer-color-tint)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--framer-color-text-reversed)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  autoFocus
                >
                  Sim
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--framer-color-divider)',
                    borderRadius: '6px',
                    color: 'var(--framer-color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        <p style={{
          fontSize: '12px',
          color: 'var(--framer-color-text-secondary)',
          margin: '0 0 16px 0'
        }}>
          Defina a chave primária e os tipos de campo para sincronização com Framer.
        </p>

        <div style={{
          maxHeight: '350px',
          overflowY: 'auto',
          marginBottom: '16px'
        }}>
          <table style={{ 
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: 'var(--framer-color-bg-secondary)',
                position: 'sticky',
                top: 0
              }}>
                <th style={{ 
                  padding: '8px', 
                  textAlign: 'center',
                  borderBottom: '1px solid var(--framer-color-divider)',
                  width: '120px'
                }}>
                  Chave Primária
                </th>
                <th style={{ 
                  padding: '8px', 
                  textAlign: 'left',
                  borderBottom: '1px solid var(--framer-color-divider)'
                }}>
                  Coluna
                </th>
                <th style={{ 
                  padding: '8px', 
                  textAlign: 'left',
                  borderBottom: '1px solid var(--framer-color-divider)'
                }}>
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping, index) => {
                const column = columns.find(col => col.name === mapping.sourceField);
                
                return (
                  <tr key={mapping.sourceField} style={{
                    borderBottom: '1px solid var(--framer-color-divider)',
                    backgroundColor: index % 2 === 0 
                      ? 'var(--framer-color-bg-tertiary)' 
                      : 'var(--framer-color-bg-secondary)'
                  }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        name="primaryKey"
                        checked={selectedPrimaryKey === mapping.sourceField}
                        onChange={() => handlePrimaryKeyChange(mapping.sourceField)}
                        style={{
                          cursor: 'pointer'
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      {mapping.sourceField}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select
                        value={mapping.type}
                        onChange={(e) => handleTypeChange(index, e.target.value as FieldType)}
                        title={typeDescriptions[mapping.type as keyof typeof typeDescriptions]}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid var(--framer-color-divider)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--framer-color-bg-secondary)',
                          color: 'var(--framer-color-text)',
                          fontSize: '12px'
                        }}
                      >
                        {framerTypes.map(type => (
                          <option 
                            key={type} 
                            value={type}
                            title={typeDescriptions[type as keyof typeof typeDescriptions]}
                          >
                            {getTypeDescription(type)}
                          </option>
                        ))}
                      </select>
                      <div 
                        style={{ 
                          fontSize: '11px', 
                          color: 'var(--framer-color-text-tertiary)',
                          marginTop: '4px',
                          cursor: 'help'
                        }}
                        title={`Tipo original do Supabase: ${column?.type || 'desconhecido'}`}
                      >
                        Supabase: {column?.type || 'desconhecido'}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </form>

      {/* Toast notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes successPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
          }

          .save-success {
            animation: successPulse 1s ease-out;
          }
          
          /* Estilos específicos para tema claro e escuro */
          [data-framer-theme="light"] .save-success {
            animation: successPulse 1s ease-out;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
          }
          
          [data-framer-theme="dark"] .save-success {
            animation: successPulse 1s ease-out;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
          }
        `}
      </style>
    </>
  );
} 