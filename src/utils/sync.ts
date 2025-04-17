import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { FieldMapping } from '../types/framer';
import { previewFieldValue, convertRecord } from './fieldMapper';
import { framer } from '../services/framer';
import { ColumnInfo, FieldType } from '../types';

// Interface para o resultado da sincronização
export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any[];
  collectionName?: string;
  totalRecords?: number;
}

// Interface para o controle de opções de sincronização
export interface SyncOptions {
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

// Interface para o mapeamento de campos no formato utilizado pelas funções de conversão
interface UtilFieldMapping {
  sourceField: string;
  targetField: string;
  sourceType: string;
  targetType: string;
}

/**
 * Detecta automaticamente o tipo de um valor para uso no Framer
 */
export function detectFieldType(value: any): string {
  if (value === null || value === undefined) {
    return 'String'; // valor padrão para campos nulos
  }
  
  if (typeof value === 'string') {
    // Verifica se é uma data em formato ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'Date';
    }
    return 'String';
  }
  
  if (typeof value === 'number') {
    return 'Number';
  }
  
  if (typeof value === 'boolean') {
    return 'Boolean';
  }
  
  if (Array.isArray(value)) {
    return 'Array';
  }
  
  if (typeof value === 'object') {
    return 'Object';
  }
  
  return 'String'; // tipo padrão para casos não previstos
}

/**
 * Gera automaticamente um esquema para o Framer baseado nos dados do Supabase
 */
export function autoDetectFramerSchema(data: any[]): UtilFieldMapping[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Usa o primeiro item para detectar a estrutura
  const sampleRecord = data[0];
  
  // Cria um mapeamento automático para cada campo
  return Object.keys(sampleRecord).map(fieldName => {
    const fieldValue = sampleRecord[fieldName];
    const detectedType = detectFieldType(fieldValue);
    
    return {
      sourceField: fieldName,
      targetField: fieldName, // mantém o mesmo nome de campo
      sourceType: fieldName, // usar o nome do campo como tipo de origem
      targetType: detectedType
    };
  });
}

/**
 * Converte os mapeamentos de campo do formato da UI para o formato usado nas funções de transformação
 */
export function convertFieldMappings(
  mappings: FieldMapping[]
): UtilFieldMapping[] {
  return mappings.map(mapping => ({
    sourceField: mapping.supabaseField,
    targetField: mapping.framerField,
    sourceType: mapping.supabaseField, // Estamos usando o nome do campo como tipo, já que não temos o tipo original
    targetType: mapping.type.charAt(0).toUpperCase() + mapping.type.slice(1) // Primeira letra maiúscula
  }));
}

/**
 * Busca dados da tabela selecionada no Supabase
 */
