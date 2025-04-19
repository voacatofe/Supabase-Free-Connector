# Guia do Usuário: Interface de Mapeamento de Campos

Este guia fornece instruções detalhadas sobre como utilizar a Interface de Mapeamento de Campos do Conector Supabase-Framer.

## Sumário

1. [Introdução](#introdução)
2. [Acessando a Interface](#acessando-a-interface)
3. [Entendendo a Interface](#entendendo-a-interface)
4. [Seleção de Chave Primária](#seleção-de-chave-primária)
5. [Escolha de Tipos de Campo](#escolha-de-tipos-de-campo)
6. [Salvando Configurações](#salvando-configurações)
7. [Reiniciando e Limpando Mapeamentos](#reiniciando-e-limpando-mapeamentos)
8. [Atalhos de Teclado](#atalhos-de-teclado)
9. [Solução de Problemas](#solução-de-problemas)
10. [Perguntas Frequentes](#perguntas-frequentes)

## Introdução

A Interface de Mapeamento de Campos permite conectar sua tabela Supabase ao Framer, definindo como cada coluna do banco de dados deve ser interpretada no CMS do Framer. Este processo é crucial para garantir que seus dados sejam corretamente sincronizados e exibidos.

## Acessando a Interface

Após configurar sua conexão Supabase e selecionar uma tabela, você será direcionado para a interface de mapeamento de campos automaticamente.

## Entendendo a Interface

A interface de mapeamento é organizada como uma tabela com três colunas principais:

- **Chave Primária**: Permite selecionar uma coluna como identificador único para sincronização
- **Coluna**: Exibe o nome da coluna na tabela Supabase
- **Tipo**: Permite selecionar o tipo de campo do Framer para cada coluna

Cada linha representa uma coluna do seu banco de dados Supabase e permite definir como ela será tratada no Framer.

## Seleção de Chave Primária

A chave primária é usada para identificar registros únicos durante a sincronização. 

### Como selecionar uma chave primária:

1. Localize a coluna que deseja usar como identificador único (geralmente uma coluna `id`, `uid` ou similar)
2. Marque a caixa de seleção na coluna "Chave Primária" para essa linha
3. Observe que apenas uma coluna pode ser selecionada como chave primária

**Dica**: Escolha sempre uma coluna que contenha valores únicos e nunca nulos. Colunas de ID geradas automaticamente são ideais para esta finalidade.

## Escolha de Tipos de Campo

Cada coluna do Supabase precisa ser mapeada para um tipo de campo compatível no Framer.

### Tipos de Campo Disponíveis:

| Tipo | Melhor Uso |
|------|------------|
| Texto | Nomes, títulos, descrições curtas |
| Número | Valores numéricos, quantidades, preços |
| Booleano | Status ativo/inativo, opções sim/não |
| Data | Datas de publicação, prazos, calendários |
| Cor | Valores de cores em hex/RGB |
| Texto Formatado | Conteúdo rico com HTML, descrições longas |
| Imagem | URLs de imagens para exibição |
| Arquivo | PDFs, documentos, planilhas |
| Link | URLs e referências externas |
| Enumeração | Listas de opções pré-definidas |
| Referência | Relacionamentos com outros itens (1:1) |
| Múltiplas Refs | Coleções de referências (1:N) |

### Como selecionar o tipo:

1. Para cada linha, clique no menu suspenso na coluna "Tipo"
2. Selecione o tipo de campo Framer mais apropriado para o dado
3. Passe o mouse sobre a opção para ver uma descrição detalhada

**Dica**: O sistema tenta inferir automaticamente o tipo mais adequado com base no nome e tipo da coluna Supabase, mas revise sempre para garantir a melhor escolha.

## Salvando Configurações

Após definir todos os mapeamentos, você precisa salvar as configurações.

### Como salvar:

1. Verifique se todos os campos estão corretamente mapeados
2. Pressione `Ctrl+S` (ou `Cmd+S` no Mac)
3. Uma notificação de sucesso aparecerá no canto inferior direito

**Nota**: Se o modo "Auto-Save" estiver ativado, as alterações serão salvas automaticamente quando você modificar qualquer mapeamento.

## Reiniciando e Limpando Mapeamentos

Você pode reiniciar os mapeamentos para os valores padrão ou limpar completamente o mapeamento.

### Para reiniciar para os valores padrão:

1. Clique no botão ↻ (Reiniciar) na parte superior da interface
2. Confirme a ação na caixa de diálogo
3. Os mapeamentos serão redefinidos para as inferências automáticas do sistema

### Para limpar todos os mapeamentos:

1. Clique no botão 🗑️ (Limpar) na parte superior da interface
2. Confirme a ação na caixa de diálogo
3. Todos os campos alvo serão limpos

## Atalhos de Teclado

A interface suporta os seguintes atalhos de teclado para agilizar seu trabalho:

| Atalho | Função |
|--------|--------|
| `Ctrl+S` / `Cmd+S` | Salvar mapeamentos |
| `Ctrl+Z` / `Cmd+Z` | Abrir diálogo de redefinição |
| `Esc` | Fechar diálogos de confirmação |
| `Enter` | Confirmar ação em diálogos |
| `Tab` | Navegar entre campos |

## Solução de Problemas

### Mapeamento não salva:

- Verifique se o plugin tem permissões de armazenamento
- Tente reiniciar o Framer e tentar novamente
- Verifique se o console do navegador mostra erros

### Tipos incorretos após sincronização:

- Certifique-se de que os tipos selecionados são compatíveis com os dados
- Verifique se há valores inconsistentes na sua tabela Supabase
- Para campos específicos como cores, certifique-se de que estão no formato correto

### Chave primária não funciona para sincronização:

- Confirme que a coluna selecionada contém valores únicos
- Verifique se não há valores nulos na coluna
- Para IDs UUID, certifique-se de que estão corretamente formatados

## Perguntas Frequentes

### Posso mapear múltiplas colunas para o mesmo tipo?

Sim, você pode mapear quantas colunas quiser para o mesmo tipo de campo Framer.

### O que acontece se eu não selecionar uma chave primária?

Você deve selecionar uma chave primária para que a sincronização funcione corretamente. Sem uma chave primária, o sistema não consegue identificar registros únicos.

### Posso customizar os nomes dos campos no Framer?

Sim, os nomes dos campos no Framer seguem por padrão os nomes das colunas Supabase, mas podem ser personalizados na versão completa do conector.

### Como lidar com colunas JSONB do PostgreSQL?

Colunas JSONB são melhor mapeadas como "Texto Formatado" ou, dependendo da estrutura, como "Objeto" se contiverem estruturas de dados complexas.

### O que acontece com as colunas que não mapeio?

Apenas as colunas mapeadas serão sincronizadas com o Framer. Colunas não mapeadas serão ignoradas durante a sincronização.

### Posso alterar os mapeamentos após a sincronização inicial?

Sim, você pode alterar os mapeamentos a qualquer momento. Na próxima sincronização, os novos mapeamentos serão aplicados. 