import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import grapesjs from 'grapesjs';
import presetWebpage from 'grapesjs-preset-webpage';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsBlocksTable from 'grapesjs-blocks-table';
import grapesjsTabs from 'grapesjs-tabs';
import grapesjsNavbar from 'grapesjs-navbar';
import grapesjsTooltip from 'grapesjs-tooltip';
import grapesjsTyped from 'grapesjs-typed';
import grapesjsCustomCode from 'grapesjs-custom-code';
import grapesjsComponentCountdown from 'grapesjs-component-countdown';
import grapesjsStyleBg from 'grapesjs-style-bg';
import { EditorService } from './editor.service';
import { GeminiService } from 'src/app/gemini.service';
import { Subscription } from 'rxjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-editor',
  template: `
    <div id="gjs"></div>
<div id="pagination-panel" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 1000; background: linear-gradient(135deg, #ffffff, #f0f0f0); padding: 8px 15px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"></div>
<div class="controls" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; align-items: center; gap: 15px; background: linear-gradient(135deg, #2c3e50, #3498db); padding: 15px 25px; border-radius: 12px; box isn-shadow: 0 6px 15px rgba(0,0,0,0.2); border: none; transition: all 0.3s ease;">
  <button (click)="askGemini()" style="background: #e74c3c; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    Crear Proyecto Angular CRUD
  </button>
  <input type="file" accept="image/*" (change)="onImageSelected($event)" style="background: #ecf0f1; padding: 8px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer; transition: border-color 0.3s ease;" />
  <button (click)="askGemini2()" [disabled]="!selectedImageFile" style="background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.1); opacity: 1;">
    Crear Proyecto Angular CRUD desde Imagen
  </button>
</div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100%; position: relative; }
    #gjs { height: 100%; width: 100%; }
    #pagination-panel button {
      margin: 0 5px;
      padding: 5px 10px;
      border: none;
      background: #007bff;
      color: white;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.3s;
    }
    #pagination-panel button:disabled { background: #ccc; cursor: not-allowed; }
    #pagination-panel button:hover:not(:disabled) { background: #0056b3; }
    #pagination-panel span { margin: 0 10px; font-weight: bold; }
  
    .controls button:hover {
    background: #c0392b; /* Color más oscuro para el primer botón al pasar el cursor */
  }

  .controls button:nth-child(3):hover {
    background: #219653; /* Color más oscuro para el segundo botón al pasar el cursor */
  }

  .controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .controls input:hover {
    border-color: #3498db; /* Borde azul al pasar el cursor por el input */
  }

  .controls input:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
  }

  .controls:hover {
    transform: translateX(-50%) translateY(-2px); /* Eleva el panel al pasar el cursor */
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  }
    `]
})
export class EditorComponent implements OnInit {
  private editor: any;
  private sessionId = '';
  private sessionCreated = false;
  private pages: string[] = ['<p>Page 1</p>'];
  private currentPage = 0;
  private lastSent = '';
  private typingTimer: any;
  selectedImage: string | null = null; // Nueva propiedad
  selectedImageFile: File | null = null;   // <- nuevo: el archivo real seleccionado
previewUrl: string | null = null;        // <- nuevo: para mostrar la imagen como vista previa si deseas

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private editorService: EditorService,
    private geminiService: GeminiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['id'] || localStorage.getItem('editor-session-id');
      if (sessionId && !this.sessionCreated) {
        this.sessionCreated = true;
        this.sessionId = sessionId;
        localStorage.setItem('editor-session-id', sessionId);
        if (!params['id']) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: sessionId },
            replaceUrl: true
          });
        }
        this.initEditor(sessionId);
      } else if (!sessionId && !this.sessionCreated) {
        this.sessionCreated = true;
        this.editorService.createSession((newId: string) => {
          this.sessionId = newId;
          localStorage.setItem('editor-session-id', newId);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: newId },
            replaceUrl: true
          }).then(() => this.initEditor(newId));
        });
      }
    });
  }

  private initEditor(sessionId: string): void {
    const editor = grapesjs.init({
      container: '#gjs',
      height: '100%',
      width: 'auto',
      storageManager: false,
      fromElement: false,
      plugins: [
        presetWebpage,
        grapesjsPluginForms,
        grapesjsBlocksTable,
        grapesjsTabs,
        grapesjsNavbar,
        grapesjsTooltip,
        grapesjsTyped,
        grapesjsCustomCode,
        grapesjsComponentCountdown,
        grapesjsStyleBg
      ],
      pluginsOpts: {
        grapesjsBlocksTable: { tblResizable: true, cellsResizable: true }
      }
    });
  
// Bloque de 1 columna
editor.Blocks.add('section-1-col', {
  label: `
    <div style="padding: 5px; text-align: center;">
      <i class="fa fa-square"></i><br/>1 columna
    </div>
  `,
  category: 'Secciones',
  content: `
    <section style="display: flex; justify-content: center; padding: 20px;">
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
    </section>
  `
});

// Bloque de 2 columnas
editor.Blocks.add('section-2-col', {
  label: `
    <div style="padding: 5px; text-align: center;">
      <i class="fa fa-columns"></i><br/>2 columnas
    </div>
  `,
  category: 'Secciones',
  content: `
    <section style="display: flex; gap: 10px; padding: 20px;">
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
    </section>
  `
});

// Bloque de 3 columnas
editor.Blocks.add('section-3-col', {
  label: `
    <div style="padding: 5px; text-align: center;">
      <i class="fa fa-th-large"></i><br/>3 columnas
    </div>
  `,
  category: 'Secciones',
  content: `
    <section style="display: flex; gap: 10px; padding: 20px;">
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
      <div style="flex: 1; min-height: 100px; border: 1px dashed #999;" data-gjs-droppable="true"></div>
    </section>
  `
});

    

    this.editor = editor;
    (window as any).editor = editor;
  
    editor.on('load', () => this.injectStyles());
  
    this.editorService.joinSession(sessionId);
  
    this.editorService.onInitialize((data: any) => {
      if (data?.pages) {
        this.pages = data.pages.map((page: string) => {
          try {
            const projectData = JSON.parse(page);
            return JSON.stringify({
              html: projectData.html || '<p>Page</p>',
              css: projectData.css || ''
            });
          } catch {
            return JSON.stringify({ html: page || '<p>Page</p>', css: '' });
          }
        });
        this.currentPage = data.currentPage || 0;
        const pageData = JSON.parse(this.pages[this.currentPage]);
        this.editor.setComponents(pageData.html);
        this.editor.setStyle(pageData.css);
        setTimeout(() => this.injectStyles(), 50);
        this.updatePagination();
      }
    });
  
    this.editorService.onRemoteUpdate((data: any) => {
      if (!this.detectActiveInput()) {
        this.pages = data.pages.map((page: string) => {
          try {
            const projectData = JSON.parse(page);
            return JSON.stringify({
              html: projectData.html || '<p>Page</p>',
              css: projectData.css || ''
            });
          } catch {
            return JSON.stringify({ html: page || '<p>Page</p>', css: '' });
          }
        });
        const pageData = JSON.parse(this.pages[this.currentPage]);
        const currentHtml = this.editor.getHtml();
        if (currentHtml !== pageData.html) {
          this.editor.setComponents(pageData.html);
          this.editor.setStyle(pageData.css);
          setTimeout(() => this.injectStyles(), 50);
        }
        this.updatePagination();
      }
    });
  
    editor.on('component:update', () => {
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => this.emitChange(), 1000);
    });
  
    editor.on('component:drag:end', () => this.emitChange());
  
    this.updatePagination();
  }

  private injectStyles() {
    const iframe = this.editor.Canvas.getFrameEl();
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
  
    const existing = doc.getElementById('custom-table-style');
    if (existing) existing.remove();
  
    const style = doc.createElement('style');
    style.id = 'custom-table-style';
    style.innerHTML = `
      table { border: 2px solid black !important; border-collapse: collapse !important; }
      td, th {
        border: 1px solid black !important;
        padding: 8px !important;
        min-width: 60px !important;
        min-height: 30px !important;
        box-sizing: border-box !important;
      }
      ${this.editor.getCss() || ''} /* Incluir estilos del editor */
    `;
    doc.head.appendChild(style);
  }
  private detectActiveInput(): boolean {
    const active = document.activeElement as HTMLElement | null;
    return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  private emitChange(): void {
    const html = this.editor.getHtml() || '<p>No content</p>';
    const css = this.editor.getCss() || '/* No CSS */';
    this.pages[this.currentPage] = JSON.stringify({ html, css }); // Guardar HTML y CSS como objeto
    const data = { pages: this.pages, currentPage: this.currentPage };
    const dataString = JSON.stringify(data);
    if (dataString !== this.lastSent) {
      this.editorService.sendUpdate(data);
      this.lastSent = dataString;
    }
  }

  private updatePagination(): void {
    const panel = document.getElementById('pagination-panel');
    if (!panel) return;
  
    panel.innerHTML = `
      <button id="prev-page"><i class="fa fa-chevron-left"></i></button>
      <span>Página ${this.currentPage + 1} de ${this.pages.length}</span>
      <button id="next-page"><i class="fa fa-chevron-right"></i></button>
      <button id="add-page"><i class="fa fa-plus"></i></button>
    `;
  
    (document.getElementById('prev-page') as HTMLButtonElement).onclick = () => {
      this.pages[this.currentPage] = JSON.stringify({
        html: this.editor.getHtml(),
        css: this.editor.getCss()
      });
      if (this.currentPage > 0) {
        this.currentPage--;
        const pageData = JSON.parse(this.pages[this.currentPage]);
        this.editor.setComponents(pageData.html);
        this.editor.setStyle(pageData.css);
        setTimeout(() => this.injectStyles(), 50);
        this.updatePagination();
        this.emitChange();
      }
    };
  
    (document.getElementById('next-page') as HTMLButtonElement).onclick = () => {
      this.pages[this.currentPage] = JSON.stringify({
        html: this.editor.getHtml(),
        css: this.editor.getCss()
      });
      if (this.currentPage < this.pages.length - 1) {
        this.currentPage++;
        const pageData = JSON.parse(this.pages[this.currentPage]);
        this.editor.setComponents(pageData.html);
        this.editor.setStyle(pageData.css);
        this.updatePagination();
        this.emitChange();
      }
    };
  
    (document.getElementById('add-page') as HTMLButtonElement).onclick = () => {
      this.pages[this.currentPage] = JSON.stringify({
        html: this.editor.getHtml(),
        css: this.editor.getCss()
      });
      this.pages.push(JSON.stringify({ html: '<p>Nueva Página</p>', css: '' }));
      this.currentPage = this.pages.length - 1;
      const pageData = JSON.parse(this.pages[this.currentPage]);
      this.editor.setComponents(pageData.html);
      this.editor.setStyle(pageData.css);
      setTimeout(() => this.injectStyles(), 50);
      this.updatePagination();
      this.emitChange();
    };
  }

  // private collectPagesHtml(): string {
  //   if (!this.editor) {
  //     console.error('Editor no inicializado en collectPagesHtml');
  //     return '';
  //   }

  //   this.pages[this.currentPage] = this.editor.getHtml() || '<p>No content</p>';

  //   if (!this.pages || this.pages.length === 0) {
  //     console.warn('No hay páginas para recolectar');
  //     return 'No pages available';
  //   }

  //   const allPagesHtml = this.pages
  //     .map((pageHtml, index) => {
  //       if (!pageHtml) {
  //         console.warn(`Página ${index + 1} está vacía`);
  //         return `Página ${index + 1}:\n<p>No content</p>`;
  //       }
  //       return `Página ${index + 1}:\n${pageHtml}`;
  //     })
  //     .join('\n\n');

  //   console.log('HTML recolectado:', allPagesHtml);
  //   return allPagesHtml;
  // }

  private collectPagesHtml(): string {
    if (!this.editor) {
      console.error('Editor no inicializado en collectPagesHtml');
      return '';
    }
  
    this.pages[this.currentPage] = JSON.stringify({
      html: this.editor.getHtml() || '<p>No content</p>',
      css: this.editor.getCss() || '/* No CSS */'
    });
    const pageData = JSON.parse(this.pages[this.currentPage]);
  
    if (!pageData.html) {
      console.warn(`Página ${this.currentPage + 1} está vacía`);
      return `<p>No content</p>`;
    }
  
    const pageContent = `
  Página ${this.currentPage + 1} HTML:
  ${pageData.html}
  
  Página ${this.currentPage + 1} CSS:
  ${pageData.css}
    `;
    console.log('Contenido recolectado para la página actual:', pageContent);
    return pageContent;
  }
  private async loadBaseProject(): Promise<JSZip> {
    const url = '/assets/editor.zip';
    try {
      const response = await this.http.get(url, { responseType: 'blob' }).toPromise();
      if (!response) {
        throw new Error('No se recibió respuesta del servidor para el archivo editor.zip');
      }
      console.log('Archivo editor.zip cargado correctamente, tamaño:', response.size, 'bytes');
      const zip = await JSZip.loadAsync(response);
      console.log('ZIP descomprimido correctamente:', zip);
      return zip;
    } catch (error) {
      console.error('Error al cargar el archivo editor.zip:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to load the ZIP file: ${error.message}`);
      } else {
        throw new Error('Failed to load the ZIP file: Unknown error');
      }
    }
  }

  


  private parseGeminiResponse(response: any): { [path: string]: string } {
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const files: { [path: string]: string } = {};
  
    // Regex para capturar bloques de código
    const fileRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
  
    let match;
    while ((match = fileRegex.exec(text)) !== null) {
      const block = match[1].trim();
  
      // Dividir en líneas
      const lines = block.split('\n');
      let pathLine = lines[0].trim();
      let content = lines.slice(1).join('\n').trim();
  
      // Limpiar path de comentarios y barras múltiples
      pathLine = pathLine
        .replace(/^\/+\s*/, '')            // Quita cualquier número de barras iniciales y espacios
        .replace(/^\/\/+\s*/, '')          // Quita comentarios //
        .replace(/^<!--\s*/, '')           // Quita <!--
        .replace(/\s*-->$/, '')            // Quita -->
        .replace(/^\/\*\s*/, '')           // Quita /*
        .replace(/\s*\*\/$/, '')           // Quita */
        .trim();
  
      // Normalizar la ruta
      let normalizedPath = pathLine
        .replace(/\s+/g, '')               // Elimina espacios en blanco
        .replace(/[^a-zA-Z0-9\/.-]/g, '') // Mantiene solo letras, números, /, ., y -
        .replace(/\/+/g, '/')             // Colapsa múltiples barras en una sola
        .replace(/^\/+/, '')              // Elimina cualquier barra inicial
        .replace(/(^src\/)+/, 'src/');    // Reemplaza múltiples src/ al inicio por un solo src/
  
      // Asegurar que el path comience con src/
      if (!normalizedPath.startsWith('src/')) {
        normalizedPath = `src/${normalizedPath.replace(/^\/+/, '')}`; // Evita barras iniciales
      }
  
      // Validar extensión
      if (!normalizedPath.match(/\.(ts|html|css)$/)) {
        console.warn(`Archivo ignorado por no tener extensión válida: ${normalizedPath}`);
        continue;
      }
  
      files[normalizedPath] = content;
      console.log(`Archivo parseado: ${normalizedPath}\nContenido:\n${content}\n`);
    }
  
    console.log('Archivos parseados:', Object.keys(files));
    return files;
  }
  
  
  private async createFinalZip(baseProject: JSZip, files: { [path: string]: string }) {
    let editorFolder = baseProject.folder('editor');
    if (!editorFolder) {
      editorFolder = baseProject.folder('editor') || baseProject;
      console.log('Carpeta editor/ creada en el ZIP');
    }
  
    Object.keys(files).forEach((path) => {
      const cleanPath = path;
      const pathParts = cleanPath.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');
  
      let currentFolder = editorFolder;
      if (folderPath) {
        const folders = folderPath.split('/');
        for (const folderName of folders) {
          if (folderName) {
            currentFolder = currentFolder.folder(folderName) || currentFolder;
          }
        }
      }
  
      if (fileName && currentFolder) {
        currentFolder.file(fileName, files[path]);
        console.log(`Archivo agregado al ZIP: editor/${folderPath}/${fileName}`);
      } else {
        console.error(`Error al agregar archivo: ${fileName} (ruta: ${cleanPath})`);
      }
    });
  
    try {
      const blob = await baseProject.generateAsync({ type: 'blob' });
      saveAs(blob, 'editor-proyecto-angular.zip');
      console.log('ZIP generado: editor-proyecto-angular.zip');
    } catch (error) {
      console.error('Error al generar el ZIP:', error);
    }
  }

  async askGemini() {
    const pagesHtml = this.collectPagesHtml();
    const prompt = `
---
Genera el código completo para una aplicación CRUDs en Angular 17 utilizando la estructura Standalone Components, services, interfaces, LocalStorage, stilos ,ReactiveForms, navbar y ruteo responsivo y funcional, incluyendo estilos css que hagan la vista del contenido con elementos bien separados , colores vivos, botones redondeados y espacios entre elementos.
Cada archivo debe tener:
siempre empieza para delimintar el contenido del archivo + la ruta path recuerda asi como este ejemplo (\`\`\`css
// src/app/components/facultad/facultad-crear/facultad-crear.component.css

.container {
  margin: 20px;
}

.form-label {
  font-weight: bold;
}

.text-danger {
  font-size: 0.8em;
}
\`\`\`)y delante de la ruta ponle como conces las extensiones para comentar en ese tipo de archivo  
Usa path clara y correcta, ADEMAS A LOS ARCHIVOS NO LES PONGAS NOMBRES CON GUIONES O SIMOBLOS , QUE SEA PURO TEXTO ,incluyendo todos los archivos necesarios para modificar en un crud, como el service, interface, component, route, ladingpage (dentro el sidebar con botones funcionales con el name del componente y su ruta debe dirigir al crud) - Código Angular moderno (17+)
No repitas carpetas src/src ni src/app ya que esas existen
Usa un orden correcto para las rutas services, components, interfaces  y demas archivos y para los import revisa muy bien antes de que colcarlos la ruta ya uqe todo esta dentro de src como un proyeceto en agnular nuevo(estas son rutas del service y del interface para los componentes de ejemplo

import { nombredelcrudService } from '../../../services/nombredelcrud.service';
import { nombredelcrud } from '../../../nombredelcrud/facultad';
Formato de archivos limpio todos separados no los juntes: .ts, .html, .css
muy importante : siempre y para todos los CRUDs crea 4 carpetas  del crud edit,lista,crear y vista ,cada  carpeta si o si con 3 archivos que son el .ts .html y .css no lo olvides revisa que siempre esten esos archivos , sus rutas de crear, edit, ver todo eso en el archivo app.routes.ts  ,ponlos dentro de la carpeta src/app/components/(name del crud)/(archivos del crud) , src/app/services/(name services), src/app/interfaces/(name interfaces),

incluye EN LOS estilos css con colores vivos, botones con estilos y las tablas igual , fomrularioos, inputs pero sobre todo a los cruds recuerda ponerles un estilos css buenos para sus inputs de datos y separados y ordenados, para todos los archivos y GENERA BIEN LAS RUTAS Y EDITA TODOS LOS ARCHIVOS app.component.ts, app.component.css, app.component.html  y no olvides app.routes.ts *el mas importante* y demas si requieren para el funcionamiento, TODO FUNCIONAL, YA SABES TABLAS , COLORES , BOTONES PARA LOS ESTILOS CSS ,html para todas las vistas de los cruds y el sidebar y EL app , deben estar dentro de cada crud edit,lista,crear,view
, ademas haz que los cruds(contenido de tablas , botones) esten al lado del sidebar no debajo que exista esa separacion con los estilos css y html

los id de tablas  haz que sean incrementales no posgas "disable" , ejemplo de como deberia estar (      <input type="number" class="form-control" id="id" formControlName="id" >
)
No expliques nada, solo el código.
Asegurate de reeemplazar los archivos necesarios para que carguen correctamente   todo funcionando las rutas y el crud localsotorage, modificando los archivos app que estan dentro de src/app/archivosapp sobre todo crea estilos css agradables ,ademas de todas las rutas funcionales en los botnes para los cruds y menus
por ultimo y lo mas importante genera primero los app modificados con todo y despues los cruds
Aquí está el contenido en html de referencia generado y el css que quiero que mantengas para la vista visualmente donde tienes que identificar el crud o compenentes , no me generes codigo de componentes inventados si no existe , si no encuentras nada revisa nuevamente ya que esta todo en el codigo html siguiente:

por ultimo el texto que este dentro de alguna tabla no es crud .
  -recuerda solo genera un CRUD el primero que encuentres si encuetras mas dejalos ahi solo hazle su boton nomas y parte del menu


${pagesHtml}
---
`;
    console.log('Prompt enviado a Gemini:', prompt);
    this.geminiService.sendMessage(prompt).subscribe(
      (response) => {
        this.loadBaseProject().then(baseProject => {
          console.log('Texto generado por Gemini:', response?.candidates?.[0]?.content?.parts?.[0]?.text);
          const filesFromGemini = this.parseGeminiResponse(response);
          this.createFinalZip(baseProject, filesFromGemini);
        }).catch(error => {
          console.error('Error al cargar proyecto base:', error);
        });
      },
      error => {
        console.error('Error consultando Gemini:', error);
      }
    );
  }


  // ... (resto de las propiedades y constructor sin cambios)

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        console.error('Formato de imagen no soportado. Usa PNG o JPEG.');
        window.alert('Por favor, sube una imagen en formato PNG o JPEG.');
        return;
      }

      if (file.size > 1_000_000) {
        console.error('La imagen es demasiado grande. Usa una imagen menor a 1MB.');
        window.alert('La imagen es demasiado grande. Usa una imagen menor a 1MB.');
        return;
      }

      this.selectedImageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        console.log('Imagen cargada en base64:', this.previewUrl.substring(0, 100) + '...');
      };
      reader.onerror = () => {
        console.error('Error al leer la imagen');
        this.selectedImageFile = null;
        this.previewUrl = null;
        window.alert('Error al leer la imagen.');
      };
      reader.readAsDataURL(file);
    }
  }

  async askGemini2() {
    if (!this.selectedImageFile) {
      console.error('No se ha seleccionado ninguna imagen');
      window.alert('Por favor, selecciona una imagen.');
      return;
    }
  
    const base64Image = await this.convertFileToBase64(this.selectedImageFile);
    const mimeType = this.selectedImageFile.type;
  
    try {
      // PRIMER PROMPT: extraer solo HTML y CSS fieles a la imagen
      const prompt1 = `
  Devuélveme únicamente el HTML y el CSS que reproduce visualmente esta imagen. Respeta fielmente:
  - Posiciones, colores, tamaños, márgenes, texto, tipografías, botones, inputs, tablas, etc.
  - El CSS debe ir dentro de <style> sin modificar nada de la imagen original.
  - No expliques nada, no agregues lógica ni componentes, solo estructura visual.
  
  Delimita los bloques así:
  
  \`\`\`html
  <!-- Aquí va el HTML -->
  \`\`\`
  
  \`\`\`css
  /* Aquí va el CSS */
  \`\`\`
      `;
  
      const response1 = await this.geminiService.sendMessageWithImage(prompt1, base64Image, mimeType).toPromise();
      const rawText = response1?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
      const htmlMatch = rawText.match(/```html([\s\S]*?)```/i);
      const cssMatch = rawText.match(/```css([\s\S]*?)```/i);
  
      const htmlContent = htmlMatch ? htmlMatch[1].trim() : '<!-- HTML no encontrado -->';
      const cssContent = cssMatch ? cssMatch[1].trim() : '/* CSS no encontrado */';
  
      // Descarga automática de los dos archivos generados
      saveAs(new Blob([htmlContent], { type: 'text/html' }), 'interfaz-generada.html');
      saveAs(new Blob([cssContent], { type: 'text/css' }), 'interfaz-estilos.css');
  
      // SEGUNDO PROMPT: generar CRUD basado en los estilos anteriores
      const prompt2 = `
  ---
  Genera una aplicación CRUD en Angular 17 que replique exactamente la interfaz mostrada en el codigo html y css proporcionada RESPETANDO TODOS SUS ESTILOS, FORMAS , POSICIONES sobre todo interpretalas bien, COLORES, TAMANOS, COMPONENTES y tu añadele estilos css a todo los cruds respetanto colores si tiene, ademas recuerda lo mas importante que funciones las rutas deben ser totalmente funcionales los 
  botones crear,editar,elimir, guardar y ver. La aplicación debe:
  -recuerda solo genera un CRUD el primero que encuentres si encuetras mas dejalos ahi solo hazle su boton nomas osea parte del menu
  - si muestra la img un formulario para crear entonces al darle guardar me deberia enviar route lista igual que un crud completo con todo
  - siempre empieza para delimintar el contenido de todos los archivos .ts ,.html , .css+ la ruta path recuerda asi como este ejemplo:
  \`\`\`css
  // src/app/components/facultad/facultad-crear/facultad-crear.component.css
  
  .container {
    margin: 20px;
  }
  
  .form-label {
    font-weight: bold;
  }
  
  .text-danger {
    font-size: 0.8em;
  }
  \`\`\`
  
  - Usar Standalone Components, servicios, interfaces, LocalStorage, ReactiveForms, navbar y rutas.
  - RECUERDA: debe haber 4 carpetas por CRUD (crear, editar, lista, vista) cada una con .ts, .html, .css.
  - Asegura que el contenido esté al lado del navbar y usa IDs incrementales. No uses campos "disabled".
  - No expliques, solo genera el código con rutas funcionales, estilos agradables y ordenado.
  
  Este es el HTML y CSS generados previamente que debes tomar como base tal cual para los estilos y estructura de texto y posicion del html y los botones claro modificarlos para que sea funcional el crud:
  
  html: ${htmlContent}
  
css:  ${cssContent}
  
  ---
      `;
  
      this.geminiService.sendMessage(prompt2).subscribe(
        (response2) => {
          this.loadBaseProject().then(baseProject => {
            const filesFromGemini = this.parseGeminiResponse(response2);
            this.createFinalZip(baseProject, filesFromGemini);
          }).catch(err => {
            console.error('Error al cargar proyecto base:', err);
            window.alert('Error al cargar el proyecto base.');
          });
        },
        error => {
          console.error('Error consultando Gemini:', error);
          window.alert('Error en la consulta del CRUD.');
        }
      );
  
    } catch (err) {
      console.error('Error procesando imagen:', err);
      window.alert('Hubo un error procesando la imagen.');
    }
  }
  

  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result || !result.includes(';base64,')) {
          reject(new Error('No se pudo convertir la imagen a base64'));
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

 
    

}