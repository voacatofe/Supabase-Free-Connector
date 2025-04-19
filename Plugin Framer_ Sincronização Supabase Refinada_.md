# **Guia Detalhado de Implementação: Plugin Framer para Sincronização CMS Supabase (Sincronização Manual)**

## **Introdução**

Este documento fornece um guia detalhado para a implementação de um plugin Framer projetado para conectar um banco de dados Supabase ao Content Management System (CMS) do Framer, permitindo a sincronização de dados. Baseado no feedback do utilizador e nas limitações inerentes ao ambiente de plugins do Framer, a abordagem inicial de sincronização em tempo real foi substituída por um mecanismo de **sincronização manual**.1

As funcionalidades chave a serem implementadas incluem:

1. **Configuração do Plugin:** Armazenamento seguro das credenciais de conexão do Supabase e das configurações específicas do projeto (tabela selecionada, mapeamentos de campo, chave primária).  
2. **Interface de Mapeamento de Campos:** Uma interface de utilizador (UI) que permite ao utilizador selecionar a tabela Supabase, designar uma coluna como identificador único (chave primária) e mapear colunas do Supabase para campos do CMS do Framer, especificando o tipo de campo apropriado no Framer.  
3. **Lógica de Sincronização Manual (Upsert):** Um processo acionado pelo utilizador que busca dados do Supabase, compara-os com os dados existentes no Framer CMS usando a chave primária e atualiza registos existentes ou cria novos, prevenindo duplicatas.  
4. **Tratamento de Erros:** Mecanismos robustos para detetar, reportar e, quando possível, recuperar de erros durante a configuração e sincronização.

Este guia destina-se a um Agente de IA de IDE (Ambiente de Desenvolvimento Integrado), fornecendo instruções precisas e detalhadas para facilitar o desenvolvimento do plugin em TypeScript.

## **Secção 1: Configuração e Setup do Plugin**

Esta secção detalha como o plugin deve armazenar as configurações necessárias para a sua operação, incluindo credenciais do Supabase e definições específicas do projeto Framer.

### **1.1. Armazenamento das Credenciais de Conexão Supabase (URL, Chave Anon)**

**Requisito:** Armazenar de forma segura a URL e a Chave Anónima (Anon Key) do Supabase, que são específicas para cada utilizador/instância do plugin.

**Método:** Utilizar a API localStorage do navegador dentro do ambiente isolado (sandboxed) do plugin Framer.2

**Detalhes e Contextualização:** A documentação de desenvolvimento do Framer sugere o uso de localStorage para dados específicos do utilizador, como tokens de autenticação, dentro do iframe isolado do plugin.2 Este isolamento impede que outros plugins acedam a estes dados. Embora as práticas gerais de segurança web desaconselhem fortemente o armazenamento de chaves de API no lado do cliente 3, a Chave Anónima do Supabase é *intencionalmente* projetada para ser publicamente acessível em aplicações cliente. A segurança do acesso aos dados com a Chave Anónima depende fundamentalmente da configuração correta das Políticas de Segurança a Nível de Linha (Row Level Security \- RLS) no próprio banco de dados Supabase. Portanto, armazenar a Chave Anónima no localStorage do plugin é a abordagem pragmática e documentada dentro deste contexto específico. É crucial, no entanto, **nunca** armazenar chaves sensíveis, como a Chave de Serviço (Service Key) do Supabase, desta forma.

**Implementação:**

1. Fornecer campos na UI do plugin para o utilizador inserir a sua URL Supabase e a Chave Anónima.  
2. Ao guardar, utilizar:  
   JavaScript  
   localStorage.setItem('supabaseUrl', url);  
   localStorage.setItem('supabaseAnonKey', key);

3. Ao carregar o plugin, recuperar as credenciais com:  
   JavaScript  
   const supabaseUrl \= localStorage.getItem('supabaseUrl');  
   const supabaseAnonKey \= localStorage.getItem('supabaseAnonKey');

### **1.2. Armazenamento das Configurações do Plugin (Tabela Selecionada, Mapeamentos de Campo, Chave Primária)**

**Requisito:** Persistir configurações que são específicas do projeto Framer onde o plugin está a ser utilizado, como a tabela Supabase selecionada, a estrutura de mapeamento de campos e a coluna designada como chave primária. Estes dados devem ser partilhados entre utilizadores que trabalham no mesmo projeto Framer.

**Método:** Utilizar a API framer.setPluginData() fornecida pelo Framer.2

**Detalhes e Contextualização:** A API framer.setPluginData() permite armazenar dados globais ao nível do projeto.2 Esta API armazena os dados como strings, com limitações de tamanho (máximo de 2kB por entrada, total de 4kB por projeto para dados globais). Isto é adequado para configurações não sensíveis como nomes de tabelas e estruturas de mapeamento. Como a estrutura de mapeamento é tipicamente um array de objetos em JavaScript/TypeScript, será necessário serializá-la para uma string JSON antes de a guardar e desserializá-la (parsing) ao recuperá-la. As limitações de tamanho devem ser consideradas, embora sejam geralmente suficientes para a maioria dos casos de uso de mapeamento de campos.

**Implementação:**

