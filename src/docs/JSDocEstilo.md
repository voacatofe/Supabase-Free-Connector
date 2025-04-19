# Guia de Estilo JSDoc para o Conector Supabase-Framer

Este documento define o padrão de documentação de código a ser seguido em todo o projeto do Conector Supabase-Framer.

## Objetivo

Estabelecer um padrão de documentação consistente para melhorar a legibilidade, manutenção e colaboração no código. A documentação adequada facilita o entendimento da base de código por novos desenvolvedores e serve como referência para quem já trabalha no projeto.

## Regras Gerais

1. Todo arquivo deve começar com um bloco JSDoc descrevendo seu propósito
2. Todas as funções/métodos públicos devem ser documentados 
3. Interfaces e tipos importantes devem incluir documentação
4. Blocos de código complexos devem incluir comentários explicativos
5. Use português para toda a documentação para manter consistência com a interface

## Documentação de Arquivos

Cada arquivo deve começar com um comentário de bloco que inclui:

```tsx
/**
 * @file NomeDoArquivo.tsx
 * @description Breve descrição do propósito do arquivo
 * 
 * Descrição mais detalhada do arquivo e seu papel no sistema.
 * Pode incluir múltiplos parágrafos se necessário.
 * 
 * @see Referências a outros arquivos ou documentação externa
 */
```

## Documentação de Funções/Métodos

Cada função ou método público deve incluir:

```tsx
/**
 * Descrição da função em uma ou duas frases
 * 
 * Descrição mais detalhada do que a função faz, quando necessário.
 * Pode incluir exemplos de uso ou informações adicionais relevantes.
 * 
 * @param {tipo} nomeDoParametro - Descrição do parâmetro
 * @param {tipo} [parametroOpcional] - Descrição (colchetes indicam opcional)
 * @returns {tipo} Descrição do valor retornado
 * @throws {tipo} Descrição da exceção que pode ser lançada
 * @example
 * // Exemplo de como usar a função
 * const resultado = minhaFuncao('valor', 123);
 */
```

## Documentação de Interfaces e Tipos

Interfaces e tipos devem ser documentados assim:

```tsx
/**
 * Descrição da interface ou tipo 
 * 
 * @interface NomeDaInterface
 * @property {tipo} propriedade - Descrição da propriedade
 * @property {tipo} [propriedadeOpcional] - Descrição (opcional)
 */
```

## Documentação de Componentes React

Componentes React devem incluir:

```tsx
/**
 * Descrição breve do componente
 * 
 * Descrição mais detalhada do propósito e comportamento do componente.
 * 
 * @component
 * @example
 * // Exemplo de uso do componente
 * <MeuComponente 
 *   prop1="valor"
 *   prop2={123}
 * />
 */
```

## Documentação de Props de Componentes

Props de componentes React devem ser documentados na interface de props:

```tsx
/**
 * Props para o componente NomeDoComponente
 * 
 * @interface NomeDoComponenteProps
 * @property {tipo} prop - Descrição da prop
 * @property {tipo} [propOpcional] - Descrição (opcional)
 */
interface NomeDoComponenteProps {
  prop: tipo;
  propOpcional?: tipo;
}
```

## Comentários em Blocos de Código

Para blocos de código complexos:

```tsx
// -----------------------------
// Seção: Nome da Seção
// -----------------------------

/**
 * Descrição detalhada do que este bloco de código faz
 * e por que é implementado desta maneira.
 */
```

## Documentação de Estados em Componentes

Para estados importantes em componentes:

```tsx
/**
 * Estados do componente
 */

/** Armazena os mapeamentos atuais de campos */
const [mappings, setMappings] = useState<FieldMapping[]>([]);

/** Controla a exibição do diálogo de confirmação */
const [showConfirm, setShowConfirm] = useState(false);
```

## Marcadores ToDo

Use marcadores TODO para indicar trabalho incompleto:

```tsx
// TODO: Implementar validação de tipos complexos
// TODO(nome): Otimizar algoritmo de inferência de tipo para campos JSON
```

## Exemplos Completos

Veja os arquivos a seguir como referência para o estilo de documentação:

- `src/components/FieldMappingInterface.tsx` - Exemplo de documentação de componente
- `src/utils/inferTypes.ts` - Exemplo de documentação de utilitários
- `src/types/index.ts` - Exemplo de documentação de tipos e interfaces

## Ferramentas Recomendadas

Para consistência, recomendamos o uso das seguintes ferramentas:

1. **ESLint** com plugin JSDoc para validar a documentação
2. **Visual Studio Code** com a extensão "Document This" para gerar templates de documentação
3. **TypeDoc** para gerar documentação HTML a partir dos comentários JSDoc 