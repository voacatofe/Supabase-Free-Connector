# Interface de Mapeamento de Campos (FieldMappingInterface)

Este documento fornece uma documentação abrangente do componente `FieldMappingInterface`, que é responsável por permitir aos usuários mapear colunas do Supabase para campos no Framer CMS com seleção de tipos apropriados.

## Visão Geral

O componente `FieldMappingInterface` é uma parte central do conector Supabase-Framer, permitindo que os usuários:

- Visualizem todas as colunas de uma tabela Supabase selecionada
- Selecionem uma coluna como chave primária para sincronização
- Escolham tipos de campo Framer apropriados para cada coluna
- Salvem configurações de mapeamento
- Redefinam ou limpem mapeamentos existentes

O componente inclui recursos avançados como inferência de tipo inteligente, salvamento automático opcional, notificações toast para feedback ao usuário e navegação por teclado para acessibilidade.

## Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|------------|------------|
| `columns` | `ColumnInfo[]` | Sim | Array de informações sobre colunas da tabela Supabase |
| `onSaveMapping` | `(mappings: FieldMapping[]) => void` | Sim | Callback executado quando os mapeamentos são salvos |
| `tableName` | `string` | Sim | Nome da tabela Supabase selecionada |
| `initialMappings` | `FieldMapping[]` | Não | Mapeamentos iniciais a serem carregados (opcional) |
| `primaryKeyColumn` | `string` | Não | Nome da coluna de chave primária (opcional) |
| `onPrimaryKeyChange` | `(columnName: string) => void` | Não | Callback executado quando a seleção de chave primária muda |
| `autoSave` | `boolean` | Não | Se verdadeiro, salva automaticamente mapeamentos quando são alterados (padrão: false) |

## Estado Interno

| Estado | Tipo | Descrição |
|--------|------|------------|
| `mappings` | `FieldMapping[]` | Armazena os mapeamentos atuais de campo |
| `selectedPrimaryKey` | `string` | Armazena a coluna selecionada como chave primária |
| `showResetConfirm` | `boolean` | Controla a exibição do diálogo de confirmação para redefinir mapeamentos |
| `showClearConfirm` | `boolean` | Controla a exibição do diálogo de confirmação para limpar mapeamentos |
| `hasSynced` | `boolean` | Indica se já houve sincronização prévia (para exibir ou não os botões de gerenciamento) |
| `toast` | `{ show: boolean; message: string; type: 'success' \| 'error' }` | Controla a notificação toast para feedback ao usuário |

## Principais Funções

### Inicialização e Carregamento

#### `useEffect` para Inicialização de Mapeamentos
Inicializa mapeamentos quando as colunas mudam ou quando mapeamentos iniciais são fornecidos.

#### `loadSavedMappings()`
Carrega mapeamentos salvos anteriormente do armazenamento do plugin Framer usando `framer.getPluginData()`.

#### `checkSyncStatus()`
Verifica se já houve sincronização anterior para determinar se deve exibir os botões de gerenciamento.

### Inferência de Tipo

#### `inferFramerType(supabaseType: string, fieldName: string): FieldType`
Função inteligente que analisa o tipo de coluna do Supabase e o nome do campo para sugerir um tipo Framer apropriado. Considera:

- O tipo de dado PostgreSQL (int, boolean, timestamp, etc.)
- Padrões de nomenclatura (campos com "color", "img", "url", etc.)
- Casos especiais como referências, IDs, etc.

Essa função permite que o componente ofereça sugestões de tipo sensíveis ao contexto para uma melhor experiência do usuário.

### Manipulação de Eventos

#### `handleTypeChange(index: number, newType: FieldType)`
Atualiza o tipo de um campo específico nos mapeamentos e salva automaticamente se autoSave estiver habilitado.

#### `handleFieldNameChange(index: number, newName: string)`
Atualiza o nome do campo Framer alvo e salva automaticamente se autoSave estiver habilitado.

#### `handlePrimaryKeyChange(columnName: string)`
Atualiza a seleção de chave primária, notifica o componente pai e salva automaticamente se autoSave estiver habilitado.

#### `handleSaveMappings()`
Salva os mapeamentos usando `framer.setPluginData()`, notifica o componente pai via `onSaveMapping` e mostra notificação toast de sucesso (a menos que autoSave esteja habilitado).

