import { io, Socket } from 'socket.io-client';
import { MultiplayerMode, MultiplayerPlayer } from '../types';
import { getSocketUrl } from '../lib/api';

class MultiplayerService {
  private socket: Socket | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};
  private registrationData: { userId: string, name: string, email?: string } | null = null;

  connect() {
    if (this.socket?.connected) return;
    
    const url = getSocketUrl();
    console.log('Connecting to multiplayer at:', url);

    this.socket = io(url, {
      timeout: 20000,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      secure: url.startsWith('https') || (typeof window !== 'undefined' && window.location.protocol === 'https:'),
      rejectUnauthorized: false // Useful for self-signed certs in some dev/preview environments
    });

    this.socket.onAny((event, ...args) => {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(args[0]));
      }
    });

    this.socket.on('connect', () => {
      console.log('Multiplayer connected:', this.socket?.id);
      if (this.registrationData) {
        console.log('Re-registering user:', this.registrationData.userId);
        this.socket?.emit('register_user', this.registrationData);
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Multiplayer disconnected:', reason);
    });

    this.socket.on('ritual_pong', (timestamp: number) => {
      const ping = Date.now() - timestamp;
      if (this.listeners['ping_update']) {
        this.listeners['ping_update'].forEach(cb => cb(ping));
      }
    });
  }

  registerUser(userId: string, name: string, email?: string) {
    this.registrationData = { userId, name, email };
    if (this.socket?.connected) {
      this.socket.emit('register_user', this.registrationData);
    }
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
