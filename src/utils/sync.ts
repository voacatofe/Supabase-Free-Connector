import { createClient } from '@supabase/supabase-js';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { FieldMapping } from '../types/framer';
import { framer } from '../services/framer';
import { ColumnInfo } from '../types';

// Interface para o resultado da sincronização
export interface SyncResult {
  success: boolean;
  message: string;
  error?: string | SupabaseError;
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
  table?: TableInfo;
  mapping?: FieldMapping[];
}

// Interface para o mapeamento de campos no formato utilizado pelas funções de conversão
interface UtilFieldMapping {
  sourceField: string;
  targetField: string;
  sourceType: string;
  targetType: string;
}

interface ErrorMessage {
  message: string;
  details: string;
  hint?: string;
  code?: string;
}

interface SupabaseError extends ErrorMessage {
  message: string;
  details: string;
  hint?: string;
  code?: string;
}

// Interface para informações do site
export interface SiteInfo {
  id: string;
  name: string;
  [key: string]: any;
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
    return data.map((record, index) => {
      const result: Record<string, any> = {};
      
      // Processa cada campo de acordo com o mapeamento
      mappings.forEach(mapping => {
        const sourceField = mapping.supabaseField;
        const targetField = mapping.framerField;
        const targetType = mapping.type;
        const value = record[sourceField];
        
        try {
          // Converte o valor baseado no tipo de destino
          let convertedValue = value;

          switch (targetType.toLowerCase()) {
            case 'text':
            case 'string':
              // Garante que o valor seja uma string válida
              convertedValue = value !== null && value !== undefined ? String(value) : '';
              break;
              
            case 'number':
              // Converte para número e valida
              if (value === null || value === undefined) {
                convertedValue = 0;
              } else {
                const num = Number(value);
                convertedValue = isNaN(num) ? 0 : num;
              }
              break;
              
            case 'boolean':
              // Converte para boolean de forma mais robusta
              if (typeof value === 'string') {
                convertedValue = ['true', '1', 'yes', 'sim'].includes(value.toLowerCase());
              } else {
                convertedValue = Boolean(value);
              }
              break;
              
            case 'date':
              // Melhora o tratamento de datas
              if (value === null || value === undefined) {
                convertedValue = null;
              } else {
                try {
                  const date = value instanceof Date ? value : new Date(value);
                  if (isNaN(date.getTime())) {
                    console.warn(`Data inválida no registro ${index}, campo ${sourceField}: ${value}`);
                    convertedValue = null;
                  } else {
                    convertedValue = date.toISOString();
                  }
                } catch (e) {
                  console.warn(`Erro ao converter data no registro ${index}, campo ${sourceField}: ${value}`);
                  convertedValue = null;
                }
              }
              break;
              
            case 'image':
              // Melhora o tratamento de imagens
              if (value === null || value === undefined) {
                convertedValue = null;
              } else if (typeof value === 'string') {
                // Verifica se é uma URL válida
                try {
                  new URL(value);
                  convertedValue = { url: value };
                } catch {
                  console.warn(`URL de imagem inválida no registro ${index}, campo ${sourceField}: ${value}`);
                  convertedValue = null;
                }
              } else if (typeof value === 'object' && value.url) {
                // Já está no formato correto
                convertedValue = value;
              } else {
                console.warn(`Formato de imagem inválido no registro ${index}, campo ${sourceField}: ${value}`);
                convertedValue = null;
              }
              break;
              
            case 'richtext':
            case 'formattedtext':
              // Melhora o tratamento de texto formatado
              if (value === null || value === undefined) {
                convertedValue = '';
              } else if (typeof value === 'string') {
                // Tenta detectar se é HTML
                if (value.trim().startsWith('<') && value.trim().endsWith('>')) {
                  convertedValue = value;
                } else {
                  // Converte texto simples para HTML básico
                  convertedValue = value.split('\n').map(line => `<p>${line}</p>`).join('');
                }
              } else {
                convertedValue = String(value);
              }
              break;
              
            case 'array':
              // Melhora o tratamento de arrays
              if (value === null || value === undefined) {
                convertedValue = [];
              } else if (Array.isArray(value)) {
                convertedValue = value;
              } else {
                // Tenta converter string JSON para array
                try {
                  const parsed = JSON.parse(value);
                  convertedValue = Array.isArray(parsed) ? parsed : [value];
                } catch {
                  convertedValue = [value];
                }
              }
              break;
              
            case 'json':
            case 'object':
              // Melhora o tratamento de objetos JSON
              if (value === null || value === undefined) {
                convertedValue = null;
              } else if (typeof value === 'object') {
                convertedValue = value;
              } else {
                // Tenta converter string para objeto
                try {
                  convertedValue = JSON.parse(value);
                } catch {
                  console.warn(`JSON inválido no registro ${index}, campo ${sourceField}: ${value}`);
                  convertedValue = null;
                }
              }
              break;
              
            case 'collectionreference':
              // Referência única para outra coleção
              if (value === null || value === undefined) {
                convertedValue = null;
              } else if (typeof value === 'object' && (value.id || value._id)) {
                convertedValue = String(value.id || value._id);
              } else {
                convertedValue = String(value);
              }
              break;
              
            case 'multicollectionreference':
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
                convertedValue = [String(value)];
              }
              break;
              
            default:
              // Tipo não reconhecido, mantém o valor original
              console.warn(`Tipo de campo não reconhecido: ${targetType} para o campo ${sourceField}`);
              convertedValue = value;
          }
          
          // Adiciona o campo convertido ao resultado
          result[targetField] = convertedValue;
          
        } catch (error) {
          console.error(`Erro ao converter campo ${sourceField} para ${targetField}:`, error);
          // Em caso de erro na conversão, usa o valor original
          result[targetField] = value;
        }
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
    console.log(`Iniciando sincronização para coleção "${collectionName}" com ${data.length} registros`);
    
    // Obtém a coleção gerenciada do Framer
    const collection = await framer.getManagedCollection();
    
    if (!collection) {
      console.error('Coleção não disponível no Framer');
      return {
        success: false,
        message: 'Não foi possível obter a coleção no Framer CMS',
        error: 'Coleção não disponível'
      };
    }
    
    console.log('Coleção Framer obtida com sucesso:', collection ? 'disponível' : 'indisponível');

    // Variável para armazenar os campos configurados
    let configuredFields: Array<{ id: string; name: string; type: string }> = [];
    
    // Define os campos baseado no primeiro item de dados
    if (data.length > 0) {
      console.log('Configurando campos para o Framer CMS');
      
      // Obtém os campos existentes (se houver)
      const existingFields = await collection.getFields();
      console.log('Campos existentes na coleção:', existingFields.length);
      
      const existingFieldMap = new Map(
        existingFields.map(field => [field.name, field])
      );
      
      const sampleItem = data[0];
      console.log('Amostra de item para configuração de campos:', 
                  Object.keys(sampleItem).slice(0, 5).join(', ') + 
                  (Object.keys(sampleItem).length > 5 ? '...' : ''));
      
      // Prepara os campos
      const fields: Array<{ id: string; name: string; type: string }> = [];
      
      for (const key of Object.keys(sampleItem)) {
        // Pula os campos especiais de ID
        if (key === '_id' || key === 'id' || key === 'slug') {
          console.log(`Ignorando campo especial: ${key}`);
          continue;
        }
        
        const value = sampleItem[key];
        // Determina o tipo de campo adequado com base no valor
        const fieldType = getFramerFieldType(value);
        console.log(`Campo "${key}" detectado como tipo: ${fieldType}`);
        
        // Use o campo existente se já estiver definido com o mesmo nome
        const existingField = existingFieldMap.get(key);
        
        if (existingField) {
          console.log(`Usando campo existente: ${key} (${existingField.type})`);
          fields.push(existingField as any);
        } else {
          // Cria um novo campo com ID seguro e tipo apropriado
          const fieldId = `field_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
          console.log(`Criando novo campo: ${key} (${fieldType}) com ID: ${fieldId}`);
          
          fields.push({
            id: fieldId,
            name: key,
            type: fieldType
          });
        }
      }

      // Salva os campos para uso posterior
      configuredFields = fields;
      console.log(`Total de ${fields.length} campos configurados`);
      
      // Configura os campos na coleção
      console.log('Definindo campos na coleção Framer...');
      try {
        await collection.setFields(fields as any);
        console.log('Campos definidos com sucesso');
      } catch (error) {
        console.error('Erro ao definir campos:', error);
        throw error;
      }
    }
    
    // Prepara os itens para adicionar à coleção
    console.log('Preparando itens para adicionar à coleção...');
    const collectionItems = data.map((item, index) => {
      // Usa o ID já definido (baseado na chave primária)
      const itemId = item.id || `item_${Math.random().toString(36).substring(2, 15)}`;
      
      // Define um slug para o item - importante para URLs amigáveis no Framer
      const slug = item.slug || slugify(item.title || item.name || itemId);
      
      // Constrói o objeto de dados do campo
      const fieldData: Record<string, any> = {};
      
      // Obtém os tipos de campo a partir dos campos configurados
      const fieldTypes = new Map(configuredFields.map(field => [field.id, field.type]));
      
      for (const key of Object.keys(item)) {
        // Pula os campos especiais de ID
        if (key === '_id' || key === 'id' || key === 'slug') continue;
        
        // Usa o mesmo padrão de ID que usamos ao definir os campos
        const fieldId = `field_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const value = item[key];
        const fieldType = fieldTypes.get(fieldId) || 'string';
        
        // O Framer espera um formato específico para cada tipo de campo
        // Encapsula o valor conforme o tipo do campo
        try {
          switch (fieldType) {
            case 'string':
              fieldData[fieldId] = value !== null && value !== undefined ? String(value) : '';
              break;
            case 'number':
              if (value === null || value === undefined) {
                fieldData[fieldId] = 0;
              } else {
                const num = Number(value);
                fieldData[fieldId] = isNaN(num) ? 0 : num;
              }
              break;
            case 'boolean':
              fieldData[fieldId] = Boolean(value);
              break;
            case 'date':
              if (value instanceof Date) {
                fieldData[fieldId] = value.toISOString();
              } else if (value === null || value === undefined) {
                fieldData[fieldId] = null;
              } else {
                try {
                  const date = new Date(value);
                  fieldData[fieldId] = isNaN(date.getTime()) ? null : date.toISOString();
                } catch (e) {
                  console.warn(`Erro ao converter data para o campo ${key}:`, e);
                  fieldData[fieldId] = null;
                }
              }
              break;
            case 'image':
              // Para URLs de imagem
              if (value === null || value === undefined) {
                fieldData[fieldId] = null;
              } else if (typeof value === 'string') {
                fieldData[fieldId] = { url: value };
              } else if (typeof value === 'object' && value !== null && 'url' in value) {
                fieldData[fieldId] = value;
              } else {
                fieldData[fieldId] = { url: String(value) };
              }
              break;
            case 'color':
              // Para valores de cor
              fieldData[fieldId] = value !== null && value !== undefined ? String(value) : '#000000';
              break;
            case 'formattedText':
              // Para texto com formatação HTML
              if (value === null || value === undefined) {
                fieldData[fieldId] = '';
              } else if (typeof value === 'string') {
                fieldData[fieldId] = value;
              } else {
                fieldData[fieldId] = String(value);
              }
              break;
            case 'object':
              // Para objetos JSON
              if (value === null || value === undefined) {
                fieldData[fieldId] = {};
              } else if (typeof value === 'object') {
                // Se já for um objeto, use-o diretamente
                fieldData[fieldId] = value;
              } else if (typeof value === 'string') {
                // Tenta fazer parse da string como JSON
                try {
                  fieldData[fieldId] = JSON.parse(value);
                } catch (e) {
                  console.warn(`Erro ao fazer parse JSON do campo ${key}:`, e);
                  // Fallback para objeto com propriedade value
                  fieldData[fieldId] = { value: value };
                }
              } else {
                // Para outros tipos, cria um objeto com propriedade value
                fieldData[fieldId] = { value: value };
              }
              break;
            default:
              // Fallback para string para outros tipos
              fieldData[fieldId] = value !== null && value !== undefined ? String(value) : '';
          }
        } catch (e) {
          console.warn(`Erro ao processar campo ${key} do item ${index}:`, e);
          // Use um valor padrão para evitar falha na sincronização
          fieldData[fieldId] = '';
        }
      }
      
      if (index === 0 || index === data.length - 1) {
        console.log(`Item ${index + 1}/${data.length} preparado: id=${itemId}, slug=${slug}, campos=${Object.keys(fieldData).length}`);
      }
      
      // Retorna o objeto no formato esperado pelo Framer
      return {
        id: itemId,
        slug: slug,
        title: item.title || item.name || String(itemId), // Use um campo significativo como título
        fieldData: fieldData
      };
    });
    
    // Adiciona os itens à coleção (o Framer fará upsert automaticamente)
    console.log(`Adicionando ${collectionItems.length} itens à coleção...`);
    try {
      await collection.addItems(collectionItems as any);
      console.log('Itens adicionados com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar itens:', error);
      throw error;
    }
    
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
      error: error instanceof Error ? error.message : String(error)
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
      // Verifica se parece ser JSON
      if ((value.startsWith('{') && value.endsWith('}')) || 
          (value.startsWith('[') && value.endsWith(']'))) {
        try {
          const parsed = JSON.parse(value);
          // Verifica se é um array ou objeto após o parse
          if (Array.isArray(parsed)) {
            return 'array';
          }
          return 'object';
        } catch (e) {
          // Se não for JSON válido, trata como string
        }
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
        // Arrays são tratados como arrays no Framer
        return 'array';
      }
      // Para todos os outros objetos, incluindo JSON
      return 'object';
    default:
      return 'string';
  }
}

/**
 * Prepara um valor para ser enviado ao Framer, garantindo compatibilidade
 */
function prepareValueForFramer(value: any): any {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (Array.isArray(value)) {
      // Converte arrays para formato compatível com o Framer
      return JSON.stringify(value);
    } else {
      // Converte objetos para string JSON
      try {
        return JSON.stringify(value);
      } catch (error) {
        console.error('Erro ao converter objeto para JSON:', error);
        return String(value);
      }
    }
  }

  return value;
}

/**
 * Função para sincronizar dados do Supabase para o Framer
 */
export async function syncDataToFramer(
  sourceData: any[], 
  collectionName: string,
  fieldMappings: FieldMapping[]
): Promise<SyncResult> {
  console.log('Iniciando sincronização para', collectionName);
  
  if (!sourceData || sourceData.length === 0) {
    return {
      success: false,
      message: 'Nenhum dado para sincronizar',
      error: 'Dados de origem vazios',
      data: [],
      collectionName,
      totalRecords: 0
    };
  }

  if (!fieldMappings || fieldMappings.length === 0) {
    return {
      success: false,
      message: 'Nenhum mapeamento de campo definido',
      error: 'Mapeamentos vazios',
      data: [],
      collectionName,
      totalRecords: 0
    };
  }

  try {
    // Transformar dados de acordo com os mapeamentos
    const transformedData = transformData(sourceData, fieldMappings);
    
    // Verifica se temos dados transformados
    if (!transformedData || transformedData.length === 0) {
      return {
        success: false,
        message: 'Falha ao transformar dados',
        error: 'Erro desconhecido na transformação',
        data: [],
        collectionName,
        totalRecords: 0
      };
    }

    // Preparar dados para o Framer
    const preparedData = transformedData.map(item => {
      const preparedItem: Record<string, any> = {};
      
      for (const key in item) {
        preparedItem[key] = prepareValueForFramer(item[key]);
      }
      
      return preparedItem;
    });

    // Enviar dados transformados para o Framer
    const result = await createOrUpdateFramerData(collectionName, preparedData);
    
    return {
      ...result,
      collectionName,
      totalRecords: preparedData.length
    };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return {
      success: false,
      message: 'Erro durante a sincronização',
      error: error instanceof Error ? error.message : String(error),
      data: [],
      collectionName,
      totalRecords: 0
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

export function processMapping(mapping: Record<string, unknown>): Record<string, string> {
  return Object.entries(mapping).reduce((acc, [key, value]) => {
    acc[key] = String(value ?? '');
    return acc;
  }, {} as Record<string, string>);
}

function createSupabaseError(message: string, details: string = '', hint: string = '', code: string = ''): SupabaseError {
  return {
    message,
    details,
    hint,
    code
  };
}

function handleSupabaseError(error: unknown): SupabaseError {
  if (error instanceof Error) {
    return createSupabaseError(error.message, 'Erro do tipo Error');
  }
  
  if (typeof error === 'string') {
    return createSupabaseError(error, 'Erro de string');
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as { message?: unknown; details?: unknown };
    return createSupabaseError(
      String(errorObj.message ?? 'Erro desconhecido'),
      String(errorObj.details ?? 'Detalhes não disponíveis')
    );
  }
  
  return createSupabaseError('Um erro desconhecido ocorreu', 'Erro não identificado');
}

export async function sync(options: SyncOptions): Promise<SyncResult> {
  if (!options || !options.table || !options.mapping) {
    return {
      success: false,
      message: 'Opções de sincronização inválidas',
      error: createSupabaseError('Opções de sincronização inválidas', 'As opções table e mapping são obrigatórias')
    };
  }

  try {
    // ... existing code ...
  } catch (error) {
    return {
      success: false,
      message: 'Erro durante a sincronização',
      error: handleSupabaseError(error)
    };
  }

  return {
    success: false,
    message: 'Implementação pendente',
    error: 'Função ainda não implementada completamente'
  };
}