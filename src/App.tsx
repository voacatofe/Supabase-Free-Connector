import { useState, useEffect } from 'react'
import { framer, CanvasNode } from "framer-plugin"
import "./App.css"
import { SupabaseConfigForm } from './components/SupabaseConfig'
import type { SupabaseConfig } from './types'

framer.showUI({
    position: "center",
    width: 350,
    height: 540,
})

export function App() {
    const [config, setConfig] = useState<SupabaseConfig | null>(null)

    const handleSaveConfig = (url: string, key: string) => {
        setConfig({ url, key })
    }

    return (
        <div style={{
            backgroundColor: 'var(--framer-color-bg)',
            color: 'var(--framer-color-text)',
            padding: '20px',
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ 
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--framer-color-text)',
                    marginBottom: '8px'
                }}>
                    Supabase Free Connect
                </h1>
                <p style={{
                    fontSize: '13px',
                    color: 'var(--framer-color-text-secondary)'
                }}>
                    Configure sua conexão com o Supabase gratuitamente
                </p>
            </div>

            <SupabaseConfigForm onSaveConfig={handleSaveConfig} />

            {config && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--framer-color-bg-secondary)',
                    borderRadius: '4px',
                    border: '1px solid var(--framer-color-divider)'
                }}>
                    <h2 style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '8px',
                        color: 'var(--framer-color-text)'
                    }}>
                        Configuração Salva
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--framer-color-text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>URL:</span> {config.url}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--framer-color-text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>Chave:</span>{' '}
                            {'*'.repeat(Math.min(config.key.length, 20))}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
