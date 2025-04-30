import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  private socket: Socket;
  private sessionId: string | null = null;

  constructor() {
    this.socket = io('https://socketfranshesco-production.up.railway.app');
  }

  // Crear una nueva sesión
  createSession(callback: (sessionId: string) => void): void {
    this.socket.emit('create-editor-session', (id: string) => {
      this.sessionId = id;
      callback(id);
    });
  }

  // Unirse a una sesión existente
  joinSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.socket.emit('join-editor-session', sessionId);
  }

  // Recibir datos iniciales al unirse
  onInitialize(callback: (project: any) => void): void {
    this.socket.on('initialize-editor', (project: any) => {
      callback(project);
    });
  }

  // Escuchar cambios de otros usuarios
  onRemoteUpdate(callback: (project: any) => void): void {
    this.socket.on('remote-editor-update', (project: any) => {
      callback(project);
    });
  }

  // Enviar actualizaciones del proyecto a otros
  sendUpdate(project: any): void {
    if (!this.sessionId) return;

    this.socket.emit('update-editor', {
      sessionId: this.sessionId,
      project,
    });
  }
}
