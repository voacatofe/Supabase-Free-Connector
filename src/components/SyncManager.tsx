import React, { useState } from 'react';
import { TableInfo, SupabaseConfig } from '../types/supabase';
import { FieldMapping } from '../types/framer';
import { syncDataToFramer, SyncResult, SyncOptions, formatLastSyncTime } from '../utils/sync';

interface SyncManagerProps {
  table: TableInfo;
  config: SupabaseConfig;
  fieldMappings: FieldMapping[];
}

export function SyncManager({ table, config, fieldMappings }: SyncManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    limit: 1000,
    orderBy: 'id',
    orderDirection: 'asc'
  });

  // Função para executar a sincronização
  const handleSync = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const result = await syncDataToFramer(config, table, fieldMappings, syncOptions);
      setLastSyncResult(result);
      
      if (result.success) {
        setLastSyncTime(new Date());
      }
    } catch (error) {
      setLastSyncResult({
        success: false,
        message: 'Erro durante a sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar as opções de sincronização
  const updateSyncOption = (key: keyof SyncOptions, value: any) => {
    setSyncOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ 
        fontSize: '14px', 
        fontWeight: 500, 
        margin: '0 0 12px 0',
        color: 'var(--framer-color-text)'
      }}>
        Sincronização de Dados
      </h3>
      
      <p style={{ 
        fontSize: '13px', 
        color: 'var(--framer-color-text-secondary)', 
        margin: '0 0 16px 0' 
      }}>
        Sincronize dados da tabela Supabase para o Framer CMS
      </p>

      {/* Configurações de sincronização */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--framer-color-bg-secondary)',
        border: '1px solid var(--framer-color-divider)',
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        <h4 style={{ 
          fontSize: '13px', 
          fontWeight: 500, 
          margin: '0 0 12px 0',
          color: 'var(--framer-color-text)'
        }}>
          Opções de Sincronização
        </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label 
            htmlFor="sync-limit"
            style={{ 
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              color: 'var(--framer-color-text-secondary)'
            }}
          >
            Limite de registros
          </label>
          <input 
            id="sync-limit"
            type="number" 
            min="1" 
            max="10000"
            value={syncOptions.limit || 1000} 
            onChange={(e) => updateSyncOption('limit', Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              border: '1px solid var(--framer-color-divider)',
              borderRadius: '4px',
              backgroundColor: 'var(--framer-color-bg-secondary)',
              color: 'var(--framer-color-text)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label 
              htmlFor="order-by"
              style={{ 
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                color: 'var(--framer-color-text-secondary)'
              }}
            >
              Ordenar por
            </label>
            <select
              id="order-by"
              value={syncOptions.orderBy || 'id'}
              onChange={(e) => updateSyncOption('orderBy', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid var(--framer-color-divider)',
                borderRadius: '4px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text)'
              }}
            >
              <option value="id">ID</option>
              <option value="created_at">Data de criação</option>
              <option value="updated_at">Data de atualização</option>
              {table.columns.map(col => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label 
              htmlFor="order-direction"
              style={{ 
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                color: 'var(--framer-color-text-secondary)'
              }}
            >
              Direção
            </label>
            <select
              id="order-direction"
              value={syncOptions.orderDirection || 'asc'}
              onChange={(e) => updateSyncOption('orderDirection', e.target.value as 'asc' | 'desc')}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid var(--framer-color-divider)',
                borderRadius: '4px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text)'
              }}
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Informações de status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: 'var(--framer-color-bg-secondary)',
        border: '1px solid var(--framer-color-divider)',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--framer-color-text)' }}>
            Tabela: {table.name}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--framer-color-text-secondary)', 
            marginTop: '4px' 
          }}>
            Última sincronização: {formatLastSyncTime(lastSyncTime)}
          </div>
        </div>
        
        <div>
          {lastSyncResult && (
            <div style={{ 
              fontWeight: 500,
              color: lastSyncResult.success 
                ? 'var(--framer-color-tint)' 
                : 'var(--framer-color-danger)'
            }}>
              {lastSyncResult.success 
                ? `${lastSyncResult.totalRecords || 0} registros sincronizados` 
                : 'Falha na sincronização'}
            </div>
          )}
        </div>
      </div>

      {/* Botão de sincronização */}
      <button 
        type="button"
        onClick={handleSync}
        disabled={isLoading || fieldMappings.length === 0}
        style={{
          width: '100%',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: 500,
          backgroundColor: 'var(--framer-color-tint)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading || fieldMappings.length === 0 ? 'not-allowed' : 'pointer',
          opacity: isLoading || fieldMappings.length === 0 ? 0.5 : 1
        }}
      >
        {isLoading ? 'Sincronizando...' : 'Sincronizar dados para o Framer'}
      </button>

      {/* Mensagem de resultado */}
      {lastSyncResult && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: lastSyncResult.success 
            ? 'var(--framer-color-success-bg)' 
            : 'var(--framer-color-danger-bg)',
          border: `1px solid ${lastSyncResult.success 
            ? 'var(--framer-color-success)' 
            : 'var(--framer-color-danger)'}`,
          color: lastSyncResult.success 
            ? 'var(--framer-color-success)' 
            : 'var(--framer-color-danger)'
        }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {lastSyncResult.message}
          </div>
          
          {lastSyncResult.error && (
            <div style={{ fontSize: '12px' }}>
              {lastSyncResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 