1. Definir chaves de armazenamento consistentes (ex: 'supabaseTableName', 'fieldMappings', 'primaryKeyColumn').  
2. Quando o utilizador guardar a configuração (seleção de tabela, mapeamentos):  
   * Serializar a estrutura de mapeamento (array/objeto) para uma string JSON: JSON.stringify(mappings).  
   * Guardar os dados:  
     JavaScript  
     await framer.setPluginData('supabaseTableName', tableName);  
     await framer.setPluginData('fieldMappings', JSON.stringify(mappings));  
     await framer.setPluginData('primaryKeyColumn', primaryKeyColumnName);

3. Ao carregar a configuração do plugin:  
   * Recuperar os dados:  
     JavaScript  
     const tableName \= await framer.getPluginData('supabaseTableName');  
     const mappingsString \= await framer.getPluginData('fieldMappings');  
     const primaryKeyColumnName \= await framer.getPluginData('primaryKeyColumn');

   * Desserializar a string de mapeamentos: const mappings \= mappingsString? JSON.parse(mappingsString) : null;  
4. Tratar casos em que os dados ainda não foram definidos (retorno null).  
5. Manter a estrutura de mapeamento concisa para respeitar os limites de armazenamento.

### **1.3. Inicialização do Cliente Supabase**

**Requisito:** Criar uma instância do cliente supabase-js para interagir com o banco de dados Supabase configurado.

**Método:** Utilizar a função createClient da biblioteca @supabase/supabase-js.

**Detalhes e Contextualização:** Esta é a forma padrão de interagir com o Supabase a partir de ambientes JavaScript/TypeScript, conforme demonstrado em vários exemplos e plugins existentes.6

**Implementação:**

1. Importar createClient de @supabase/supabase-js.  
2. Recuperar a URL e a Chave Anónima do localStorage (ver Secção 1.1).  
3. Verificar se as credenciais existem. Se sim, inicializar o cliente:  
   JavaScript  
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl \= localStorage.getItem('supabaseUrl');  
   const supabaseAnonKey \= localStorage.getItem('supabaseAnonKey');  
   let supabase \= null;

   if (supabaseUrl && supabaseAnonKey) {  
       supabase \= createClient(supabaseUrl, supabaseAnonKey);  
   } else {  
       // Tratar caso de credenciais ausentes:  
       // \- Desabilitar funcionalidade de sincronização  
       // \- Exibir mensagem a solicitar configuração  
       console.warn("Supabase credentials not configured.");  
   }

4. Disponibilizar a instância supabase para outras partes do plugin que necessitem de interagir com o banco de dados.

## **Secção 2: Implementação da Interface de Mapeamento de Campos**

Esta secção descreve a interface de utilizador necessária para permitir que os utilizadores configurem como os dados do Supabase são mapeados para o CMS do Framer.

### **2.1. Visão Geral dos Componentes da UI**

**Requisito:** Fornecer uma UI intuitiva para:

* Selecionar a tabela Supabase a sincronizar.  
* Designar uma coluna Supabase como chave primária.  
* Mapear colunas Supabase para campos do CMS Framer, especificando o tipo de campo Framer.

**Componentes Necessários:**

* **Seletor de Tabela Supabase:** Um elemento \<select\> (dropdown) ou similar para escolher a tabela.  
* **Seletor de Chave Primária:** Integrado na tabela de mapeamento, utilizando botões de rádio (\<input type="radio"\>) para garantir a seleção única.  
* **Tabela/Lista de Mapeamento de Campos:** Uma estrutura (ex: \<table\>) que exibe as colunas Supabase e permite configurar o mapeamento para cada uma.  
* **Botão Guardar Configuração:** Para persistir as escolhas do utilizador.

### **2.2. Obtenção e Exibição de Informações da Tabela Supabase**

**Requisito:** Preencher dinamicamente a UI com as tabelas e colunas disponíveis no banco de dados Supabase do utilizador.

**Método:** Idealmente, utilizar as capacidades de introspecção do Supabase. Isto pode envolver a consulta a esquemas de informação (information\_schema) ou, preferencialmente, a utilização de funções RPC (Remote Procedure Call) personalizadas criadas no Supabase para expor metadados do esquema de forma controlada. A biblioteca supabase-js padrão pode não expor diretamente funções de introspecção completas. Uma alternativa menos robusta seria buscar uma única linha (limit(1)) de uma tabela especificada pelo utilizador para inferir os nomes das colunas. *Assume-se que um método eficaz (preferencialmente RPC) será implementado.*

**Implementação:**

1. Criar uma função assíncrona para buscar os nomes das tabelas acessíveis (respeitando RLS) e preencher o seletor de tabelas.  
2. Após a seleção de uma tabela, criar outra função assíncrona para buscar os nomes das colunas (e, se possível, os tipos de dados do Supabase) dessa tabela.  
3. Preencher a tabela de mapeamento de campos com as colunas obtidas.

### **2.3. Seleção da Chave Primária**

**Requisito:** Permitir ao utilizador selecionar exatamente uma coluna Supabase que servirá como identificador único para corresponder registos durante a sincronização.

