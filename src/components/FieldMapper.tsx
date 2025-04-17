import React, { useState, useEffect } from 'react';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { FieldType } from '../types/framer';
import { fetchTablePreview } from '../supabase';
import { 
  generateFieldMappings, 
  previewFieldValue, 
  mapFieldType, 
  FieldMapping as UtilFieldMapping 
} from '../utils/fieldMapper';

interface FieldMapperProps {
  table: TableInfo;
  config: SupabaseConfig;
  onFieldMappingsChange: (mappings: FramerFieldMapping[]) => void;
  initialMappings?: FramerFieldMapping[];
}

// Interface para o mapeamento de campos com nomenclatura do tipo Framer
interface FramerFieldMapping {
  supabaseField: string;
  framerField: string;
  type: FieldType;
}

export function FieldMapper({ table, config, onFieldMappingsChange, initialMappings = [] }: FieldMapperProps) {
  // Estado para armazenar os mapeamentos atuais
  const [mappings, setMappings] = useState<FramerFieldMapping[]>([]);
  // Estado para dados de prévia
  const [previewData, setPreviewData] = useState<any[]>([]);
  // Estado para indicar se está carregando a prévia
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  // Estado para mensagens de erro
  const [error, setError] = useState<string | null>(null);
  // Estado para visualização transformada
  const [transformedPreview, setTransformedPreview] = useState<any[]>([]);
  // Controla se estamos mostrando a prévia
  const [showPreview, setShowPreview] = useState(false);

  // Função para converter UtilFieldMapping para FramerFieldMapping
  const convertToFramerMapping = (
    utilMappings: UtilFieldMapping[]
  ): FramerFieldMapping[] => {
    return utilMappings.map(mapping => ({
      supabaseField: mapping.sourceField,
      framerField: mapping.targetField,
      type: mapping.targetType.toLowerCase() as FieldType
    }));
  };

  // Gera mapeamentos iniciais baseados na tabela, quando o componente é montado
  useEffect(() => {
    if (table && table.columns) {
      if (initialMappings && initialMappings.length > 0) {
        setMappings(initialMappings);
      } else {
        const utilMappings = generateFieldMappings(table.columns);
        const framerMappings = convertToFramerMapping(utilMappings);
        setMappings(framerMappings);
        onFieldMappingsChange(framerMappings);
      }
      // Carrega dados de prévia
      loadPreviewData();
    }
  }, [table]);

  // Atualiza a prévia transformada quando os mapeamentos ou dados de prévia mudam
  useEffect(() => {
    updateTransformedPreview();
  }, [mappings, previewData]);

  // Função para carregar dados de prévia da tabela
  const loadPreviewData = async () => {
    setIsLoadingPreview(true);
    setError(null);
    
    try {
      const result = await fetchTablePreview(config, table.name, 3);
      if (result.success && result.data) {
        setPreviewData(result.data);
      } else {
        setError(result.message || 'Não foi possível carregar dados de prévia');
      }
    } catch (err) {
      setError('Erro ao carregar prévia: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Função para transformar os dados da prévia com base nos mapeamentos atuais
  const updateTransformedPreview = () => {
    if (!previewData.length || !mappings.length) {
      setTransformedPreview([]);
      return;
    }

    try {
      const transformed = previewData.map(item => {
        const result: Record<string, any> = {};
        
        mappings.forEach(mapping => {
          const { supabaseField, framerField, type } = mapping;
          const value = item[supabaseField];
          
          // Converte o valor de acordo com o tipo de mapeamento selecionado
          const transformedValue = previewFieldValue(
            value, 
            type.charAt(0).toUpperCase() + type.slice(1) as any
          );
          
          result[framerField] = transformedValue;
        });
        
        return result;
      });
      
      setTransformedPreview(transformed);
    } catch (err) {
      console.error('Erro ao transformar dados:', err);
      setTransformedPreview([]);
    }
  };

  // Manipulador para alterações no nome do campo de destino
  const handleTargetNameChange = (index: number, newName: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      framerField: newName
    };
    setMappings(newMappings);
    onFieldMappingsChange(newMappings);
  };

  // Manipulador para alterações no tipo do campo
  const handleTypeChange = (index: number, newType: FieldType) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      type: newType
    };
    setMappings(newMappings);
    onFieldMappingsChange(newMappings);
  };

  // Manipulador para excluir um mapeamento
  const handleRemoveMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    onFieldMappingsChange(newMappings);
  };

  // Manipulador para alternar a visibilidade da prévia
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        margin: '0 0 12px 0',
        color: 'var(--framer-color-text)'
      }}>
        Mapeamento de Campos
      </h3>
      
      <p style={{ 
        fontSize: '13px', 
        color: 'var(--framer-color-text-secondary)', 
        margin: '0 0 16px 0' 
      }}>
        Configure como os campos do Supabase serão mapeados para o Framer CMS
      </p>

      {/* Tabela de mapeamento de campos */}
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '13px'
        }}>
          <thead>
            <tr>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '1px solid var(--framer-color-divider)',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text-secondary)'
              }}>
                Campo Supabase
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '1px solid var(--framer-color-divider)',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text-secondary)'
              }}>
                Campo no Framer
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '1px solid var(--framer-color-divider)',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text-secondary)'
              }}>
                Tipo
              </th>
              <th style={{ 
                textAlign: 'center', 
                padding: '8px 12px', 
                borderBottom: '1px solid var(--framer-color-divider)',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text-secondary)',
                width: '80px'
              }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => (
              <tr key={index}>
                <td style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--framer-color-divider)'
                }}>
                  {mapping.supabaseField}
                </td>
                <td style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--framer-color-divider)'
                }}>
                  <input
                    type="text"
                    value={mapping.framerField}
                    onChange={(e) => handleTargetNameChange(index, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '13px',
                      border: '1px solid var(--framer-color-divider)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--framer-color-bg-secondary)',
                      color: 'var(--framer-color-text)'
                    }}
                  />
                </td>
                <td style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--framer-color-divider)'
                }}>
                  <select
                    value={mapping.type}
                    onChange={(e) => handleTypeChange(index, e.target.value as FieldType)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '13px',
                      border: '1px solid var(--framer-color-divider)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--framer-color-bg-secondary)',
                      color: 'var(--framer-color-text)'
                    }}
                  >
                    <option value="string">Texto</option>
                    <option value="number">Número</option>
                    <option value="boolean">Booleano</option>
                    <option value="date">Data</option>
                    <option value="object">Objeto</option>
                    <option value="array">Lista</option>
                  </select>
                </td>
                <td style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--framer-color-divider)',
                  textAlign: 'center'
                }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveMapping(index)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12px',
                      border: '1px solid var(--framer-color-divider)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--framer-color-bg-secondary)',
                      color: 'var(--framer-color-text-tertiary)',
                      cursor: 'pointer'
                    }}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botão para mostrar/esconder prévia */}
      <button
        type="button"
        onClick={togglePreview}
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
          marginBottom: '16px'
        }}
      >
        {showPreview ? 'Esconder prévia' : 'Mostrar prévia dos dados'}
      </button>

      {/* Exibição da prévia */}
      {showPreview && (
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--framer-color-bg-secondary)',
          borderRadius: '4px',
          border: '1px solid var(--framer-color-divider)',
          marginBottom: '16px'
        }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            margin: '0 0 12px 0',
            color: 'var(--framer-color-text)'
          }}>
            Prévia de Conversão
          </h4>

          {isLoadingPreview ? (
            <p style={{ fontSize: '13px', color: 'var(--framer-color-text-secondary)' }}>
              Carregando dados de prévia...
            </p>
          ) : error ? (
            <p style={{ fontSize: '13px', color: 'var(--framer-color-text-tertiary)' }}>
              {error}
            </p>
          ) : transformedPreview.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontSize: '12px' 
              }}>
                <thead>
                  <tr>
                    {Object.keys(transformedPreview[0]).map(key => (
                      <th key={key} style={{ 
                        textAlign: 'left', 
                        padding: '6px 10px', 
                        borderBottom: '1px solid var(--framer-color-divider)',
                        color: 'var(--framer-color-text-secondary)'
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transformedPreview.map((item, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.values(item).map((value: any, colIndex) => (
                        <td 
                          key={colIndex} 
                          style={{ 
                            padding: '6px 10px', 
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
              Não há dados disponíveis para prévia
            </p>
          )}
        </div>
      )}
    </div>
  );
} 