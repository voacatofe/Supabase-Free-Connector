import { framer } from 'framer-plugin';

declare module 'framer-plugin' {
  // Estendendo a API do Framer com o método getManagedCollection e outros métodos relevantes
  interface FramerPluginAPI {
    mode: 'canvas' | 'configureManagedCollection' | 'syncManagedCollection';
    getManagedCollection(): Promise<ManagedCollection>;
    getCollection(): Promise<Collection>;
    getCollections(): Promise<Collection[]>;
    closePlugin(): Promise<void>;
  }

  // Tipos básicos usados em várias estruturas
  interface BaseField {
    id: string;
    name: string;
    type: string;
    userEditable?: boolean;
  }

  // Interface para campos editáveis no Framer
  interface EditableManagedCollectionField extends BaseField {}

  // Interface para Collection (não gerenciada)
  interface Collection {
    getFields(): Promise<BaseField[]>;
    getItems(): Promise<any[]>;
  }

  // Interface para ManagedCollection (gerenciada pelo plugin)
  interface ManagedCollection {
    getItemIds(): Promise<string[]>;
    setItemOrder(ids: string[]): Promise<void>;
    getFields(): Promise<EditableManagedCollectionField[]>;
    setFields(fields: EditableManagedCollectionField[]): Promise<void>;
    addItems(items: CollectionItem[]): Promise<void>;
    removeItems(ids: string[]): Promise<void>;
    getPluginData(key: string): Promise<string | null>;
    setPluginData(key: string, value: string): Promise<void>;
  }

  // Interface para um item de coleção
  interface CollectionItem {
    id: string;
    slug: string;
    fieldData: Record<string, any>;
    draft?: boolean;
  }
}

// Tipos de campo suportados pelo Framer
export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'color'
  | 'formattedText'
  | 'image'
  | 'file'
  | 'link'
  | 'enum'
  | 'collectionReference'
  | 'multiCollectionReference';

// Interface para mapeamento de campo para uso no sistema
export interface FieldMapping {
  supabaseField: string;
  framerField: string;
  type: FieldType;
} 