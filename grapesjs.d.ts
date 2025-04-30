declare module 'grapesjs' {
    // Definir la interfaz para el modelo de un componente
    export interface ComponentModel {
      get(key: string): any;
      on(event: string, callback: (...args: any[]) => void): void;
      components(content: string): void;
      addStyle(styles: Record<string, string>): void;
      find(selector: string): ComponentModel[];
    }
  
    // Definir la interfaz para el editor
    export interface Editor {
      Blocks: any;
      Canvas: any;
      on(arg0: string, arg1: (model: any) => void): unknown;
      DomComponents: {
        addType(type: string, definition: {
          model: {
            defaults: any;
            init?(): void;
            [key: string]: any;
          };
        }): void;
      };
      BlockManager: {
        getAll(): unknown;
        add(id: string, block: any): void;
        get(id: string): any;
      };
      Panels: {
        getPanel(id: string): any;
        addPanel(config: any): any;
      };
      getHtml(): string;
      setComponents(content: string): void;
    }
  
    // Definir el objeto grapesjs con el método init
    interface GrapesJS {
      init(config: any): Editor;
    }
  
    // Declarar el módulo como un objeto con el método init
    const grapesjs: GrapesJS;
    export = grapesjs; // Usar export = para compatibilidad con import * as
  }
  
  declare module 'grapesjs-preset-webpage';
  declare module 'grapesjs-blocks-table';
  declare module 'grapesjs-lory-slider';
  declare module 'grapesjs-tabs';