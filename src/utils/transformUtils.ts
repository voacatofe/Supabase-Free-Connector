/**
 * @file transformUtils.ts
 * @description Utilitários de transformação de dados entre Supabase e Framer
 * 
 * Este arquivo contém funções para transformar dados do Supabase para
 * o formato do Framer CMS, garantindo que as transformações sejam
 * consistentes com as descrições apresentadas nos tooltips da interface.
 */

import { FieldMapping, FieldType } from '../types';
import { 
  convertToString, 
  convertToNumber, 
  convertToBoolean,
  DEFAULT_VALUES as BASIC_DEFAULT_VALUES,
  ConversionResult
} from './basicTypeConverters';

/**
 * Descrições detalhadas dos tipos de campo
 * Estas são exatamente as mesmas descrições usadas nos tooltips
 * da interface de mapeamento para garantir consistência
 */
export const TYPE_DESCRIPTIONS = {
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
 * Valores padrão para cada tipo quando a transformação falha
 * Consistentes com as descrições nos tooltips
 */
export const DEFAULT_VALUES: Record<FieldType, any> = {
  ...BASIC_DEFAULT_VALUES
};

/**
 * Interface para resultado de transformação
 */
export interface TransformResult {
  success: boolean;
  value: any;
  error?: string;
}

/**
 * Transforma um valor para o tipo string
 * De acordo com descrição: "Texto simples sem formatação"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToString(value: any): TransformResult {
  const result = convertToString(value);
  return {
    success: result.success,
    value: result.value,
    error: result.error
  };
}

/**
 * Transforma um valor para o tipo number
 * De acordo com descrição: "Valores numéricos como inteiros ou decimais"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToNumber(value: any): TransformResult {
  const result = convertToNumber(value);
  return {
    success: result.success,
    value: result.value,
    error: result.error
  };
}

/**
 * Transforma um valor para o tipo boolean
 * De acordo com descrição: "Valores verdadeiro/falso"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToBoolean(value: any): TransformResult {
  const result = convertToBoolean(value);
  return {
    success: result.success,
    value: result.value,
    error: result.error
  };
}

/**
 * Transforma um valor para o tipo date
 * De acordo com descrição: "Datas e horários. Suporta formatação e operações com datas"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToDate(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.date };
  }

  try {
    // Se já for uma data, retorna em formato ISO
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return {
          success: false,
          value: DEFAULT_VALUES.date,
          error: 'Objeto Date inválido'
        };
      }
      return { success: true, value: value.toISOString() };
    }

    // Tenta converter para Date
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        value: DEFAULT_VALUES.date,
        error: `Não foi possível converter para data: ${String(value)}`
      };
    }
    return { success: true, value: date.toISOString() };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.date,
      error: `Erro ao converter para data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo color
 * De acordo com descrição: "Cores em formato hexadecimal ou RGB"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToColor(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.color };
  }

  try {
    if (typeof value === 'string') {
      // Verifica se é um código hexadecimal válido
      if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
        return { success: true, value };
      }

      // Verifica se é um código RGB válido
      if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(value)) {
        return { success: true, value };
      }

      // Cores nomeadas comuns
      const colorNames: Record<string, string> = {
        'preto': '#000000',
        'branco': '#FFFFFF',
        'vermelho': '#FF0000',
        'verde': '#00FF00',
        'azul': '#0000FF',
        'amarelo': '#FFFF00',
        'roxo': '#800080',
        'rosa': '#FFC0CB',
        'laranja': '#FFA500',
        'cinza': '#808080',
        'black': '#000000',
        'white': '#FFFFFF',
        'red': '#FF0000',
        'green': '#00FF00',
        'blue': '#0000FF',
        'yellow': '#FFFF00',
        'purple': '#800080',
        'pink': '#FFC0CB',
        'orange': '#FFA500',
        'gray': '#808080'
      };

      const lowerValue = value.toLowerCase().trim();
      if (colorNames[lowerValue]) {
        return { success: true, value: colorNames[lowerValue] };
      }

      // Se não for um formato reconhecido, usar padrão
      return {
        success: false,
        value: DEFAULT_VALUES.color,
        error: `Formato de cor não reconhecido: ${value}`
      };
    }

    // Se não for string, tenta converter para string antes
    return transformToColor(String(value));
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.color,
      error: `Erro ao converter para cor: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo formattedText
 * De acordo com descrição: "Texto com formatação HTML"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToFormattedText(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.formattedText };
  }

  try {
    if (typeof value === 'string') {
      // Se for uma string vazia, retorna vazia
      if (!value.trim()) {
        return { success: true, value: '' };
      }

      // Se já parecer HTML, mantenha como está
      if (value.trim().startsWith('<') && value.includes('>')) {
        return { success: true, value };
      }

      // Converte texto simples para HTML básico
      // Respeita quebras de linha
      const formattedValue = value
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
        .join('');

      return { success: true, value: formattedValue };
    }

    // Para outros tipos, primeiro converte para string
    const stringResult = transformToString(value);
    if (!stringResult.success) {
      return {
        success: false,
        value: DEFAULT_VALUES.formattedText,
        error: stringResult.error
      };
    }

    // Então converte a string para texto formatado
    return transformToFormattedText(stringResult.value);
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.formattedText,
      error: `Erro ao converter para texto formatado: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo image
 * De acordo com descrição: "URLs de imagens. Suporta visualização e manipulação de imagens"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToImage(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.image };
  }

  try {
    // Se já for um objeto de imagem válido
    if (typeof value === 'object' && value !== null && 'url' in value) {
      return { success: true, value };
    }

    // Se for uma string, assumimos que é uma URL
    if (typeof value === 'string') {
      // Verifica se a string é uma URL válida
      try {
        new URL(value);
        return { success: true, value: { url: value } };
      } catch (e) {
        // Não é uma URL válida
        return {
          success: false,
          value: DEFAULT_VALUES.image,
          error: `String não é uma URL válida: ${value}`
        };
      }
    }

    // Para outros casos, falha
    return {
      success: false,
      value: DEFAULT_VALUES.image,
      error: `Tipo de valor não suportado para imagem: ${typeof value}`
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.image,
      error: `Erro ao converter para imagem: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo file
 * De acordo com descrição: "Links para arquivos como PDFs, documentos, planilhas, etc."
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToFile(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.file };
  }

  try {
    // Similar a imagem, mas esperamos arquivos
    if (typeof value === 'object' && value !== null && 'url' in value) {
      return { success: true, value };
    }

    // Se for uma string, assumimos que é uma URL
    if (typeof value === 'string') {
      try {
        new URL(value);
        return { success: true, value: { url: value } };
      } catch (e) {
        return {
          success: false,
          value: DEFAULT_VALUES.file,
          error: `String não é uma URL válida: ${value}`
        };
      }
    }

    // Para outros casos, falha
    return {
      success: false,
      value: DEFAULT_VALUES.file,
      error: `Tipo de valor não suportado para arquivo: ${typeof value}`
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.file,
      error: `Erro ao converter para arquivo: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo link
 * De acordo com descrição: "URLs e links externos. Ideal para referências web"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToLink(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.link };
  }

  try {
    // Se for um objeto com propriedade url ou href
    if (typeof value === 'object' && value !== null) {
      if ('url' in value) return { success: true, value: value.url };
      if ('href' in value) return { success: true, value: value.href };
    }

    // Se for uma string, verificamos se é uma URL válida
    if (typeof value === 'string') {
      // Se for vazia, retornamos vazia
      if (!value.trim()) {
        return { success: true, value: '' };
      }

      // Tentamos validar a URL
      try {
        // Se não tiver protocolo, adicionamos https://
        const urlString = value.includes('://') ? value : `https://${value}`;
        new URL(urlString);
        return { success: true, value: urlString };
      } catch (e) {
        // Se não for uma URL válida, mantemos o valor original
        // O Framer lida com links inválidos mostrando-os como texto
        return { success: true, value };
      }
    }

    // Para outros tipos, converte para string
    return {
      success: true,
      value: String(value)
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.link,
      error: `Erro ao converter para link: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo enum
 * De acordo com descrição: "Lista predefinida de opções. Útil para categorias e estados"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToEnum(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.enum };
  }

  try {
    // Enums no Framer são valores simples (strings)
    if (typeof value === 'string') {
      return { success: true, value };
    }

    // Se for um número ou booleano, converte para string
    if (typeof value === 'number' || typeof value === 'boolean') {
      return { success: true, value: String(value) };
    }

    // Para outros tipos, tentamos converter para string
    return {
      success: true,
      value: String(value)
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.enum,
      error: `Erro ao converter para enum: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo collectionReference
 * De acordo com descrição: "Referência a um item em outra coleção. Para relações 1:1"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToCollectionReference(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.collectionReference };
  }

  try {
    // Se for um objeto com propriedade id
    if (typeof value === 'object' && value !== null) {
      if ('id' in value) return { success: true, value: String(value.id) };
      if ('_id' in value) return { success: true, value: String(value._id) };
    }

    // Para outros tipos, converte para string
    return {
      success: true,
      value: String(value)
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.collectionReference,
      error: `Erro ao converter para referência de coleção: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo multiCollectionReference
 * De acordo com descrição: "Referências múltiplas a itens. Para relações 1:N"
 * 
 * @param value Valor a ser transformado
 * @returns Resultado da transformação
 */
export function transformToMultiCollectionReference(value: any): TransformResult {
  if (value === null || value === undefined) {
    return { success: true, value: DEFAULT_VALUES.multiCollectionReference };
  }

  try {
    // Se já for um array
    if (Array.isArray(value)) {
      // Converte cada item para string
      const result = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          if ('id' in item) return String(item.id);
          if ('_id' in item) return String(item._id);
        }
        return String(item);
      });
      return { success: true, value: result };
    }

    // Se for uma string e representar um JSON de array
    if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return transformToMultiCollectionReference(parsed);
        }
      } catch (e) {
        // Ignorar erro de parsing e tratar como string normal
      }
    }

    // Se não for um array, coloca em um array
    return {
      success: true,
      value: [String(value)]
    };
  } catch (error) {
    return {
      success: false,
      value: DEFAULT_VALUES.multiCollectionReference,
      error: `Erro ao converter para múltiplas referências: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Transforma um valor para o tipo especificado, utilizando as descrições
 * presentes nos tooltips da interface para garantir consistência
 * 
 * @param value Valor a ser transformado
 * @param type Tipo de destino no Framer
 * @returns Resultado da transformação
 */
export function transformValue(value: any, type: FieldType): TransformResult {
  switch (type) {
    case 'string':
      return transformToString(value);
    case 'number':
      return transformToNumber(value);
    case 'boolean':
      return transformToBoolean(value);
    case 'date':
      return transformToDate(value);
    case 'color':
      return transformToColor(value);
    case 'formattedText':
      return transformToFormattedText(value);
    case 'image':
      return transformToImage(value);
    case 'file':
      return transformToFile(value);
    case 'link':
      return transformToLink(value);
    case 'enum':
      return transformToEnum(value);
    case 'collectionReference':
      return transformToCollectionReference(value);
    case 'multiCollectionReference':
      return transformToMultiCollectionReference(value);
    case 'object':
      // Tratar objetos (não mostrado nos tooltips mas no FieldType)
      if (value === null || value === undefined) {
        return { success: true, value: {} };
      }
      if (typeof value === 'object') {
        return { success: true, value };
      }
      if (typeof value === 'string') {
        try {
          return { success: true, value: JSON.parse(value) };
        } catch (e) {
          return { 
            success: false, 
            value: {}, 
            error: `Não foi possível converter string para objeto JSON: ${value}` 
          };
        }
      }
      return { success: false, value: {}, error: `Tipo incompatível para objeto: ${typeof value}` };
    case 'array':
      // Tratar arrays (não mostrado nos tooltips mas no FieldType)
      if (value === null || value === undefined) {
        return { success: true, value: [] };
      }
      if (Array.isArray(value)) {
        return { success: true, value };
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return { success: true, value: parsed };
          }
          return { success: true, value: [parsed] };
        } catch (e) {
          return { success: true, value: [value] };
        }
      }
      return { success: true, value: [value] };
    default:
      return {
        success: false,
        value: null,
        error: `Tipo de campo desconhecido: ${type}`
      };
  }
}

/**
 * Transforma dados do Supabase para o formato do Framer CMS
 * baseado nos mapeamentos definidos pelo usuário
 * 
 * @param data Dados do Supabase
 * @param mappings Mapeamentos de campo
 * @returns Dados transformados e logs de erros
 */
export function transformData(
  data: any[],
  mappings: FieldMapping[]
): { 
  transformedData: any[]; 
  errors: Array<{ 
    record: number; 
    field: string; 
    error: string; 
  }> 
} {
  const errors: Array<{ record: number; field: string; error: string }> = [];
  
  // Se não houver dados ou mapeamentos, retorna array vazio
  if (!data || data.length === 0 || !mappings || mappings.length === 0) {
    return { transformedData: [], errors };
  }
  
  try {
    // Transforma cada registro
    const transformedData = data.map((record, recordIndex) => {
      const result: Record<string, any> = {};
      
      // Aplica cada mapeamento
      mappings.forEach(mapping => {
        // Verifica quais propriedades estão disponíveis na interface FieldMapping
        // Pode ser sourceField/targetField ou supabaseField/framerField dependendo da implementação
        const sourceField = 'sourceField' in mapping 
          ? mapping.sourceField 
          : ('supabaseField' in mapping as any) 
            ? (mapping as any).supabaseField 
            : '';
            
        const targetField = 'targetField' in mapping 
          ? mapping.targetField 
          : ('framerField' in mapping as any) 
            ? (mapping as any).framerField 
            : '';
        
        const type = mapping.type;
        
        // Pula se não tiver um campo de origem ou destino
        if (!sourceField || !targetField) return;
        
        // Obtém o valor do campo de origem
        const value = record[sourceField];
        
        // Transforma o valor para o tipo desejado
        const transformResult = transformValue(value, type as FieldType);
        
        // Armazena o valor transformado
        result[targetField] = transformResult.value;
        
        // Se houve erro na transformação, registra
        if (!transformResult.success && transformResult.error) {
          errors.push({
            record: recordIndex,
            field: sourceField,
            error: transformResult.error
          });
        }
      });
      
      return result;
    });
    
    return { transformedData, errors };
  } catch (error) {
    // Em caso de erro geral, retorna array vazio e registra o erro
    errors.push({
      record: -1,
      field: '',
      error: `Erro geral na transformação: ${error instanceof Error ? error.message : String(error)}`
    });
    
    return { transformedData: [], errors };
  }
}

/**
 * Obtém a descrição de um tipo de campo do tooltip
 * 
 * @param type Tipo de campo
 * @returns Descrição do tooltip ou null se não encontrada
 */
export function getTypeDescription(type: string): string | null {
  return (TYPE_DESCRIPTIONS as Record<string, string>)[type] || null;
}

/**
 * Verifica se uma transformação é válida com base nas descrições dos tooltips
 * 
 * @param value Valor a ser verificado
 * @param type Tipo de destino
 * @returns Objeto indicando se é válido e mensagem de erro se não for
 */
export function validateTransformation(value: any, type: FieldType): { 
  valid: boolean; 
  error?: string 
} {
  const result = transformValue(value, type);
  return {
    valid: result.success,
    error: result.error
  };
} 