**Método:** Utilizar botões de rádio (\<input type="radio"\>) na tabela de mapeamento, um por linha (coluna Supabase), garantindo que apenas um pode ser selecionado.

**Detalhes e Contextualização:** A seleção de uma chave primária é fundamental para a lógica de "upsert" (atualizar ou inserir). A API collection.addItems do Framer, utilizada para adicionar e atualizar itens em Coleções Geridas (Managed Collections), baseia-se na propriedade id de cada item fornecido.11 Para que o Framer possa atualizar um item existente em vez de criar um duplicado, o plugin *deve* usar o *valor* da coluna Supabase designada como chave primária para preencher a propriedade id do item correspondente no Framer CMS. Se um item for passado para addItems com um id que já existe na coleção, o Framer atualiza esse item; caso contrário, cria um novo. O valor usado como id no Framer **deve ser uma string**.

**Implementação:**

1. Incluir um grupo de botões de rádio na tabela de mapeamento, associados a cada coluna Supabase.  
2. Garantir que a seleção de um botão de rádio desmarca automaticamente qualquer outro selecionado.  
3. Armazenar o nome da coluna Supabase selecionada como chave primária (ver Secção 1.2).  
4. Validar que uma chave primária foi selecionada antes de guardar a configuração.

### **2.4. Configuração do Mapeamento de Campos**

**Requisito:** Permitir aos utilizadores mapear colunas específicas do Supabase para campos do CMS Framer, escolhendo o nome do campo Framer e o tipo de dados Framer apropriado.

**Método:** Uma tabela ou lista onde cada linha representa uma coluna Supabase. Cada linha deve conter controlos para:

* **Nome do Campo Framer:** Um campo de texto (\<input type="text"\>), possivelmente pré-preenchido com o nome da coluna Supabase, mas editável.  
* **Tipo de Campo Framer:** Um seletor dropdown (\<select\>) listando os tipos suportados.  
* **(Implícito):** O seletor de Chave Primária (botão de rádio) da Secção 2.3.

**Tipos de Campo Framer:** O dropdown deve incluir os tipos de campo suportados pela API do CMS do Framer 11:

* boolean (Verdadeiro/Falso)  
* color (Cor em formato RGBA/HSL/HEX)  
* number (Número)  
* string (Texto simples)  
* formattedText (Conteúdo HTML formatado)  
* image (Instância de ImageAsset)  
* file (Instância de FileAsset)  
* link (URL em formato string)  
* date (Data em formato UTC ou DD-MM-YYYY)  
* enum (Requer definição de opções)  
* collectionReference (Referência a um item noutra Coleção)  
* multiCollectionReference (Múltiplas referências a itens noutra Coleção)

**Implementação:**

1. Gerar dinamicamente as linhas da tabela de mapeamento com base nas colunas Supabase obtidas (Secção 2.2).  
2. Preencher o dropdown de tipo de campo com os valores listados acima.11  
3. Estruturar os dados de mapeamento internamente como um array de objetos, por exemplo:  
   TypeScript  
   interface FieldMapping {  
       supabaseColumn: string;  
       framerFieldName: string;  
       framerFieldType: string; // Deve corresponder aos tipos em \[11\]  
       isPrimaryKey: boolean;  
       // Adicionar um ID estável para usar em setFields, se necessário  
       fieldDefinitionId: string;  
   }  
   let mappings: FieldMapping \=;

### **2.5. Guardar a Configuração de Mapeamento**

**Requisito:** Persistir as escolhas de mapeamento do utilizador para uso futuro e durante a sincronização.

**Método:** Utilizar framer.setPluginData() conforme descrito na Secção 1.2.

**Implementação:**

1. Adicionar um botão "Guardar Configuração" à UI de mapeamento.  
2. No evento de clique do botão:  
   * Recolher a tabela Supabase selecionada.  
   * Identificar a coluna selecionada como chave primária.  
   * Recolher todos os mapeamentos de campo (nome do campo Framer, tipo de campo Framer) da tabela/lista.  
   * Construir o objeto/array de mapeamento estruturado (como no exemplo da Secção 2.4).  
   * Realizar validações (ex: verificar se uma chave primária foi selecionada, se os nomes dos campos Framer são únicos).  
   * Serializar a estrutura de mapeamento para JSON: JSON.stringify(mappings).  
   * Chamar await framer.setPluginData(...) para guardar o nome da tabela, o nome da coluna da chave primária e a string JSON dos mapeamentos.  
   * Fornecer feedback ao utilizador (ex: "Configuração guardada com sucesso\!").

### **Tabela 1: Estrutura da Interface de Mapeamento de Campos (Conceptual)**

Esta tabela serve como um guia visual para a estrutura da UI de mapeamento e os dados que precisam ser capturados.

