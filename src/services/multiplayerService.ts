import { io, Socket } from 'socket.io-client';
import { MultiplayerMode, MultiplayerPlayer } from '../types';
import { getSocketUrl } from '../lib/api';

class MultiplayerService {
  private socket: Socket | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};

  connect() {
    if (this.socket?.connected) return;
    
    const url = getSocketUrl();
    console.log('Connecting to multiplayer at:', url);

    this.socket = io(url, {
      timeout: 10000,
      reconnectionAttempts: 5
    });

    this.socket.onAny((event, ...args) => {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(args[0]));
      }
    });

    this.socket.on('connect', () => console.log('Multiplayer connected'));
    this.socket.on('disconnect', () => console.log('Multiplayer disconnected'));

    this.socket.on('ritual_pong', (timestamp: number) => {
      const ping = Date.now() - timestamp;
      if (this.listeners['ping_update']) {
        this.listeners['ping_update'].forEach(cb => cb(ping));
      }
    });
  }

  ping() {
    this.socket?.emit('ritual_ping', Date.now());
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

  createRitual(mode: MultiplayerMode) {
    this.socket?.emit('create_ritual', { mode });
  }

  joinRitual(roomCode: string) {
    this.socket?.emit('join_ritual', { roomCode });
  }

  startRitual(roomId: string) {
    this.socket?.emit('start_ritual', { roomId });
  }

  leaveRitual(roomId: string) {
    this.socket?.emit('leave_ritual', { roomId });
  }

  spawnAsta(roomId: string) {
    this.socket?.emit('spawn_asta', { roomId });
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

  getSocket() {
    return this.socket;
  }

  get id() {
    return this.socket?.id;
  }
}

export const multiplayerService = new MultiplayerService();
