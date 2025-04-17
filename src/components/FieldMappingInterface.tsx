import React, { useState, useEffect, useRef } from 'react';
import { ColumnInfo } from '../types/supabase';
import { FieldMapping, FieldType } from '../types';
import { framer } from 'framer-plugin';

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

  // Inicializa os mapeamentos quando as colunas mudam ou quando recebemos mapeamentos iniciais
  useEffect(() => {
    if (initialMappings && initialMappings.length > 0) {
      // Use mapeamentos iniciais se fornecidos
      setMappings(initialMappings);
    } else {
      // Cria mapeamentos padrão (mesmos nomes de campo, tipo string como padrão)
      const defaultMappings = columns.map(column => ({
        sourceField: column.name,
        targetField: column.name,
        supabaseField: column.name,
        framerField: column.name,
        type: inferFramerType(column.type, column.name)
      }));
      setMappings(defaultMappings);
    }
  }, [columns, initialMappings]);

  // Carrega os mapeamentos salvos anteriormente
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

  // Define o valor inicial da chave primária
  useEffect(() => {
    if (primaryKeyColumn) {
      setSelectedPrimaryKey(primaryKeyColumn);
    }
  }, [primaryKeyColumn]);

  // Adiciona event listener para salvar mapeamento quando solicitado externamente
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

  // Função para inferir o tipo Framer baseado no tipo do Supabase e nome do campo
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

  // Altera o tipo de um campo específico
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

  // Altera o nome do campo no Framer
  const handleFieldNameChange = (index: number, newName: string) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      framerField: newName,
      targetField: newName
    };
    setMappings(updatedMappings);
    
    // Se autoSave estiver habilitado, salva automaticamente quando o nome mudar
    if (autoSave) {
      handleSaveMappings();
    }
  };

  // Lida com a mudança da chave primária
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

  // Salva os mapeamentos
  const handleSaveMappings = async () => {
    // Salva no plugin data
    try {
      const key = `fieldMappings_${tableName}`;
      await framer.setPluginData(key, JSON.stringify(mappings));
      
      // Notifica o componente pai
      onSaveMapping(mappings);
    } catch (error) {
      console.error('Erro ao salvar mapeamentos:', error);
    }
  };

  // Retorna uma descrição amigável para o tipo
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

  // Formata o título da seção
  const formatTitle = () => {
    return `Estrutura da tabela: ${tableName}`;
  };

  return (
    <form 
      ref={formRef}
      data-field-mapping="true"
      style={{ 
        marginBottom: '16px', 
        padding: '12px',
        backgroundColor: '#111111',
        borderRadius: '8px',
        color: 'white'
      }}
    >
      <h3 style={{ 
        fontSize: '16px',
        fontWeight: '500',
        marginTop: '0',
        marginBottom: '8px',
        color: 'white'
      }}>
        {formatTitle()}
      </h3>
      
      <p style={{
        fontSize: '12px',
        color: '#aaaaaa',
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
              backgroundColor: '#222222',
              position: 'sticky',
              top: 0
            }}>
              <th style={{ 
                padding: '8px', 
                textAlign: 'center',
                borderBottom: '1px solid #333333',
                width: '120px'
              }}>
                Chave Primária
              </th>
              <th style={{ 
                padding: '8px', 
                textAlign: 'left',
                borderBottom: '1px solid #333333'
              }}>
                Coluna
              </th>
              <th style={{ 
                padding: '8px', 
                textAlign: 'left',
                borderBottom: '1px solid #333333'
              }}>
                Tipo
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => {
              const column = columns.find(col => col.name === mapping.supabaseField);
              
              return (
                <tr key={mapping.supabaseField} style={{
                  borderBottom: '1px solid #333333',
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222222'
                }}>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      name="primaryKey"
                      checked={selectedPrimaryKey === mapping.supabaseField}
                      onChange={() => handlePrimaryKeyChange(mapping.supabaseField)}
                      style={{
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    {mapping.supabaseField}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select
                      value={mapping.type}
                      onChange={(e) => handleTypeChange(index, e.target.value as FieldType)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid #444444',
                        borderRadius: '4px',
                        backgroundColor: '#333333',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    >
                      {framerTypes.map(type => (
                        <option key={type} value={type}>
                          {getTypeDescription(type)}
                        </option>
                      ))}
                    </select>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#999999',
                      marginTop: '4px'
                    }}>
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
  );
} 