#### `handleResetToDefaults()`
Redefine todos os mapeamentos para os valores sugeridos automaticamente com base nos tipos de coluna e nomes.

#### `handleClearMappings()`
Limpa todos os mapeamentos, deixando os nomes de campos vazios.

### Acessibilidade e UX

#### `handleKeyboardShortcuts(e: KeyboardEvent)`
Implementa atalhos de teclado:
- Ctrl/Cmd + S: Salvar mapeamentos (quando não estiver em modo autoSave)
- Ctrl/Cmd + Z: Abrir diálogo de confirmação para redefinir mapeamentos
- Esc: Fechar diálogos de confirmação

### Utilitários de UI

#### `getTypeDescription(type: FieldType): string`
Retorna uma descrição amigável em português para cada tipo de campo Framer.

#### `formatTitle()`
Formata o título da seção com o nome da tabela.

## Dicionário de Tipos de Campo

O componente inclui descrições detalhadas para cada tipo de campo, acessíveis via tooltips:

| Tipo | Descrição |
|------|-----------|
| `string` | Texto simples sem formatação. Ideal para nomes, títulos, descrições curtas, etc. |
| `number` | Valores numéricos como inteiros ou decimais. Suporta operações matemáticas. |
| `boolean` | Valores verdadeiro/falso. Útil para estados, flags e condições. |
| `date` | Datas e horários. Suporta formatação e operações com datas. |
| `color` | Cores em formato hexadecimal ou RGB. Ideal para personalização visual. |
| `formattedText` | Texto com formatação HTML. Perfeito para conteúdo rico com estilos. |
| `image` | URLs de imagens. Suporta visualização e manipulação de imagens. |
| `file` | Links para arquivos como PDFs, documentos, planilhas, etc. |
| `link` | URLs e links externos. Ideal para referências web. |
| `enum` | Lista predefinida de opções. Útil para categorias e estados. |
| `collectionReference` | Referência a um item em outra coleção. Para relações 1:1. |
| `multiCollectionReference` | Referências múltiplas a itens. Para relações 1:N. |

## Componentes Relacionados

O `FieldMappingInterface` utiliza o componente `Toast` para fornecer feedback visual aos usuários quando as operações são bem-sucedidas ou falham.

## Exemplos de Uso

### Uso Básico
```jsx
<FieldMappingInterface
  columns={supabaseColumns}
  onSaveMapping={handleSaveMappings}
  tableName="users"
/>
```

### Com Mapeamentos Iniciais e Auto-Save
```jsx
<FieldMappingInterface
  columns={supabaseColumns}
  onSaveMapping={handleSaveMappings}
  tableName="products"
  initialMappings={savedMappings}
  primaryKeyColumn="product_id"
  onPrimaryKeyChange={handlePrimaryKeyUpdate}
  autoSave={true}
/>
```

## Fluxo de Dados

1. O componente recebe informações de colunas do Supabase
2. Cria mapeamentos iniciais automáticos ou carrega mapeamentos salvos
3. O usuário pode modificar os tipos de campo e selecionar a chave primária
4. Os mapeamentos são salvos automaticamente (se autoSave=true) ou manualmente
5. O componente pai é notificado sobre os mapeamentos salvos

## Considerações de Design

- O componente foi projetado para ser responsivo e funcionar bem com muitas colunas
- Utiliza as variáveis CSS do Framer para consistência visual com o tema do Framer
- Inclui animações sutis para fornecer feedback visual ao usuário
- Suporta temas claro e escuro automaticamente
- Prioriza a acessibilidade com suporte a navegação por teclado

## Boas Práticas e Dicas

1. **Seleção de Chave Primária**: Escolha sempre um campo que seja único e não nulo como chave primária.
2. **Inferência de Tipo**: O componente sugere tipos automaticamente, mas revise-os para garantir que sejam apropriados.
3. **Nomes de Campos**: Por padrão, os nomes de campo do Framer correspondem aos do Supabase, mas você pode personalizá-los.
4. **Salvamento Automático**: Habilite o autoSave para integração com outros componentes que reagem a mudanças em tempo real.
5. **Feedback do Usuário**: As notificações toast fornecem feedback valioso sobre operações bem-sucedidas ou falhas. 