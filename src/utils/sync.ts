import { createClient } from '@supabase/supabase-js';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { FieldMapping } from '../types/framer';
import { previewFieldValue, convertRecord } from './fieldMapper';

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
    // Converte para o formato necessário para a função convertRecord
    const fieldMappings = convertFieldMappings(mappings);
    
    // Aplica a conversão para cada registro
    return data.map(record => convertRecord(record, fieldMappings as any));
  } catch (error) {
    console.error('Erro ao transformar dados:', error);
    return [];
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
 * Esta é uma função simulada, já que não temos acesso real à API do Framer CMS
 * Em um ambiente real, esta função usaria a API Framer.Collection ou getManagedCollection
 */
export async function createOrUpdateFramerData(
  collectionName: string,
  data: any[]
): Promise<SyncResult> {
  try {
    // NOTA: Isto é uma simulação. Em um plugin real, você usaria a API do Framer:
    // const collection = Framer.Collection.getManagedCollection(collectionName);
    // collection.setData(data);
    
    console.log(`Simulando criação/atualização dos dados "${collectionName}" com ${data.length} registros`);
    
    // Aqui estamos apenas simulando a operação
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
 * Verifica se os dados Framer existem
 * Esta é uma função simulada, já que não temos acesso real à API do Framer CMS
 */
export function checkFramerDataExists(name: string): boolean {
  // NOTA: Isto é uma simulação. Em um plugin real, você usaria:
  // return !!Framer.Collection.getCollection(name);
  
  console.log(`Simulando verificação de existência dos dados "${name}"`);
  return true; // Simulando que os dados existem
}

/**
 * Obtém a estrutura dos dados Framer
 * Esta é uma função simulada, já que não temos acesso real à API do Framer CMS
 */
export function getFramerDataSchema(name: string): any {
  // NOTA: Isto é uma simulação. Em um plugin real, você usaria:
  // const collection = Framer.Collection.getCollection(name);
  // return collection.getSchema();
  
  console.log(`Simulando obtenção de esquema dos dados "${name}"`);
  return {}; // Retornando objeto vazio como simulação
} 