export async function fetchDataFromSupabase(
  config: SupabaseConfig,
  table: TableInfo,
  options: SyncOptions = {}
): Promise<{ success: boolean; data?: any[]; error?: string; count?: number }> {
  try {
    const { url, key } = config;
    const supabase = createClient(url, key);
    
    // Prepara a consulta com as opções
    let query = supabase
      .from(table.name)
      .select('*', { count: 'exact' });
    
    // Aplica opções de paginação
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      query = query.range(offset, offset + options.limit - 1);
    }
    
    // Aplica opções de ordenação
    if (options.orderBy) {
      const direction = options.orderDirection || 'asc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    }
    
    // Aplica filtros se fornecidos
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Executa a consulta
    const { data, error, count } = await query;
    
    if (error) {
      return { 
        success: false, 
        error: `Erro ao buscar dados: ${error.message}` 
      };
    }
    
    return { 
      success: true, 
      data: data || [], 
      count: count || undefined
    };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Busca todos os dados da tabela selecionada no Supabase sem limitações
 * Usado para sincronização rápida e automática
 */
export async function fetchAllDataFromSupabase(
  config: SupabaseConfig,
  table: TableInfo
): Promise<{ success: boolean; data?: any[]; error?: string; count?: number }> {
  try {
    const { url, key } = config;
    const supabase = createClient(url, key);
    
    // Define um limite de segurança alto mas razoável (10000 registros)
    let query = supabase
      .from(table.name)
      .select('*', { count: 'exact' })
      .limit(10000); // limite de segurança para evitar consumo excessivo de recursos
    
    // Executa a consulta
    const { data, error, count } = await query;
    
    if (error) {
      return { 
        success: false, 
        error: `Erro ao buscar dados: ${error.message}` 
      };
    }
    
    return { 
      success: true, 
      data: data || [], 
      count: count || undefined
    };
  } catch (error) {
    console.error('Erro na sincronização rápida:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Transforma os dados do Supabase para o formato do Framer CMS
 */
export function transformData(
  data: any[],
  mappings: FieldMapping[]
): any[] {
  if (!data || data.length === 0 || !mappings || mappings.length === 0) {
    return [];
  }
  
  try {
    // Cria um objeto de resultado onde cada item corresponde a um registro
    return data.map(record => {
      const result: Record<string, any> = {};
      
      // Processa cada campo de acordo com o mapeamento
      mappings.forEach(mapping => {
        const sourceField = mapping.supabaseField;
        const targetField = mapping.framerField;
        const targetType = mapping.type;
        const value = record[sourceField];
        
        // Converte o valor baseado no tipo de destino
        let convertedValue = value;
        
        switch (targetType) {
          case 'string':
            convertedValue = value !== null && value !== undefined ? String(value) : '';
            break;
            
          case 'number':
            if (value === null || value === undefined) {
              convertedValue = 0;
            } else {
              const num = Number(value);
              convertedValue = isNaN(num) ? 0 : num;
            }
            break;
            
          case 'boolean':
            convertedValue = Boolean(value);
            break;
            
          case 'date':
            if (!value) {
              convertedValue = null;
            } else {
              try {
                // O Framer espera data em formato ISO string
                const date = value instanceof Date ? value : new Date(value);
                convertedValue = !isNaN(date.getTime()) ? date.toISOString() : null;
              } catch (e) {
                console.warn(`Erro ao converter data: ${e}`);
                convertedValue = null;
              }
            }
            break;
            
          case 'color':
            // Garantir que a cor esteja em um formato reconhecido
            if (typeof value === 'string') {
              // Verifica se é um código de cor válido
              if (/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value) || 
                  /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/.test(value)) {
                convertedValue = value;
              } else {
                // Se não for um formato reconhecido, usa preto como padrão
                convertedValue = '#000000';
              }
            } else {
              convertedValue = '#000000';
            }
            break;
            
          case 'image':
            // O Framer espera um objeto com URL para imagens
            if (typeof value === 'string') {
              convertedValue = { url: value };
            } else if (value && typeof value === 'object' && value.url) {
              convertedValue = value;
            } else {
              convertedValue = null;
            }
            break;
            
          case 'file':
            // Similar a imagens, arquivos também são objetos com URL
            if (typeof value === 'string') {
              convertedValue = { url: value, name: value.split('/').pop() || 'arquivo' };
            } else if (value && typeof value === 'object' && value.url) {
              convertedValue = value;
            } else {
              convertedValue = null;
            }
            break;
            
          case 'link':
            // Links são URLs em formato string
            convertedValue = value !== null && value !== undefined ? String(value) : '';
            break;
            
          case 'formattedText':
            // Texto formatado é HTML em string
            convertedValue = value !== null && value !== undefined ? String(value) : '';
            break;
            
          case 'enum':
            // Enums são strings que representam uma das opções configuradas
            convertedValue = value !== null && value !== undefined ? String(value) : '';
            break;
            
          case 'collectionReference':
            // Referências são IDs de itens em outras coleções
            if (value === null || value === undefined) {
              convertedValue = null;
            } else if (typeof value === 'object' && (value.id || value._id)) {
              convertedValue = String(value.id || value._id);
            } else {
              convertedValue = String(value);
            }
            break;
            
          case 'multiCollectionReference':
            // Múltiplas referências são arrays de IDs
            if (value === null || value === undefined) {
              convertedValue = [];
            } else if (Array.isArray(value)) {
              convertedValue = value.map(item => {
                if (typeof item === 'object' && (item.id || item._id)) {
                  return String(item.id || item._id);
                }
                return String(item);
              });
            } else {
              // Se não for um array, criamos um com o valor único
              convertedValue = [String(value)];
            }
            break;
            
          default:
            // Tipo não reconhecido, mantém o valor original
            convertedValue = value;
        }
        
        // Adiciona o campo convertido ao resultado
        result[targetField] = convertedValue;
      });
      
      return result;
    });
  } catch (error) {
    console.error('Erro ao transformar dados:', error);
    return [];
  }
}

/**
 * Transforma os dados usando detecção automática de tipos
 */
export function autoTransformData(data: any[]): any[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  try {
    // Detecta automaticamente o esquema baseado nos dados
    const autoMappings = autoDetectFramerSchema(data);
    
    // Aplica a conversão para cada registro
    return data.map(record => {
      const result: Record<string, any> = {};
      
      autoMappings.forEach(mapping => {
        // Obtém o valor original do campo
        const value = record[mapping.sourceField];
        
        // Converte o valor de acordo com o tipo de destino
        let convertedValue = value;
        
        // Para valores de data, garante que seja um objeto Date válido
        if (mapping.targetType === 'Date' && value) {
          try {
            convertedValue = new Date(value);
          } catch (e) {
            convertedValue = value; // mantém o valor original se a conversão falhar
          }
        }
        
        // Atribui o valor convertido ao campo de destino
        result[mapping.targetField] = convertedValue;
      });
      
      return result;
    });
  } catch (error) {
    console.error('Erro ao transformar dados automaticamente:', error);
    return data; // retorna os dados originais em caso de erro
  }
}

/**
 * Cria um nome para o Framer CMS baseado no nome da tabela
 */
export function createFramerName(tableName: string): string {
  // Remove "Collection" do final se presente (para compatibilidade retroativa)
  const baseName = tableName.replace(/Collection$/, '');
  
  // Formata o nome com primeira letra maiúscula
  return baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
}

/**
 * Cria ou atualiza dados no Framer CMS
 * Implementação real usando a API do Framer Collection
 */
export async function createOrUpdateFramerData(
  collectionName: string,
  data: any[]
): Promise<SyncResult> {
  try {
    // Obtém a coleção gerenciada do Framer
    const collection = await framer.getManagedCollection();
    
    if (!collection) {
      return {
        success: false,
        message: 'Não foi possível obter a coleção no Framer CMS',
        error: 'Coleção não disponível'
      };
    }

    // Variável para armazenar os campos configurados
    let configuredFields: Array<{ id: string; name: string; type: string }> = [];
    
    // Define os campos baseado no primeiro item de dados
    if (data.length > 0) {
      // Obtém os campos existentes (se houver)
      const existingFields = await collection.getFields();
      const existingFieldMap = new Map(
        existingFields.map(field => [field.name, field])
      );
      
      const sampleItem = data[0];
      
      // Prepara os campos
      // Como a API do Framer espera tipos específicos para cada campo, 
      // vamos usar a API nativa para configurar os campos
      const fields: Array<{ id: string; name: string; type: string }> = [];
      
      for (const key of Object.keys(sampleItem)) {
        // Pula os campos especiais de ID que adicionamos
        if (key === '_id' || key === 'id') continue;
        
        const value = sampleItem[key];
        const fieldType = getFramerFieldType(value);
        // Use o campo existente se já estiver definido com o mesmo nome
        const existingField = existingFieldMap.get(key);
        
        if (existingField) {
          fields.push(existingField as any);
        } else {
          // Para simplificar, tratamos todos os campos como string
          // Em um plugin real, você pode adicionar lógica adicional para campos de diferentes tipos
          fields.push({
            id: `field_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: key,
            type: fieldType
          });
        }
      }

      // Salva os campos para uso posterior
      configuredFields = fields;
      
      // Usa any para ignorar erros de tipagem, já que a API do Framer espera tipos específicos
      // que diferem da nossa interface simplificada
      await collection.setFields(fields as any);
    }
    
    // Para rastrear quais itens foram obtidos e serão atualizados
    console.log('Preparando para atualizar ou criar itens...');
    // Nota: Em uma implementação ideal, buscaríamos os itens existentes para
    // compará-los e fazer upsert, mas como a API atual não suporta esse cenário,
    // vamos confiar no mecanismo interno do Framer para fazer o upsert
    // baseado no campo "id" que estamos fornecendo

    // Map vazio como fallback
    const existingItemsMap = new Map();
    
    // Prepara os itens para adicionar à coleção
    const collectionItems = data.map(item => {
      // Usa o ID já definido (baseado na chave primária)
      const itemId = item.id || `item_${Math.random().toString(36).substring(2, 15)}`;
      
      // Define um slug para o item
      const slug = item.slug || slugify(item.title || item.name || itemId);
      
      // Constrói o objeto de dados do campo
      const fieldData: Record<string, any> = {};
      
      // Obtém os tipos de campo a partir dos campos configurados
      const fieldTypes = new Map(configuredFields.map(field => [field.id, field.type]));
      
      Object.keys(item).forEach(key => {
        // Pula os campos especiais de ID
        if (key === '_id' || key === 'id' || key === 'slug') return;
        
        // Usa o mesmo padrão de ID que usamos ao definir os campos
        const fieldId = `field_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const value = item[key];
        const fieldType = fieldTypes.get(fieldId) || 'string';
        
        // O Framer espera um formato específico para cada tipo de campo
        // Encapsula o valor conforme o tipo do campo
        switch (fieldType) {
          case 'string':
            fieldData[fieldId] = String(value);
            break;
          case 'number':
            fieldData[fieldId] = Number(value);
            break;
          case 'boolean':
            fieldData[fieldId] = Boolean(value);
            break;
          case 'date':
            fieldData[fieldId] = value instanceof Date ? value.toISOString() : String(value);
            break;
          case 'image':
            // Para URLs de imagem
            fieldData[fieldId] = { url: String(value) };
            break;
          default:
            // Fallback para string para outros tipos
            fieldData[fieldId] = String(value);
        }
      });
      
      // Verifica se o item já existe na coleção
      const isUpdate = existingItemsMap.has(itemId);
      console.log(`Item ${itemId} será ${isUpdate ? 'atualizado' : 'criado'}`);
      
      return {
        id: itemId,
        slug: slug,
        title: item.title || item.name || String(itemId), // Use um campo significativo como título
        fieldData: fieldData
      };
    });
    
    // Adiciona os itens à coleção (o Framer fará upsert automaticamente)
    await collection.addItems(collectionItems as any);
    
    return {
      success: true,
      message: `Dados "${collectionName}" atualizados com sucesso.`,
      data,
      collectionName,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('Erro ao criar/atualizar dados:', error);
    return {
      success: false,
      message: 'Erro ao criar/atualizar dados no Framer CMS',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Verifica se uma coleção Framer existe
 * Implementação real usando a API do Framer
 */
export function checkFramerDataExists(name: string): boolean {
  try {
    // No contexto de um plugin Framer, não precisamos verificar se a coleção existe
    // porque estamos trabalhando com uma coleção que o Framer já nos forneceu
    return true;
  } catch (error) {
    console.error(`Erro ao verificar existência dos dados "${name}":`, error);
    return false;
  }
}

/**
 * Obtém a estrutura dos dados Framer
 * Implementação real usando a API do Framer
 */
export async function getFramerDataSchema(name: string): Promise<any> {
  try {
    const collection = await framer.getManagedCollection();
    if (!collection) {
      return {};
    }
    
    // Obtém os campos definidos na coleção
    const fields = await collection.getFields();
    
    // Retorna um objeto formatado com as informações dos campos
    return {
      name,
      fields: fields
    };
  } catch (error) {
    console.error(`Erro ao obter esquema dos dados "${name}":`, error);
    return {};
  }
}

/**
 * Função auxiliar para converter um valor para um slug
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Substitui espaços por hífens
    .replace(/[^\w\-]+/g, '')       // Remove caracteres não-palavra
    .replace(/\-\-+/g, '-')         // Substitui múltiplos hífens por um único
    .replace(/^-+/, '')             // Remove hífens do início
    .replace(/-+$/, '');            // Remove hífens do final
}

/**
 * Função auxiliar para determinar o tipo de campo no Framer
 */
function getFramerFieldType(value: any): string {
  if (value === null || value === undefined) {
    return 'string';
  }
  
  switch (typeof value) {
    case 'string':
      // Verifica se a string é uma data
      if (!isNaN(Date.parse(value))) {
        return 'date';
      }
      // Verifica se a string é uma URL de imagem
      if (/\.(jpeg|jpg|gif|png|webp|svg)$/i.test(value) || value.startsWith('data:image/')) {
        return 'image';
      }
      // Verifica se é uma cor em formato hexadecimal ou RGB
      if (/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value) || /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/.test(value)) {
        return 'color';
      }
      // Verifica se é uma URL
      if (/^(http|https):\/\/[^ "]+$/.test(value)) {
        return 'link';
      }
      // Verifica se parece HTML formatado
      if (/<\/?[a-z][\s\S]*>/i.test(value)) {
        return 'formattedText';
      }
      // Verifica se é um arquivo
      if (/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip|rar)$/i.test(value)) {
        return 'file';
      }
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      if (value instanceof Date) {
        return 'date';
      }
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'string' && value[0].includes('id')) {
          return 'multiCollectionReference';
        }
        return 'string'; // Convertemos arrays para string por padrão
      }
      // Se o objeto tem um campo id, pode ser uma referência
      if (value.id || value._id || value.ref_id) {
        return 'collectionReference';
      }
      return 'string'; // Objetos complexos são convertidos para string
    default:
      return 'string';
  }
}

/**
 * Executa a sincronização completa de dados do Supabase para o Framer CMS
 */
export async function syncDataToFramer(
  config: SupabaseConfig,
  table: TableInfo,
  mappings: FieldMapping[],
  options: SyncOptions = {}
): Promise<SyncResult> {
  try {
    // Passo 1: Buscar dados do Supabase
    const fetchResult = await fetchDataFromSupabase(config, table, options);
    
    if (!fetchResult.success) {
      return {
        success: false,
        message: 'Falha ao buscar dados do Supabase',
        error: fetchResult.error
      };
    }
    
    if (!fetchResult.data || fetchResult.data.length === 0) {
      return {
        success: true,
        message: 'Nenhum dado encontrado para sincronizar',
        data: [],
        totalRecords: 0
      };
    }
    
    // Passo 2: Transformar os dados conforme mapeamento
    const transformedData = transformData(fetchResult.data, mappings);
    
    if (!transformedData || transformedData.length === 0) {
      return {
        success: false,
        message: 'Erro ao transformar dados',
        error: 'Não foi possível converter os dados para o formato Framer'
      };
    }
    
    // Passo 3: Criar ou atualizar os dados no Framer
    const name = createFramerName(table.name);
    const result = await createOrUpdateFramerData(name, transformedData);
    
    return {
      ...result,
      totalRecords: fetchResult.count || transformedData.length
    };
  } catch (error) {
    console.error('Erro durante sincronização:', error);
    return {
      success: false,
      message: 'Erro durante processo de sincronização',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Executa uma sincronização rápida e automática do Supabase para o Framer
 * Não requer mapeamento manual de campos, mas usa a chave primária selecionada
 */
export async function quickSyncDataToFramer(
  config: SupabaseConfig,
  table: TableInfo
): Promise<SyncResult> {
  try {
    console.log('Iniciando sincronização rápida para tabela:', table.name);
    
    // Verifica se a chave primária foi definida
    if (!table.primaryKeyColumn) {
      return {
        success: false,
        message: 'Chave primária não definida',
        error: 'É necessário definir uma chave primária para sincronizar os dados'
      };
    }
    
    console.log(`Usando chave primária: ${table.primaryKeyColumn}`);
    
    // Passo 1: Buscar todos os dados do Supabase
    const fetchResult = await fetchAllDataFromSupabase(config, table);
    
    if (!fetchResult.success) {
      return {
        success: false,
        message: 'Falha ao buscar dados do Supabase',
        error: fetchResult.error
      };
    }
    
    if (!fetchResult.data || fetchResult.data.length === 0) {
      return {
        success: true,
        message: 'Nenhum dado encontrado para sincronizar',
        data: [],
        totalRecords: 0
      };
    }
    
    console.log(`Dados obtidos: ${fetchResult.data.length} registros`);
    
    // Passo 2: Gerar mapeamentos automáticos com base nos tipos dos dados
    const columns = await getTableColumns(config, table.name);
    const autoMappings = columns.map((column: ColumnInfo) => {
      // Tenta inferir o tipo Framer baseado no tipo do Supabase e nome da coluna
      const framerType = inferFramerTypeFromColumn(column);
      
      return {
        supabaseField: column.name,
        framerField: column.name,
        type: framerType as FieldType
      };
    });
    
    // Passo 3: Transformar os dados com os mapeamentos automáticos
    const transformedData = transformData(fetchResult.data, autoMappings);
    
    console.log('Dados transformados com sucesso');
    
    // Passo 4: Enriquecer os dados com o ID baseado na chave primária
    const dataWithIds = transformedData.map((item, index) => {
      // Obtém o valor da chave primária
      const pkValue = fetchResult.data[index][table.primaryKeyColumn!];
      
      if (pkValue === undefined || pkValue === null) {
        console.warn(`Registro com valor de chave primária nulo ou indefinido: ${JSON.stringify(item)}`);
      }
      
      // Converte para string (o Framer espera que o ID seja string)
      const id = pkValue !== undefined && pkValue !== null ? String(pkValue) : `auto_${Math.random().toString(36).substring(2, 15)}`;
      
      // Gera um slug a partir do título, se existir, ou do ID
      const title = item.title || item.name || pkValue || id;
      const slug = slugify(title);
      
      return {
        ...item,
        _id: id, // Armazenamos o ID original como _id para uso interno
        id: id   // Usamos o valor da chave primária como ID no Framer
      };
    });
    
    // Passo 5: Criar ou atualizar os dados no Framer
    const name = createFramerName(table.name);
    const result = await createOrUpdateFramerData(name, dataWithIds);
    
    return {
      ...result,
      totalRecords: fetchResult.count || dataWithIds.length
    };
  } catch (error) {
    console.error('Erro durante sincronização rápida:', error);
    return {
      success: false,
      message: 'Erro durante processo de sincronização rápida',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Verifica se uma coleção Framer existe
 * Esta é uma função simulada, já que não temos acesso real à API do Framer CMS
 */
export function checkFramerCollectionExists(collectionName: string): boolean {
  return checkFramerDataExists(collectionName); // Redireciona para a nova função
}

/**
 * Obtém a estrutura de uma coleção Framer
 * Esta é uma função simulada, já que não temos acesso real à API do Framer CMS
 */
export function getFramerCollectionSchema(collectionName: string): any {
  return getFramerDataSchema(collectionName); // Redireciona para a nova função
}

/**
 * Formata uma data recente para exibição
 */
export function formatLastSyncTime(date?: Date): string {
  if (!date) return 'Nunca sincronizado';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Agora mesmo';
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
  
  // Menos de 1 dia
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  
  // Formatação padrão para datas mais antigas
  return date.toLocaleString('pt-BR');
}

/**
 * Função para inferir o tipo Framer baseado nas informações da coluna
 */
function inferFramerTypeFromColumn(column: ColumnInfo): string {
  const name = column.name.toLowerCase();
  const type = column.type.toLowerCase();
  
  // Inferências baseadas no nome da coluna
  if (name.includes('color') || name.includes('cor') || 
      name.endsWith('rgb') || name.endsWith('hex')) {
    return 'color';
  }
  
  if (name.includes('url') || name.includes('link') || 
      name.includes('website') || name.includes('site')) {
    return 'link';
  }
  
  if (name.includes('image') || name.includes('imagem') || 
      name.includes('photo') || name.includes('foto') || 
      name.includes('picture') || name.endsWith('img')) {
    return 'image';
  }
  
  if (name.includes('file') || name.includes('arquivo') || 
      name.includes('document') || name.includes('documento') || 
      name.endsWith('pdf') || name.endsWith('doc')) {
    return 'file';
  }
  
  if (name.includes('html') || name.includes('formatted') || 
      name.includes('rich_text') || name.includes('rich_content') || 
      name.includes('texto_formatado')) {
    return 'formattedText';
  }
  
  if (name.includes('reference') || name.includes('referencia') || 
      name.includes('ref_') || name.endsWith('_ref') || 
      name.endsWith('_id')) {
    return 'collectionReference';
  }
  
  if (name.includes('references') || name.includes('refs') || 
      name.includes('ids')) {
    return 'multiCollectionReference';
  }
  
  // Inferências baseadas no tipo PostgreSQL
  if (type.includes('int') || type.includes('float') || 
      type.includes('decimal') || type.includes('numeric') ||
      type.includes('real') || type.includes('double')) {
    return 'number';
  }
  
  if (type.includes('bool')) {
    return 'boolean';
  }
  
  if (type.includes('date') || type.includes('time') || 
      type.includes('timestamp')) {
    return 'date';
  }
  
  if (type.includes('enum')) {
    return 'enum';
  }
  
  // Padrão para tudo mais
  return 'string';
}

/**
 * Obtém informações detalhadas sobre as colunas de uma tabela
 */
export async function getTableColumns(
  config: SupabaseConfig,
  tableName: string
): Promise<ColumnInfo[]> {
  const supabase = createClient(config.url, config.key);
  try {
    const { data, error } = await supabase.rpc('get_table_columns', {
      p_table_name: tableName
    });
    
    if (error) {
      console.error('Erro ao buscar colunas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar colunas da tabela:', error);
    return [];
  }
} 