| Coluna Supabase | Usar como Chave Primária | Mapear para Nome do Campo Framer | Selecionar Tipo de Campo Framer |
| :---- | :---- | :---- | :---- |
| id (ex: UUID) | (🔘) Sim / ( ) Não | ItemID (editável) | string (dropdown) |
| product\_name (ex: text) | ( ) Sim / (🔘) Não | Nome do Produto | string (dropdown) |
| description (ex: text) | ( ) Sim / (🔘) Não | Descrição | formattedText (dropdown) |
| price (ex: numeric) | ( ) Sim / (🔘) Não | Preço | number (dropdown) |
| image\_url (ex: text) | ( ) Sim / (🔘) Não | Imagem do Produto | image (dropdown) |
| created\_at (ex: timestamp) | ( ) Sim / (🔘) Não | Data de Criação | date (dropdown) |
| is\_active (ex: boolean) | ( ) Sim / (🔘) Não | Ativo | boolean (dropdown) |
| *... (outras colunas)* | ... | ... | ... |

## **Secção 3: Lógica Central de Sincronização (Acionamento Manual)**

Esta secção detalha o processo passo a passo para sincronizar os dados do Supabase com o Framer CMS, acionado manualmente pelo utilizador.

### **3.1. Acionamento da Sincronização**

**Requisito:** Iniciar o processo de sincronização manualmente.

**Método:** Utilizar os modos de Coleção Gerida (Managed Collection) do Framer, especificamente o modo syncManagedCollection.11

**Detalhes e Contextualização:** A API de plugins do Framer para CMS distingue entre Coleções Não Geridas (criadas e editadas principalmente por utilizadores) e Coleções Geridas (controladas pelo plugin).11 Para plugins que sincronizam dados de fontes externas, como o Supabase, o uso de Coleções Geridas é o apropriado. O Framer define dois modos principais para estes plugins: configureManagedCollection (para configuração inicial e edição de definições) e syncManagedCollection (para executar a sincronização de dados). A abordagem idiomática e recomendada é executar a lógica de importação/sincronização quando o plugin é ativado no modo syncManagedCollection. Frequentemente, após a sincronização neste modo, o plugin pode fechar-se automaticamente (framer.closePlugin()), exibindo apenas uma notificação (toast) para indicar o progresso e a conclusão.11 Esta experiência de "sincronização com um clique" é comum em plugins existentes.12 A sincronização automática ou em tempo real é uma limitação conhecida da plataforma de plugins atual.1

**Implementação:**

