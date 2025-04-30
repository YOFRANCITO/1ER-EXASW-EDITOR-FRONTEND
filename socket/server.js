const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

// Sesiones en memoria
let sessions = {}; // Para diagramador
let editorSessions = {}; // Para GrapesJS

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // ------- Diagramador (JointJS) -------
  socket.on('create-session', (callback) => {
    const sessionId = uuidv4();
    sessions[sessionId] = { cells: [] };
    callback(sessionId);
  });

  socket.on('join-session', (sessionId) => {
    if (!sessions[sessionId]) {
      sessions[sessionId] = { cells: [] };
    }
    socket.join(sessionId);
    socket.emit('initialize', { cells: sessions[sessionId].cells });
  });

  socket.on('updateGraph', (data) => {
    const { sessionId, cells } = data;
    if (!sessions[sessionId]) return;
    sessions[sessionId].cells = cells;
    socket.to(sessionId).emit('updateGraph', data);
  });

  // ------- Editor (GrapesJS) -------
  socket.on('create-editor-session', (callback) => {
    const sessionId = uuidv4();
    editorSessions[sessionId] = { project: null };
    callback(sessionId);
  });

  socket.on('join-editor-session', (sessionId) => {
    if (!editorSessions[sessionId]) {
      editorSessions[sessionId] = { project: null };
    }
    socket.join(sessionId);
    socket.emit('initialize-editor', editorSessions[sessionId].project);
  });

  socket.on('update-editor', (data) => {
    const { sessionId, project } = data;
    if (!editorSessions[sessionId]) return;
    editorSessions[sessionId].project = project;
    socket.to(sessionId).emit('remote-editor-update', project);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
