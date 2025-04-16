import * as React from 'react'
import { SupabaseConfig, ConnectionResult } from '../types'
import { testConnection } from '../supabase'

interface Props {
  onConfigSave: (config: SupabaseConfig) => void
}

export const SupabaseConfigForm: React.FC<Props> = ({ onConfigSave }) => {
  const [config, setConfig] = React.useState<SupabaseConfig>({
    url: '',
    key: ''
  })
  const [testResult, setTestResult] = React.useState<ConnectionResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await testConnection(config.url, config.key)
    setTestResult(result)
    
    if (result.success) {
      onConfigSave(config)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Configuração do Supabase</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">URL do Projeto:</label>
          <input
            type="text"
            value={config.url}
            onChange={e => setConfig({ ...config, url: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="https://seu-projeto.supabase.co"
            required
          />
        </div>

        <div>
          <label className="block mb-2">Chave Anônima:</label>
          <input
            type="password"
            value={config.key}
            onChange={e => setConfig({ ...config, key: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="sua-chave-anonima"
            required
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Testar Conexão
        </button>
      </form>

      {testResult && (
        <div className={`p-4 rounded ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
            {testResult.message}
          </p>
          {testResult.error && (
            <p className="text-red-500 text-sm mt-2">{testResult.error}</p>
          )}
        </div>
      )}
    </div>
  )
} 