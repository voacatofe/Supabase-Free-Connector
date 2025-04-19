import React from 'react';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { quickSyncDataToFramer, SyncResult } from '../utils/sync';

interface SyncManagerProps {
  table: TableInfo;
  config: SupabaseConfig;
  onSyncComplete?: (result: SyncResult) => void;
}

/**
 * Função para sincronizar dados de uma tabela Supabase para o Framer
 * Esta versão é apenas uma função utilitária que não possui UI própria
 */
export async function syncTableToFramer({ 
  table, 
  config, 
  onSyncComplete 
}: SyncManagerProps): Promise<SyncResult> {
  try {
    // Usa a função de sincronização automática
    const result = await quickSyncDataToFramer(config, table);
    
    // Se há um callback para notificar sobre a conclusão, chama-o
    if (onSyncComplete) {
      onSyncComplete(result);
    }
    
    return result;
  } catch (error) {
    const errorResult: SyncResult = {
      success: false,
      message: 'Erro durante a sincronização',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
    
    // Notifica sobre o erro, se há um callback configurado
    if (onSyncComplete) {
      onSyncComplete(errorResult);
    }
    
    return errorResult;
  }
} 