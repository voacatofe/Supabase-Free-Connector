import { framer } from 'framer-plugin';

/**
 * Re-exporta a instância do framer-plugin para ser usada em todo o aplicativo
 * Centraliza o acesso à API do Framer
 */
export { framer };

/**
 * Verifica se o Framer está em modo de configuração
 */
export function isConfigureMode(): boolean {
  return framer.mode === 'configureManagedCollection';
}

/**
 * Verifica se o Framer está em modo de sincronização
 */
export function isSyncMode(): boolean {
  return framer.mode === 'syncManagedCollection';
}

/**
 * Modo Canvas, quando o plugin é aberto do editor
 */
export function isCanvasMode(): boolean {
  return framer.mode === 'canvas';
} 