1. Garantir que syncManagedCollection e configureManagedCollection estão listados na propriedade modes do ficheiro framer.json do plugin.11  
2. No ponto de entrada do plugin, verificar o modo atual: framer.mode.11  
3. Implementar a lógica condicional:  
   JavaScript  
   import { framer } from "framer-plugin";  
   import { runSyncLogic } from "./sync"; // Função que contém os passos 3.2 a 3.7  
   import { showConfigurationUI } from "./ui"; // Função que renderiza a UI de configuração

   async function main() {  
       if (framer.mode \=== "syncManagedCollection") {  
           // Exibir notificação de início (opcional)  
           framer.showToast("Starting sync...");  
           try {  
               await runSyncLogic();  
               framer.showToast("Sync complete\!");  
           } catch (error) {  
               console.error("Sync failed:", error);  
               framer.showToast(\`Sync failed: ${error.message}\`);  
               // Não fechar automaticamente em caso de erro para permitir depuração?  
           } finally {  
                await framer.closePlugin("Sync finished"); // Fechar após sucesso ou erro (ajustar conforme necessário)  
           }  
       } else if (framer.mode \=== "configureManagedCollection") {  
           // Exibir a UI de configuração (Secções 1 e 2\)  
           showConfigurationUI();  
           framer.showUI({ width: 400, height: 600 }); // Ajustar dimensões  
       }  
   }

   main();

### **3.2. Recuperação da Configuração**

**Requisito:** Carregar todas as configurações necessárias (credenciais, tabela, mapeamentos, chave primária) antes de iniciar a sincronização.

**Método:** Utilizar localStorage.getItem() para as credenciais Supabase e framer.getPluginData() para as configurações do projeto (tabela, mapeamentos, chave primária).

**Implementação:**

1. Recuperar a URL e Chave Anónima do localStorage.  
2. Recuperar o nome da tabela, a string de mapeamentos e o nome da coluna da chave primária usando framer.getPluginData().  
3. Desserializar a string de mapeamentos (JSON.parse).  
4. Validar que todas as configurações necessárias estão presentes e válidas. Se alguma configuração estiver em falta, lançar um erro informativo para interromper a sincronização.

### **3.3. Obtenção de Dados do Supabase**

**Requisito:** Recuperar os registos da tabela Supabase configurada.

**Método:** Utilizar o cliente supabase-js inicializado (Secção 1.3).

**Detalhes e Contextualização:** A operação principal será uma consulta SELECT.9 Para otimizar a performance e minimizar a transferência de dados, a consulta select() deve especificar *apenas* as colunas Supabase que foram incluídas no mapeamento de campos (incluindo a coluna da chave primária). Para tabelas com um grande número de registos, deve ser considerada a implementação de paginação utilizando o método .range(from, to) do supabase-js para buscar dados em lotes 9, em vez de tentar buscar tudo de uma vez.

**Implementação:**

1. Obter a lista de nomes de colunas Supabase a partir da configuração de mapeamento recuperada.  
2. Construir dinamicamente a string para o método select(), separando os nomes das colunas por vírgulas (ex: 'id,product\_name,price,image\_url').  
3. Executar a consulta Supabase:  
   JavaScript  
   const { data: supabaseRows, error } \= await supabase  
      .from(tableName)  
      .select(selectedColumnsString);  
       //.range(0, 999); // Exemplo de paginação inicial (buscar os primeiros 1000\)

4. Verificar se ocorreu um erro (error). Se sim, lançar um erro com a mensagem do Supabase.18  
5. Se a paginação for implementada, será necessário um loop para buscar todos os lotes de dados.

### **3.4. Obtenção dos Itens Existentes do CMS Framer**

**Requisito:** Obter os itens atualmente presentes na Coleção Gerida do Framer correspondente para permitir a comparação e a lógica de upsert.

**Método:** Utilizar a API do CMS do Framer para Coleções Geridas.

**Detalhes e Contextualização:** Primeiro, obter uma referência à coleção gerida ativa usando framer.getManagedCollection().11 Depois, buscar todos os itens dessa coleção. A documentação 11 menciona await framer.getItems() para coleções gerais; assume-se que um método similar, como collection.getItems(), existe para Coleções Geridas (*verificar a API específica se diferente*). Para uma comparação eficiente, é altamente recomendável indexar os itens existentes num Map ou objeto JavaScript, usando o id do item Framer (que corresponde ao valor da chave primária do Supabase) como chave.

**Implementação:**

1. Obter a instância da coleção gerida:  
   JavaScript  
   const collection \= await framer.getManagedCollection();  
   if (\!collection) {  
       throw new Error("Managed Collection not found.");  
   }

2. Buscar os itens existentes:  
   JavaScript  
   const existingFramerItems \= await collection.getItems(); // Verificar nome exato do método

3. Criar um mapa para lookup rápido:  
   JavaScript  
   const existingItemsMap \= new Map(  
       existingFramerItems.map(item \=\> \[item.id, item\])  
   );

### **3.5. Definição dos Campos da Coleção**

**Requisito:** Garantir que a estrutura (schema) da Coleção Gerida no Framer corresponde aos campos definidos no mapeamento do plugin.

**Método:** Utilizar o método collection.setFields().

**Detalhes e Contextualização:** Antes de adicionar ou atualizar itens, a estrutura de campos da coleção deve ser definida ou atualizada.11 Esta operação utiliza a configuração de mapeamento guardada. É crucial que o id fornecido para cada campo na chamada setFields corresponda exatamente às chaves usadas dentro do objeto fieldData ao adicionar/atualizar itens.11 Este id do campo deve ser um identificador estável (ex: derivado do framerFieldName ou um UUID gerado e guardado na configuração do mapeamento). Esta operação (setFields) deve idealmente ser feita uma vez durante a configuração inicial ou verificada/atualizada no início de cada sincronização para garantir que a estrutura da coleção está correta.

**Implementação:**

1. Transformar a configuração de mapeamento guardada (array FieldMapping da Secção 2.4) no formato esperado por setFields:  
   JavaScript  
   const fieldDefinitions \= mappings  
      .filter(mapping \=\>\!mapping.isPrimaryKey) // Não incluir a PK como campo customizado  
      .map(mapping \=\> ({  
           id: mapping.fieldDefinitionId, // Usar o ID estável do campo  
           name: mapping.framerFieldName,  
           type: mapping.framerFieldType,  
           userEditable: false // Ou configurar com base numa opção adicional no mapeamento  
       }));

2. Chamar setFields:  
   JavaScript  
   await collection.setFields(fieldDefinitions);

### **3.6. Transformação e Comparação de Dados (Preparação para Upsert)**

**Requisito:** Iterar sobre os dados obtidos do Supabase, compará-los com os dados existentes no Framer usando a chave primária e preparar os payloads formatados corretamente para a operação de upsert (addItems).

**Método:** Percorrer o array supabaseRows. Para cada linha (row):

1. Extrair o valor da coluna Supabase designada como chave primária.  
2. Converter este valor para uma **string** para ser usado como id do item Framer.  
3. Verificar se um item com este id já existe no existingItemsMap.  
4. Construir o objeto fieldData mapeando os valores das colunas Supabase para os campos Framer correspondentes, usando os fieldDefinitionId definidos em setFields.  
5. Construir o objeto completo do item Framer, incluindo id, slug, title (campos obrigatórios 11) e fieldData.

**Implementação:**

1. Identificar o primaryKeyColumnName a partir da configuração.  
2. Criar um array vazio: let itemsToUpsert \=;.  
3. Loop sobre os dados do Supabase:  
   JavaScript  
   for (const row of supabaseRows) {  
       const pkValue \= row\[primaryKeyColumnName\];  
       if (pkValue \=== null |

| pkValue \=== undefined) {  
console.warn(Skipping row due to null/undefined primary key: ${JSON.stringify(row)});  
continue; // Ignorar linhas sem chave primária válida  
}

    const framerItemId \= String(pkValue); // Garantir que o ID é uma string

    const fieldData \= {};  
    let potentialTitle \= framerItemId; // Fallback para o título

    for (const mapping of mappings) {  
        if (\!mapping.isPrimaryKey) {  
            const supabaseValue \= row\[mapping.supabaseColumn\];  
            let transformedValue \= supabaseValue;

            // \--- Lógica de Transformação de Tipo (Exemplos) \---  
            if (mapping.framerFieldType \=== 'date' && supabaseValue) {  
                // Tentar converter para objeto Date ou string UTC/ISO  
                try {  
                    transformedValue \= new Date(supabaseValue).toISOString();  
                } catch (e) {  
                    console.warn(\`Invalid date format for column ${mapping.supabaseColumn}: ${supabaseValue}\`);  
                    transformedValue \= null; // Ou manter original / lançar erro  
                }  
            } else if (mapping.framerFieldType \=== 'number' && supabaseValue\!== null) {  
                transformedValue \= Number(supabaseValue);  
                if (isNaN(transformedValue)) {  
                     console.warn(\`Invalid number format for column ${mapping.supabaseColumn}: ${supabaseValue}\`);  
                     transformedValue \= null;  
                }  
            } else if (mapping.framerFieldType \=== 'boolean') {  
                 transformedValue \= Boolean(supabaseValue);  
            }  
            // Adicionar transformações para 'image', 'file', 'formattedText' se necessário  
            // (Pode exigir tratamento especial para URLs ou HTML)  
            // \--- Fim da Lógica de Transformação \---

            fieldData\[mapping.fieldDefinitionId\] \= transformedValue;

            // Lógica simples para determinar o título (usar o primeiro campo string mapeado)  
            if (mapping.framerFieldType \=== 'string' && transformedValue && potentialTitle \=== framerItemId) {  
                potentialTitle \= String(transformedValue);  
            }  
        }  
    }

    // Gerar slug (exemplo simples: substituir espaços por hífens e minúsculas)  
    const generatedSlug \= potentialTitle.toLowerCase().replace(/\\s+/g, '-').replace(/\[^a-z0-9-\]/g, '');

    const itemPayload \= {  
        id: framerItemId,  
        slug: generatedSlug |

| framerItemId, // Garantir que slug não é vazio  
title: potentialTitle,  
fieldData: fieldData,  
};

    itemsToUpsert.push(itemPayload);  
}  
\`\`\`

4. **(Opcional mas Recomendado) Tratamento de Exclusões:**  
   * Obter todos os framerItemId (strings) do supabaseRows.  
   * Iterar sobre as chaves (id) do existingItemsMap.  
   * Identificar os IDs que existem no existingItemsMap mas *não* existem nos dados do Supabase.  
   * Adicionar esses IDs a um array itemsToDeleteIds.

### **3.7. Execução da Operação Upsert**

**Requisito:** Adicionar os novos itens e atualizar os itens existentes no CMS do Framer de forma eficiente.

**Método:** Utilizar o método collection.addItems().

**Detalhes e Contextualização:** A beleza da API de Coleções Geridas do Framer reside no facto de o método addItems tratar nativamente tanto da criação como da atualização.11 Ao passar um array de objetos de item, cada um com um id, o Framer verifica internamente se um item com esse id já existe. Se existir, atualiza os seus dados (slug, title, fieldData); se não existir, cria um novo item. Isto simplifica enormemente a lógica do plugin, pois não são necessárias chamadas separadas para criar e atualizar. A chave para o sucesso desta operação é a correta preparação do array itemsToUpsert na etapa anterior, garantindo que o campo id de cada item corresponde ao valor (convertido para string) da chave primária do Supabase.

**Implementação:**

1. Chamar addItems com o array preparado:  
   JavaScript  
   if (itemsToUpsert.length \> 0) {  
       await collection.addItems(itemsToUpsert);  
   }

2. Se o tratamento de exclusões foi implementado:  
   JavaScript  
   // Assumindo que itemsToDeleteIds foi populado na etapa 3.6  
   if (itemsToDeleteIds && itemsToDeleteIds.length \> 0) {  
       // Verificar o nome exato do método para remover itens  
       await collection.removeItems(itemsToDeleteIds);  
   }

## **Secção 4: Tratamento de Erros e Feedback ao Utilizador**

Um plugin robusto deve antecipar e tratar falhas potenciais durante a configuração e sincronização, fornecendo feedback claro ao utilizador.

### **4.1. Identificação de Pontos de Falha Potenciais**

É crucial identificar onde o processo pode falhar:

* **Configuração:** Credenciais Supabase inválidas ou em falta (localStorage).  
* **Conectividade:** Falhas de rede ao contactar a API do Supabase ou as APIs do Framer.  
* **Acesso Supabase:** Nome de tabela ou coluna inválido; Políticas RLS a bloquear o acesso; Erros da API Supabase (ex: limites de taxa, erros de query).18  
* **Processamento de Dados:** Erros durante a transformação de tipos (ex: formato de data inválido, falha na conversão para número); Valores de chave primária nulos ou duplicados no Supabase (se não for uma PK verdadeira).  
* **API Framer:** Erros retornados pelas APIs do Framer (ex: tipo de campo inválido, falha na validação do item, limites da API); Exceder limites de armazenamento de dados do plugin.2

### **4.2. Estratégias de Implementação**

**Método:** Utilizar blocos try...catch de forma extensiva e validar entradas/configurações.

**Implementação:**

1. Envolver todas as chamadas a APIs externas (Supabase, Framer) e operações de processamento de dados potencialmente falíveis (ex: JSON.parse, transformações de tipo) em blocos try...catch.  
   JavaScript  
   try {  
       // Código que pode falhar (ex: chamada API, processamento)  
       const data \= await someAsyncOperation();  
       //...  
   } catch (error) {  
       console.error("Operation failed:", error);  
       // Preparar mensagem de erro para o utilizador  
       throw new Error(\`Failed during operation X: ${error.message}\`); // Re-lançar ou tratar  
   }

2. Validar a configuração recuperada (Secção 3.2) antes de iniciar as chamadas API de sincronização.  
3. Verificar as respostas das APIs (Supabase e Framer) para propriedades de erro explícitas, mesmo que a chamada não lance uma exceção.  
4. Dentro dos blocos catch, registar o erro detalhado na consola (console.error) para depuração e preparar uma mensagem de erro mais amigável para o utilizador.

### **4.3. Fornecimento de Feedback ao Utilizador**

**Requisito:** Manter o utilizador informado sobre o estado do processo de sincronização e quaisquer problemas encontrados.

**Método:** Utilizar os mecanismos de feedback da UI do Framer.

**Detalhes e Contextualização:** O Framer fornece notificações "toast" que podem ser exibidas programaticamente (framer.showToast()).11 Estas são ideais para mensagens curtas de estado (início, sucesso, falha). Para erros mais detalhados ou feedback durante a configuração, podem ser usados elementos de texto dentro da própria UI do plugin.

**Implementação:**

1. Exibir uma notificação de "A sincronizar..." (framer.showToast("Syncing...")) no início do modo syncManagedCollection.  
2. Em caso de sucesso, exibir "Sincronização concluída\!" (framer.showToast("Sync Complete\!")), opcionalmente incluindo uma contagem de itens processados.  
3. Em caso de falha, exibir uma mensagem de erro clara e concisa via framer.showToast(), indicando a natureza do problema (ex: "Falha ao conectar ao Supabase. Verifique as credenciais.", "Erro ao processar dados: formato de data inválido.", "Falha na sincronização: \[Mensagem de Erro da API\]").  
4. Considerar manter a UI do plugin aberta em caso de erro no modo syncManagedCollection para exibir informações adicionais, se relevante, em vez de fechar automaticamente.  
5. Na UI de configuração, usar elementos de texto para exibir erros de validação (ex: "É necessário selecionar uma chave primária.").

## **Secção 5: Resumo das Instruções para o Agente de IA**

Este resumo consolida as tarefas principais para a implementação do plugin pelo agente de IA.

**Tarefas Principais:**

1. **Implementar UI de Configuração:**  
   * Campos para credenciais Supabase (URL, Chave Anon), guardados em localStorage.  
   * Seletor de tabela Supabase.  
   * Interface de mapeamento de campos (Tabela/Lista):  
     * Seleção de Chave Primária (Radio buttons).  
     * Input para Nome do Campo Framer.  
     * Dropdown para Tipo de Campo Framer (usar tipos de 11).  
   * Botão "Guardar" que persiste tabela, PK e mapeamentos (serializados em JSON) usando framer.setPluginData().  
2. **Inicializar Cliente Supabase:** Usar createClient de @supabase/supabase-js com credenciais do localStorage.  
3. **Implementar Lógica de Sincronização Manual (no modo syncManagedCollection):**  
   * Recuperar configuração (localStorage, framer.getPluginData, JSON.parse).  
   * Obter dados do Supabase (supabase.from(table).select(mappedColumns)), considerar paginação (.range()).  
   * Obter coleção gerida (framer.getManagedCollection()).  
   * Definir/Atualizar campos da coleção (collection.setFields()) com base nos mapeamentos.  
   * Obter itens existentes do Framer (collection.getItems()), indexar por ID num Map.  
   * Iterar sobre os dados do Supabase:  
     * Extrair valor da PK, converter para **string** (framerItemId).  
     * Construir fieldData transformando valores conforme tipos mapeados.  
     * Determinar title e slug (obrigatórios).  
     * Criar itemPayload \= { id: framerItemId, slug, title, fieldData }.  
     * Adicionar itemPayload a um array itemsToUpsert.  
   * (Opcional) Identificar IDs para exclusão (itemsToDeleteIds).  
   * Executar upsert: collection.addItems(itemsToUpsert).  
   * (Opcional) Executar exclusões: collection.removeItems(itemsToDeleteIds).  
4. **Implementar Tratamento de Erros:** Usar try...catch extensivamente em chamadas API e processamento.  
5. **Implementar Feedback ao Utilizador:** Usar framer.showToast() para estados (início, sucesso, falha) e erros. Usar UI para erros de validação.  
6. **Gerir Modos:** Usar framer.mode para alternar entre UI de configuração (configureManagedCollection) e lógica de sincronização (syncManagedCollection). Fechar plugin (framer.closePlugin()) após sincronização (especialmente em caso de sucesso).

**APIs e Conceitos Chave:**

* **Armazenamento:** localStorage, framer.setPluginData(), framer.getPluginData(), JSON.stringify(), JSON.parse().  
* **Supabase:** createClient, supabase.from().select().eq().range() etc..9  
* **Framer CMS API:** framer.mode, framer.getManagedCollection(), collection.setFields(), collection.getItems(), collection.addItems(), collection.removeItems() (verificar nome exato), Tipos de Campo.11  
* **Framer UI:** framer.showUI(), framer.showToast(), framer.closePlugin().  
* **Core Logic:** Mapeamento da Chave Primária Supabase (valor) para o id (string) do item Framer é essencial para o funcionamento do addItems como mecanismo de upsert.

Seguir estas instruções detalhadas permitirá ao agente de IA construir um plugin Framer funcional e robusto para a sincronização manual de dados entre o Supabase e o CMS do Framer, abordando os requisitos revistos do utilizador.

#### **Referências citadas**

1. Real-Time Sync feature for plugins? \- Framer Community, acessado em abril 17, 2025, [https://www.framer.community/c/requests/cms-sync-tools-real-time-sync-feature](https://www.framer.community/c/requests/cms-sync-tools-real-time-sync-feature)  
2. Data \- Framer Developers, acessado em abril 17, 2025, [https://www.framer.com/developers/storing-data](https://www.framer.com/developers/storing-data)  
3. How to use api key to make a table In framer \- Reddit, acessado em abril 17, 2025, [https://www.reddit.com/r/framer/comments/1allpjf/how\_to\_use\_api\_key\_to\_make\_a\_table\_in\_framer/](https://www.reddit.com/r/framer/comments/1allpjf/how_to_use_api_key_to_make_a_table_in_framer/)  
4. Hiding API Key : r/framer \- Reddit, acessado em abril 17, 2025, [https://www.reddit.com/r/framer/comments/1d3eh0l/hiding\_api\_key/](https://www.reddit.com/r/framer/comments/1d3eh0l/hiding_api_key/)  
5. Requests to 3rd party solutions from custom components without exposing API keys in the client? \- Framer Community, acessado em abril 17, 2025, [https://www.framer.community/c/developers/requests-to-3rd-party-solutions-from-custom-components-without-exposing-api-keys-in-the-client](https://www.framer.community/c/developers/requests-to-3rd-party-solutions-from-custom-components-without-exposing-api-keys-in-the-client)  
6. SupaSync — Framer Marketplace, acessado em abril 17, 2025, [https://www.framer.com/marketplace/plugins/supasync/](https://www.framer.com/marketplace/plugins/supasync/)  
7. Framer \+ Supabase to track user events?, acessado em abril 17, 2025, [https://www.framer.community/c/developers/framer-superbase-to-track-user-events](https://www.framer.community/c/developers/framer-superbase-to-track-user-events)  
8. fetching data from users table using supabase but its not logging the data for the specific user \- Stack Overflow, acessado em abril 17, 2025, [https://stackoverflow.com/questions/75049525/fetching-data-from-users-table-using-supabase-but-its-not-logging-the-data-for-t](https://stackoverflow.com/questions/75049525/fetching-data-from-users-table-using-supabase-but-its-not-logging-the-data-for-t)  
9. JavaScript: Fetch data | Supabase Docs, acessado em abril 17, 2025, [https://supabase.com/docs/reference/javascript/select](https://supabase.com/docs/reference/javascript/select)  
10. Infinite scroll with Next.js, Framer Motion, and Supabase, acessado em abril 17, 2025, [https://supabase.com/blog/infinite-scroll-with-nextjs-framer-motion](https://supabase.com/blog/infinite-scroll-with-nextjs-framer-motion)  
11. CMS \- Framer Developers, acessado em abril 17, 2025, [https://www.framer.com/developers/cms](https://www.framer.com/developers/cms)  
12. AnySync — Framer Marketplace, acessado em abril 17, 2025, [https://www.framer.com/marketplace/plugins/anysync/](https://www.framer.com/marketplace/plugins/anysync/)  
13. CMS Data Sync — Framer Marketplace, acessado em abril 17, 2025, [https://www.framer.com/marketplace/plugins/cms-data-sync/](https://www.framer.com/marketplace/plugins/cms-data-sync/)  
14. FramerSync — Framer Marketplace, acessado em abril 17, 2025, [https://www.framer.com/marketplace/plugins/framersync/](https://www.framer.com/marketplace/plugins/framersync/)  
15. Sync CMS | Framer Commerce Docs, acessado em abril 17, 2025, [https://framercommerce.com/resources/docs/plugin/cms](https://framercommerce.com/resources/docs/plugin/cms)  
16. FramerSync, acessado em abril 17, 2025, [https://framersync.framer.website/](https://framersync.framer.website/)  
17. Framer Tutorial: Automate your website with Zapier \- YouTube, acessado em abril 17, 2025, [https://www.youtube.com/watch?v=Bo2JzZm7Xb0](https://www.youtube.com/watch?v=Bo2JzZm7Xb0)  
18. Supabase Tutorial \#3 \- Fetching Data \- YouTube, acessado em abril 17, 2025, [https://www.youtube.com/watch?v=VjohMDwjty4](https://www.youtube.com/watch?v=VjohMDwjty4)