/**
 * Interface para mensagens de erro amigáveis
 */
export interface ErrorMessage {
  title: string;
  message: string;
  suggestions: string[];
  technicalDetails?: string;
}

/**
 * Tipos de erro que podem ocorrer
 */
export enum ErrorType {
  CONNECTION = 'CONNECTION',
  AUTHENTICATION = 'AUTHENTICATION',
  DATA_FETCH = 'DATA_FETCH',
  DATA_TRANSFORM = 'DATA_TRANSFORM',
  SYNC = 'SYNC',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Mensagens de erro predefinidas
 */
const ERROR_MESSAGES: Record<ErrorType, ErrorMessage> = {
  [ErrorType.CONNECTION]: {
    title: 'Erro de Conexão',
    message: 'Não foi possível conectar ao Supabase.',
    suggestions: [
      'Verifique sua conexão com a internet',
      'Confirme se a URL do Supabase está correta',
      'Verifique se o serviço Supabase está online'
    ]
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Erro de Autenticação',
    message: 'Não foi possível autenticar com o Supabase.',
    suggestions: [
      'Verifique se a chave de API está correta',
      'Confirme se a chave tem as permissões necessárias',
      'Tente gerar uma nova chave de API no painel do Supabase'
    ]
  },
  [ErrorType.DATA_FETCH]: {
    title: 'Erro ao Buscar Dados',
    message: 'Não foi possível obter os dados da tabela.',
    suggestions: [
      'Verifique se a tabela existe no banco de dados',
      'Confirme se você tem permissão para acessar esta tabela',
      'Verifique se há filtros incorretos aplicados'
    ]
  },
  [ErrorType.DATA_TRANSFORM]: {
    title: 'Erro na Transformação',
    message: 'Ocorreu um erro ao converter os dados para o formato do Framer.',
    suggestions: [
      'Verifique se os tipos de dados estão corretos no mapeamento',
      'Confirme se todos os campos obrigatórios estão presentes',
      'Verifique se há valores inválidos nos dados'
    ]
  },
  [ErrorType.SYNC]: {
    title: 'Erro na Sincronização',
    message: 'Não foi possível sincronizar os dados com o Framer.',
    suggestions: [
      'Verifique se o Framer está acessível',
      'Confirme se você tem permissão para modificar a coleção',
      'Tente sincronizar uma quantidade menor de dados'
    ]
  },
  [ErrorType.VALIDATION]: {
    title: 'Erro de Validação',
    message: 'Os dados não passaram na validação.',
    suggestions: [
      'Verifique se todos os campos obrigatórios estão preenchidos',
      'Confirme se os valores estão no formato correto',
      'Verifique se há caracteres especiais inválidos'
    ]
  },
  [ErrorType.UNKNOWN]: {
    title: 'Erro Desconhecido',
    message: 'Ocorreu um erro inesperado.',
    suggestions: [
      'Tente a operação novamente',
      'Verifique os logs para mais detalhes',
      'Entre em contato com o suporte se o problema persistir'
    ]
  }
};

/**
 * Formata uma mensagem de erro com sugestões
 */
export function formatError(
  type: ErrorType,
  originalError?: Error | string,
  customMessage?: string
): ErrorMessage {
  const baseError = ERROR_MESSAGES[type];
  const technicalDetails = originalError instanceof Error 
    ? originalError.message 
    : typeof originalError === 'string' 
      ? originalError 
      : undefined;

  return {
    ...baseError,
    message: customMessage || baseError.message,
    technicalDetails
  };
}

/**
 * Detecta o tipo de erro com base na mensagem ou instância
 */
export function detectErrorType(error: Error | string): ErrorType {
  const errorMessage = error instanceof Error ? error.message : error;
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('connection') || lowerMessage.includes('network') || lowerMessage.includes('conectar')) {
    return ErrorType.CONNECTION;
  }
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
    return ErrorType.AUTHENTICATION;
  }
  if (lowerMessage.includes('transform') || lowerMessage.includes('convert') || lowerMessage.includes('parse')) {
    return ErrorType.DATA_TRANSFORM;
  }
  if (lowerMessage.includes('sync') || lowerMessage.includes('framer')) {
    return ErrorType.SYNC;
  }
  if (lowerMessage.includes('valid') || lowerMessage.includes('required') || lowerMessage.includes('obrigatório')) {
    return ErrorType.VALIDATION;
  }
  if (lowerMessage.includes('fetch') || lowerMessage.includes('select') || lowerMessage.includes('query')) {
    return ErrorType.DATA_FETCH;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Gera uma mensagem de erro amigável com base em um erro
 */
export function handleError(error: Error | string, customMessage?: string): ErrorMessage {
  const errorType = detectErrorType(error);
  return formatError(errorType, error, customMessage);
} 