import React, { useState } from 'react'
import { testConnection } from '../supabase'
import type { ConnectionResult } from '../types/supabase'

interface SupabaseConfigFormProps {
  onSaveConfig: (url: string, key: string) => void
  initialUrl?: string
  initialKey?: string
  onResetConfig?: () => void
  isConfigured?: boolean
  onTestResult?: (result: ConnectionResult) => void
}

export function SupabaseConfigForm({ 
  onSaveConfig, 
  initialUrl = '', 
  initialKey = '',
  onResetConfig,
  isConfigured = false,
  onTestResult
}: SupabaseConfigFormProps) {
  const [url, setUrl] = useState(initialUrl)
  const [key, setKey] = useState(initialKey)
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Testa a conexão automaticamente se houver valores iniciais
  React.useEffect(() => {
    const testInitialConnection = async () => {
      if (initialUrl && initialKey) {
        setIsLoading(true)
        try {
          const result = await testConnection(initialUrl, initialKey)
          setTestResult(result)
          
          if (result.success) {
            if (onTestResult) {
              onTestResult(result)
            }
          }
        } catch (error) {
          setTestResult({
            success: false,
            message: 'Erro ao conectar',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
        } finally {
          setIsLoading(false)
        }
      }
    }

    testInitialConnection()
  }, [initialUrl, initialKey, onTestResult])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await testConnection(url, key)
      setTestResult(result)
      
      if (result.success) {
        onSaveConfig(url, key)
        if (onTestResult) {
          onTestResult(result)
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao conectar',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetConfig = () => {
    if (onResetConfig) {
      onResetConfig();
      setUrl('');
      setKey('');
      setTestResult(null);
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%'
      }}
    >
      {!isConfigured ? (
        <>
          <div>
            <label 
              htmlFor="url"
              style={{ 
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--framer-color-text)'
              }}
            >
              URL do Projeto
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://seu-projeto.supabase.co"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid var(--framer-color-divider)',
                borderRadius: '4px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="key"
              style={{ 
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--framer-color-text)'
              }}
            >
              Chave Anônima
            </label>
            <input
              id="key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              placeholder="sua-chave-anonima"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid var(--framer-color-divider)',
                borderRadius: '4px',
                backgroundColor: 'var(--framer-color-bg-secondary)',
                color: 'var(--framer-color-text)',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="framer-button-primary"
            style={{
              width: '100%',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              marginTop: '4px'
            }}
          >
            {isLoading ? 'Conectando...' : 'Conectar ao Supabase'}
          </button>
        </>
      ) : null}

      {testResult && !testResult.success && (
        <div style={{
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: 'var(--framer-color-bg-secondary)',
          border: '1px solid var(--framer-color-divider)',
          marginTop: '4px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--framer-color-text-tertiary)'
          }}>
            {testResult.message}
          </p>
        </div>
      )}
    </form>
  )
} 