import { io, Socket } from 'socket.io-client';
import { MultiplayerMode, MultiplayerPlayer } from '../types';

class MultiplayerService {
  private socket: Socket | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};

  connect() {
    if (this.socket?.connected) return;
    
    // In Capacitor, we might need an explicit URL. 
    // For web development, we can use the same host.
    const url = window.location.origin.includes('localhost') 
      ? 'http://localhost:3000' 
      : window.location.origin;

    this.socket = io(url);

    this.socket.onAny((event, ...args) => {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(args[0]));
      }
    });

    this.socket.on('connect', () => console.log('Multiplayer connected'));
    this.socket.on('disconnect', () => console.log('Multiplayer disconnected'));
  }

  joinQueue(type: MultiplayerMode, userId: string, name: string) {
    this.socket?.emit('join_queue', { type, userId, name });
  }

  leaveQueue(type: MultiplayerMode) {
    this.socket?.emit('leave_queue', { type });
  }

  submitGuess(roomId: string, shapeId: string, isCorrect: boolean) {
    this.socket?.emit('submit_guess', { roomId, shapeId, isCorrect });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get id() {
    return this.socket?.id;
  }
}

export const multiplayerService = new MultiplayerService();
