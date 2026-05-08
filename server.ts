import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "leaderboard.json");
const SOCIAL_FILE = path.join(__dirname, "social.json");

let dataCache: any[] = [];
let socialCache: any = { friends: {}, requests: {} };

async function loadInitialData() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    if (!fs.existsSync(SOCIAL_FILE)) fs.writeFileSync(SOCIAL_FILE, JSON.stringify({ friends: {}, requests: {} }));

    const dataContent = fs.readFileSync(DATA_FILE, "utf-8");
    dataCache = JSON.parse(dataContent || "[]");

    const socialContent = fs.readFileSync(SOCIAL_FILE, "utf-8");
    socialCache = JSON.parse(socialContent || "{\"friends\":{},\"requests\":{}}");

    // Ensure Asta exists
    if (!dataCache.some((u: any) => u.userId === 'bot_asta')) {
      dataCache.push({ userId: 'bot_asta', name: 'Asta (Test Bot)', level: 42, updatedAt: new Date().toISOString(), isBot: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataCache, null, 2));
    }
  } catch (err) {
    console.error("Error loading initial data:", err);
  }
}

async function saveMetadata() {
  try {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(dataCache, null, 2));
  } catch (err) {
    console.error("Error saving metadata:", err);
  }
}

async function saveSocial() {
  try {
    await fs.promises.writeFile(SOCIAL_FILE, JSON.stringify(socialCache, null, 2));
  } catch (err) {
    console.error("Error saving social:", err);
  }
}

async function startServer() {
  await loadInitialData();
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  const userSockets = new Map<string, string>(); // userId -> socketId

  // API: Get Leaderboard
  app.get("/api/leaderboard", (req, res) => {
    try {
      // Sort by level descending
      const sorted = [...dataCache].sort((a: any, b: any) => b.level - a.level).slice(0, 50);
      res.json(sorted);
    } catch (error) {
      res.status(500).json({ error: "Failed to read leaderboard" });
    }
  });

  // API: Submit Score
  app.post("/api/leaderboard", async (req, res) => {
    console.log('Leaderboard submission received:', req.body);
    const { userId, name, level, isTest } = req.body;
    
    if (!userId || !name || level === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const index = dataCache.findIndex((p: any) => p.userId === userId);
      const entryName = isTest ? `${name} (Test Player)` : name;

      if (index !== -1) {
        if (level > dataCache[index].level) {
          dataCache[index].level = level;
          dataCache[index].name = entryName;
          dataCache[index].updatedAt = new Date().toISOString();
        }
      } else {
        dataCache.push({
          userId,
          name: entryName,
          level,
          updatedAt: new Date().toISOString()
        });
      }

      await saveMetadata();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update leaderboard" });
    }
  });

  // --- MULTIPLAYER LOGIC ---
  
  interface Player {
    id: string;
    userId: string;
    name: string;
    socketId: string;
    chances: number;
    score: number;
    isReady: boolean;
    team?: 'A' | 'B';
    isBot?: boolean;
  }

  interface GameRoom {
    id: string;
    type: '1v1' | '2v2';
    players: Player[];
    status: 'waiting' | 'starting' | 'playing' | 'round_ended' | 'ended';
    startTime?: number;
    allMatchShapes: string[]; // Full set of shapes for all rounds
    puzzleShapes: string[];   // Current round shapes
    timer?: NodeJS.Timeout;
    timeLeft: number;
    currentRound: number;
    teamAWins: number;
    teamBWins: number;
  }

  const rooms: Record<string, GameRoom> = {};
  const roomCodes = new Map<string, string>(); // ritualCode -> roomId
  const queues: Record<string, string[]> = {
    '1v1': [],
    '2v2': [],
  };

  const QUEUE_TIMEOUT_MS = 5000; // 5 seconds wait before adding bots
  const SHAPE_IDS = [
    'clover_3', 'clover_4', 'rune_eye', 'grimoire', 'sword', 'void_gate', 'arcane_eye', 'fractal_star', 
    'sun_crest', 'moon_shard', 'spirit_flame', 'crystal_core', 'ethereal_cross', 'serpent_coil', 'winged_key', 
    'obsidian_spike', 'lotus_seal', 'infinity_knot', 'lightning_bolt', 'shield_crest', 'anchor_pulse', 
    'hourglass_frame', 'dragon_wing', 'nova_star', 'omega_mark', 'void_orb', 'mystic_knot', 'sacred_crest', 
    'echo_wave', 'spirit_eye', 'pyre_stone', 'frost_shard'
  ];

  function generateRitualCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("register_user", ({ userId, name, email }) => {
      userSockets.set(userId, socket.id);
      (socket as any).userId = userId;
      (socket as any).userEmail = email;
      (socket as any).userData = { userId, name };
      
      // Check for reconnection
      Object.values(rooms).forEach(room => {
        const player = room.players.find(p => p.userId === userId);
        if (player) {
          player.socketId = socket.id;
          socket.join(room.id);
          console.log(`User ${name} reconnected to room ${room.id}`);
          socket.emit("reconnected", { 
            roomId: room.id, 
            status: room.status,
            type: room.type,
            players: room.players.map(p => ({
              userId: p.userId,
              name: p.name,
              socketId: p.socketId,
              team: p.team,
              score: p.score,
              chances: p.chances,
              isBot: p.isBot
            })),
            currentRound: room.currentRound,
            timeLeft: room.timeLeft
          });
          io.to(room.id).emit("player_reconnected", { userId, socketId: socket.id });
        }
      });
      
      // Update existence in users file
      try {
        const userIndex = dataCache.findIndex((u: any) => u.userId === userId);
        if (userIndex === -1) {
          dataCache.push({ userId, name, email, level: 1, updatedAt: new Date().toISOString() });
          saveMetadata();
        } else {
          // Update existing user email if missing or changed
          if (dataCache[userIndex].email !== email) {
            dataCache[userIndex].email = email;
            saveMetadata();
          }
        }
      } catch (err) {}

      console.log(`User ${name} (${userId}) registered to socket ${socket.id}`);
      
      // Notify friends this user is online
      broadcastPresence(userId, 'online');
    });

    socket.on("create_ritual", ({ mode }) => {
      const userId = (socket as any).userId;
      if (!userId) return;

      const roomId = `ritual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const roomCode = generateRitualCode();
      
      const p: Player = {
        id: userId,
        userId: userId,
        name: (socket as any).userData.name,
        socketId: socket.id,
        chances: 3,
        score: 0,
        isReady: true,
        team: mode === '2v2' ? 'A' : 'A',
        isBot: false
      };

      const room: GameRoom = {
        id: roomId,
        type: mode,
        players: [p],
        status: 'waiting',
        allMatchShapes: [], 
        puzzleShapes: [],
        timeLeft: mode === '1v1' ? 30 : 60,
        currentRound: 1,
        teamAWins: 0,
        teamBWins: 0
      };

      rooms[roomId] = room;
      roomCodes.set(roomCode, roomId);
      socket.join(roomId);

      socket.emit("ritual_created", { 
        roomId, 
        roomCode, 
        mode,
        players: room.players.map(p => ({
          userId: p.userId,
          name: p.name,
          team: p.team,
          socketId: p.socketId
        }))
      });
      console.log(`User ${p.name} created ritual room ${roomCode}`);
    });

    socket.on("ritual_ping", (timestamp) => {
      socket.emit("ritual_pong", timestamp);
    });

    socket.on("join_ritual", ({ roomCode }) => {
      const userId = (socket as any).userId;
      if (!userId) return;

      const roomId = roomCodes.get(roomCode.toUpperCase());
      if (!roomId || !rooms[roomId]) {
        return socket.emit("ritual_error", { message: "Ritual seal not found. Check the code." });
      }

      const room = rooms[roomId];
      const maxPlayers = room.type === '1v1' ? 2 : 4;

      if (room.players.length >= maxPlayers) {
        return socket.emit("ritual_error", { message: "This ritual is already full." });
      }

      if (room.status !== 'waiting') {
        return socket.emit("ritual_error", { message: "The ritual has already begun." });
      }

      // Check if already in
      if (room.players.some(p => p.userId === userId)) {
        return socket.emit("ritual_joined", { 
          roomId, 
          roomCode, 
          mode: room.type,
          players: room.players.map(p => ({
            userId: p.userId,
            name: p.name,
            team: p.team,
            socketId: p.socketId
          }))
        });
      }

      let team: 'A' | 'B' | undefined;
      if (room.type === '2v2') {
        const teamA = room.players.filter(p => p.team === 'A').length;
        const teamB = room.players.filter(p => p.team === 'B').length;
        team = teamA <= teamB ? 'A' : 'B';
      } else {
        team = room.players.length === 0 ? 'A' : 'B';
      }

      const p: Player = {
        id: userId,
        userId: userId,
        name: (socket as any).userData.name,
        socketId: socket.id,
        chances: 3,
        score: 0,
        isReady: true,
        team,
        isBot: false
      };

      room.players.push(p);
      socket.join(roomId);

      io.to(roomId).emit("ritual_updated", {
        players: room.players.map(p => ({
          userId: p.userId,
          name: p.name,
          team: p.team,
          socketId: p.socketId
        }))
      });

      socket.emit("ritual_joined", { 
        roomId, 
        roomCode, 
        mode: room.type,
        players: room.players.map(p => ({
          userId: p.userId,
          name: p.name,
          team: p.team,
          socketId: p.socketId
        }))
      });
      console.log(`User ${p.name} joined ritual room ${roomCode}`);

      // Auto start if full? 
      if (room.players.length === maxPlayers) {
        // We can just wait for host or auto start
      }
    });

    socket.on("start_ritual", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.status !== 'waiting') return;
      
      const userId = (socket as any).userId;
      if (room.players[0].userId !== userId) return; // Only host can start

      room.status = 'starting';
      
      const numShapes = room.type === '1v1' ? 15 : 12;
      const allMatchShapes = shuffleArray(SHAPE_IDS).slice(0, numShapes);
      const puzzleShapes = room.type === '1v1' ? allMatchShapes : allMatchShapes.slice(0, 4);
      
      room.allMatchShapes = allMatchShapes;
      room.puzzleShapes = puzzleShapes;

      io.to(roomId).emit("match_found", { 
        roomId, 
        type: room.type, 
        players: room.players.map(p => ({ name: p.name, socketId: p.socketId, team: p.team, isBot: p.isBot })),
        puzzleShapes
      });

      setTimeout(() => startRoomGame(roomId), 3000);
    });

    socket.on("leave_ritual", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.status !== 'waiting') return;

      const userId = (socket as any).userId;
      room.players = room.players.filter(p => p.userId !== userId);
      socket.leave(roomId);

      if (room.players.length === 0) {
        // Find code to remove
        for (const [code, rId] of roomCodes.entries()) {
          if (rId === roomId) {
            roomCodes.delete(code);
            break;
          }
        }
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("ritual_updated", {
          players: room.players.map(p => ({
            userId: p.userId,
            name: p.name,
            team: p.team,
            socketId: p.socketId
          }))
        });
      }
    });

    socket.on("spawn_asta", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.status !== 'waiting') return;

      const email = (socket as any).userEmail;
      if (email !== 'g4830125@gmail.com') return; // Developer only

      const botId = 'bot_asta';
      if (room.players.some(p => p.userId === botId)) return;

      const maxPlayers = room.type === '1v1' ? 2 : 4;
      if (room.players.length >= maxPlayers) return;

      let team: 'A' | 'B' | undefined;
      if (room.type === '2v2') {
        const teamA = room.players.filter(p => p.team === 'A').length;
        const teamB = room.players.filter(p => p.team === 'B').length;
        team = teamA <= teamB ? 'A' : 'B';
      } else {
        team = room.players.length === 0 ? 'A' : 'B';
      }

      const p: Player = {
        id: botId,
        userId: botId,
        name: 'Asta',
        socketId: 'bot_asta_s',
        chances: 3,
        score: 0,
        isReady: true,
        team,
        isBot: true
      };

      room.players.push(p);
      io.to(roomId).emit("ritual_updated", {
        players: room.players.map(p => ({
          userId: p.userId,
          name: p.name,
          team: p.team,
          socketId: p.socketId
        }))
      });
      console.log(`Bot Asta spawned in room ${roomId}`);
    });

    socket.on("search_users", ({ query }, callback) => {
      try {
        const results = dataCache
          .filter((u: any) => {
            // Hide specific test bot accounts from general search
            if (u.userId === 'bot_asta') {
              return (socket as any).userEmail === 'g4830125@gmail.com';
            }
            return u.name.toLowerCase().includes(query.toLowerCase()) || 
                   u.userId.toLowerCase().includes(query.toLowerCase());
          })
          .slice(0, 5)
          .map((u: any) => ({
            userId: u.userId,
            name: u.name,
            level: u.level
          }));
        callback(results);
      } catch (err) {
        callback([]);
      }
    });

    socket.on("send_friend_request", async ({ toId }) => {
      const fromId = (socket as any).userId;
      if (!fromId || fromId === toId) return;

      try {
        if (!socialCache.requests[toId]) socialCache.requests[toId] = [];
        
        // Check if already friends
        if (socialCache.friends[fromId]?.includes(toId)) return;
        
        // Avoid duplicates
        if (socialCache.requests[toId].some((r: any) => r.fromId === fromId)) return;

        const request = {
          fromId,
          fromName: (socket as any).userData.name,
          toId,
          timestamp: new Date().toISOString()
        };
        
        socialCache.requests[toId].push(request);
        await saveSocial();

        // Notify recipient if online
        const toSocketId = userSockets.get(toId);
        if (toSocketId) {
          io.to(toSocketId).emit("friend_request_received", request);
        } else if (toId === 'bot_asta') {
          // Auto-accept after a delay
          setTimeout(async () => {
            if (!socialCache.friends[fromId]) socialCache.friends[fromId] = [];
            if (!socialCache.friends['bot_asta']) socialCache.friends['bot_asta'] = [];
            
            if (!socialCache.friends[fromId].includes('bot_asta')) socialCache.friends[fromId].push('bot_asta');
            if (!socialCache.friends['bot_asta'].includes(fromId)) socialCache.friends['bot_asta'].push(fromId);
            
            // Remove request
            socialCache.requests['bot_asta'] = (socialCache.requests['bot_asta'] || []).filter((r: any) => r.fromId !== fromId);
            
            await saveSocial();
            socket.emit("friend_added", { userId: 'bot_asta' });
          }, 1500);
        }
      } catch (err) {}
    });

    socket.on("accept_friend_request", async ({ fromId }) => {
      const toId = (socket as any).userId;
      if (!toId) return;

      try {
        // Remove request
        if (socialCache.requests[toId]) {
          socialCache.requests[toId] = socialCache.requests[toId].filter((r: any) => r.fromId !== fromId);
        }

        // Add to friends
        if (!socialCache.friends[toId]) socialCache.friends[toId] = [];
        if (!socialCache.friends[fromId]) socialCache.friends[fromId] = [];
        
        if (!socialCache.friends[toId].includes(fromId)) socialCache.friends[toId].push(fromId);
        if (!socialCache.friends[fromId].includes(toId)) socialCache.friends[fromId].push(toId);

        await saveSocial();

        // Notify both parties
        const fromSocketId = userSockets.get(fromId);
        if (fromSocketId) io.to(fromSocketId).emit("friend_added", { userId: toId });
        socket.emit("friend_added", { userId: fromId });
      } catch (err) {}
    });

    socket.on("get_social_data", (callback) => {
      const userId = (socket as any).userId;
      if (!userId) return callback({ friends: [], requests: [] });

      try {
        const userFriendsIds = socialCache.friends[userId] || [];
        const friends = userFriendsIds.map((fId: string) => {
          const user = dataCache.find((u: any) => u.userId === fId);
          return {
            userId: fId,
            name: user?.name || "Unknown Mage",
            level: user?.level || 1,
            status: userSockets.has(fId) ? 'online' : 'offline'
          };
        });

        const requests = socialCache.requests[userId] || [];
        callback({ friends, requests });
      } catch (err) {
        callback({ friends: [], requests: [] });
      }
    });

    socket.on("send_game_invite", ({ toId, mode }) => {
      const fromId = (socket as any).userId;
      if (!fromId) return;

      const toSocketId = userSockets.get(toId);
      if (toSocketId) {
        io.to(toSocketId).emit("game_invite_received", {
          id: `invite_${Date.now()}`,
          fromId,
          fromName: (socket as any).userData.name,
          mode,
          timestamp: new Date().toISOString()
        });
      } else if (toId === 'bot_asta') {
        // Auto-accept after a moment
        setTimeout(() => {
          socket.emit("game_invite_received", {
            id: `invite_asta_${Date.now()}`,
            fromId: 'bot_asta',
            fromName: 'Asta',
            mode,
            timestamp: new Date().toISOString(),
            isBotResponse: true
          });
          
          // Actually we can just trigger the match found logic directly
          handleInviteAccept({
            id: `invite_asta_${Date.now()}`,
            fromId: fromId,
            fromName: (socket as any).userData.name,
            mode,
            timestamp: new Date().toISOString()
          }, 'bot_asta', socket);
        }, 1200);
      }
    });

    socket.on("accept_game_invite", ({ invite }) => {
      handleInviteAccept(invite, (socket as any).userId, socket);
    });

    function handleInviteAccept(invite: any, currentUserId: string, currentSocket: any) {
      const isAstaMatch = invite.fromId === 'bot_asta' || currentUserId === 'bot_asta';
      
      let otherSocketId = userSockets.get(invite.fromId === currentUserId ? 'bot_asta' : invite.fromId);
      
      // If it's Asta, we just need the players list to include Asta
      const players: any[] = [];
      
      if (invite.fromId === 'bot_asta') {
        players.push({
          id: 'bot_asta', userId: 'bot_asta', name: 'Asta', socketId: 'bot_asta_s', chances: 3, score: 0, isReady: true, team: invite.mode === '2v2' ? 'A' : 'A', isBot: true
        });
        players.push({
          id: currentUserId, userId: currentUserId, name: (currentSocket as any).userData.name, socketId: currentSocket.id, chances: 3, score: 0, isReady: true, team: invite.mode === '2v2' ? 'A' : 'B', isBot: false
        });
      } else {
        players.push({
          id: invite.fromId, userId: invite.fromId, name: invite.fromName, socketId: userSockets.get(invite.fromId) || 'bot_asta_s', chances: 3, score: 0, isReady: true, team: invite.mode === '2v2' ? 'A' : 'A', isBot: invite.fromId === 'bot_asta'
        });
        const targetId = currentUserId === invite.fromId ? 'bot_asta' : currentUserId;
        players.push({
           id: targetId, userId: targetId, name: targetId === 'bot_asta' ? 'Asta' : (currentSocket as any).userData.name, socketId: userSockets.get(targetId) || 'bot_asta_s', chances: 3, score: 0, isReady: true, team: invite.mode === '2v2' ? 'A' : 'B', isBot: targetId === 'bot_asta'
        });
      }

      // Add bots if 2v2 to fill slots immediately
      if (invite.mode === '2v2') {
         players.push({
           id: 'bot_1', userId: 'bot_1', name: 'Elder Grimoire', socketId: 'bot_s1', chances: 3, score: 0, isReady: true, team: 'B', isBot: true
         });
         players.push({
           id: 'bot_2', userId: 'bot_2', name: 'Runic Guard', socketId: 'bot_s2', chances: 3, score: 0, isReady: true, team: 'B', isBot: true
         });
      }

      const roomId = `invite_room_${Date.now()}`;
      const numShapes = invite.mode === '1v1' ? 15 : 12;
      const allMatchShapes = shuffleArray(SHAPE_IDS).slice(0, numShapes);
      const puzzleShapes = invite.mode === '1v1' ? allMatchShapes : allMatchShapes.slice(0, 4);

      const room: GameRoom = {
        id: roomId,
        type: invite.mode,
        players,
        status: 'starting',
        allMatchShapes,
        puzzleShapes,
        timeLeft: invite.mode === '1v1' ? 30 : 60,
        currentRound: 1,
        teamAWins: 0,
        teamBWins: 0
      };

      rooms[roomId] = room;
      
      const realPlayers = players.filter(p => !p.isBot);
      realPlayers.forEach(p => {
        const s = io.sockets.sockets.get(p.socketId);
        if (s) {
          s.join(roomId);
          s.emit("invite_accepted", { roomId, invite });
        }
      });
      
      io.to(roomId).emit("match_found", { 
        roomId, 
        type: invite.mode, 
        players: players.map(p => ({ name: p.name, socketId: p.socketId, team: p.team, isBot: p.isBot })),
        puzzleShapes
      });

      setTimeout(() => startRoomGame(roomId), 3000);
    }

    socket.on("join_queue", ({ type, userId, name }) => {
      if (queues[type].includes(socket.id)) return;
      queues[type].push(socket.id);
      
      // Store user data on socket for convenience
      (socket as any).userData = { userId, name };

      console.log(`User ${name} joined ${type} queue. Queue size: ${queues[type].length}`);

      checkQueue(type);

      // Start a timer to add bots if queue doesn't fill
      setTimeout(() => {
        if (queues[type].includes(socket.id)) {
          addBotsToQueue(type);
        }
      }, QUEUE_TIMEOUT_MS);
    });

    socket.on("leave_queue", ({ type }) => {
      queues[type] = queues[type].filter(id => id !== socket.id);
    });

    socket.on("submit_guess", ({ roomId, shapeId, isCorrect }) => {
      const room = rooms[roomId];
      if (!room || room.status !== 'playing') return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      if (isCorrect) {
        player.score += 1;
        io.to(roomId).emit("player_scored", { socketId: socket.id, score: player.score });
      } else {
        player.chances -= 1;
        io.to(roomId).emit("player_lost_chance", { socketId: socket.id, chances: player.chances });
      }

      // Check if game should end early for this player or all
      if (player.chances <= 0) {
        socket.emit("game_over_personal", { reason: "Out of chances" });
      }

      // 2v2 specific: check if team finished all shapes
      if (room.type === '2v2') {
        const team = player.team;
        const teamPlayers = room.players.filter(p => p.team === team);
        const teamScore = teamPlayers.reduce((acc, p) => acc + p.score, 0);
        if (teamScore >= 4) {
          endGame(roomId, team);
        }
      }
    });

    socket.on("disconnect", () => {
      const userId = (socket as any).userId;
      if (userId) {
        userSockets.delete(userId);
        broadcastPresence(userId, 'offline');
      }

      // Remove from queues
      Object.keys(queues).forEach(type => {
        queues[type] = queues[type].filter(id => id !== socket.id);
      });

      // Handle room disconnection
      Object.values(rooms).forEach(room => {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          io.to(room.id).emit("player_disconnected", { socketId: socket.id });
          
          if (room.status === 'waiting') {
            // Remove from lobby if just waiting
            const userId = (socket as any).userId;
            room.players = room.players.filter(p => p.socketId !== socket.id);
            io.to(room.id).emit("ritual_updated", {
              players: room.players.map(p => ({
                userId: p.userId,
                name: p.name,
                team: p.team,
                socketId: p.socketId
              }))
            });
          }

          if (room.status === 'playing') {
             // If everyone leaves, cleanup
             if (room.players.every(p => !io.sockets.sockets.get(p.socketId)?.connected)) {
               delete rooms[room.id];
             }
          }
        }
      });
    });
  });

  function broadcastPresence(userId: string, status: 'online' | 'offline') {
    // Only fetch friends of this user to notify
    try {
      const friends = socialCache.friends[userId] || [];
      friends.forEach((fId: string) => {
        const socketId = userSockets.get(fId);
        if (socketId) {
          io.to(socketId).emit("friend_presence", { userId, status });
        }
      });
    } catch (err) {}
  }

  function addBotsToQueue(type: string) {
    const required = type === '1v1' ? 2 : 4;
    const needed = required - queues[type].length;
    
    if (needed <= 0) return;

    console.log(`Adding ${needed} bots to ${type} queue`);
    
    // Create virtual sockets/players for bots
    for(let i=0; i < needed; i++) {
      const botId = `bot_${Math.random().toString(36).substr(2, 5)}`;
      const botSocketId = `bot_socket_${botId}`;
      
      // We push a special string to indicate a bot
      queues[type].push(botSocketId);
      
      // Store bot data
      (io as any)[botSocketId] = {
        userData: { 
          userId: botId, 
          name: `Disciple ${i + 1}`,
          isBot: true 
        }
      };
    }

    checkQueue(type);
  }

  function checkQueue(type: string) {
    const required = type === '1v1' ? 2 : 4;
    if (queues[type].length >= required) {
      const entries = queues[type].splice(0, required);
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const players: Player[] = entries.map((socketId, index) => {
        let userData;
        if (socketId.startsWith('bot_socket_')) {
          userData = (io as any)[socketId].userData;
        } else {
          const s = io.sockets.sockets.get(socketId);
          userData = (s as any)?.userData || { userId: 'unknown', name: 'Mage' };
        }
        
        let team: 'A' | 'B' | undefined;
        if (type === '2v2') {
          team = index < 2 ? 'A' : 'B';
        }

        return {
          id: userData.userId,
          userId: userData.userId,
          name: userData.name,
          socketId,
          chances: 3,
          score: 0,
          isReady: false,
          team,
          isBot: userData.isBot || false
        };
      });

      const numShapes = type === '1v1' ? 15 : 12;
      const allMatchShapes = shuffleArray(SHAPE_IDS).slice(0, numShapes);
      const puzzleShapes = type === '1v1' ? allMatchShapes : allMatchShapes.slice(0, 4);

      const room: GameRoom = {
        id: roomId,
        type: type as '1v1' | '2v2',
        players,
        status: 'starting',
        allMatchShapes,
        puzzleShapes,
        timeLeft: type === '1v1' ? 30 : 60,
        currentRound: 1,
        teamAWins: 0,
        teamBWins: 0
      };

      rooms[roomId] = room;
      entries.forEach(id => {
        if (!id.startsWith('bot_socket_')) {
          const s = io.sockets.sockets.get(id);
          s?.join(roomId);
        }
      });

      io.to(roomId).emit("match_found", { 
        roomId, 
        type, 
        players: players.map(p => ({ name: p.name, socketId: p.socketId, team: p.team, isBot: p.isBot })),
        puzzleShapes
      });

      setTimeout(() => {
        startRoomGame(roomId);
      }, 3000);
    }
  }

  function startRound(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'playing';
    
    if (room.type === '1v1') {
      room.timeLeft = 30;
    } else {
      // 2v2: Reduce time by 10s each round
      // Round 1: 60, Round 2: 50, Round 3: 40
      room.timeLeft = Math.max(20, 60 - (room.currentRound - 1) * 10);
    }
    
    // Reset individual player state for the new round
    room.players.forEach(p => {
      p.score = 0;
      p.chances = 3;
    });

    // Distribute shapes for this specific round in 2v2
    if (room.type === '2v2') {
      const startIndex = (room.currentRound - 1) * 4;
      room.puzzleShapes = room.allMatchShapes.slice(startIndex, startIndex + 4);
      // Fallback if we somehow run out
      if (room.puzzleShapes.length === 0) {
        room.puzzleShapes = shuffleArray(SHAPE_IDS).slice(0, 4);
      }
    } else {
      room.puzzleShapes = room.allMatchShapes;
    }

    io.to(roomId).emit("round_start", { 
      round: room.currentRound, 
      timeLeft: room.timeLeft,
      puzzleShapes: room.puzzleShapes,
      players: room.players.map(p => ({ socketId: p.socketId, score: 0, chances: 3 }))
    });

    // Bot logic: start simulation
    room.players.forEach(p => {
      if ((p as any).isBot) {
        simulateBotActions(roomId, p);
      }
    });

    room.timer = setInterval(() => {
      room.timeLeft -= 1;
      io.to(roomId).emit("timer_tick", { timeLeft: room.timeLeft });

      if (room.timeLeft <= 0) {
        endGame(roomId);
      }
    }, 1000);
  }

  function startRoomGame(roomId: string) {
    startRound(roomId);
  }

  function simulateBotActions(roomId: string, bot: Player) {
    const room = rooms[roomId];
    if (!room) return;

    const interval = room.type === '1v1' ? 4000 : 3000;
    
    const botTimer = setInterval(() => {
      const currentRoom = rooms[roomId];
      if (!currentRoom || currentRoom.status !== 'playing' || bot.chances <= 0) {
        clearInterval(botTimer);
        return;
      }

      // Random chance to be correct
      const isCorrect = Math.random() > 0.3;
      if (isCorrect) {
        bot.score += 1;
        io.to(roomId).emit("player_scored", { socketId: bot.socketId, score: bot.score });
      } else {
        bot.chances -= 1;
        io.to(roomId).emit("player_lost_chance", { socketId: bot.socketId, chances: bot.chances });
      }

      if (room.type === '2v2') {
        const teamPlayers = currentRoom.players.filter(p => p.team === bot.team);
        const teamScore = teamPlayers.reduce((acc, p) => acc + p.score, 0);
        if (teamScore >= 4) {
          endGame(roomId, bot.team);
          clearInterval(botTimer);
        }
      } else if (room.type === '1v1') {
        if (bot.score >= 5) {
          endGame(roomId);
          clearInterval(botTimer);
        }
      }

    }, interval + Math.random() * 2000);
  }

  function endGame(roomId: string, winningTeam?: 'A' | 'B') {
    const room = rooms[roomId];
    if (!room) return;

    if (room.timer) clearInterval(room.timer);

    if (room.type === '2v2') {
      // Determine winner based on score if not explicitly provided
      if (!winningTeam) {
        const scoreA = room.players.filter(p => p.team === 'A').reduce((acc, p) => acc + p.score, 0);
        const scoreB = room.players.filter(p => p.team === 'B').reduce((acc, p) => acc + p.score, 0);
        if (scoreA > scoreB) winningTeam = 'A';
        else if (scoreB > scoreA) winningTeam = 'B';
        else winningTeam = undefined; // Draw
      }

      if (winningTeam === 'A') room.teamAWins++;
      else if (winningTeam === 'B') room.teamBWins++;

      const isMatchOver = room.teamAWins >= 2 || room.teamBWins >= 2 || room.currentRound >= 3;

      if (isMatchOver) {
        room.status = 'ended';
        let matchWinner: 'A' | 'B' | 'draw' = 'draw';
        if (room.teamAWins > room.teamBWins) matchWinner = 'A';
        else if (room.teamBWins > room.teamAWins) matchWinner = 'B';

        io.to(roomId).emit("game_results", {
          winnerTeam: matchWinner,
          scores: room.players.map(p => ({ socketId: p.socketId, score: p.score })),
          teamStats: { A: room.teamAWins, B: room.teamBWins }
        });
      } else {
        // Transition to next round
        room.status = 'round_ended';
        
        io.to(roomId).emit("round_results", {
          roundWinner: winningTeam || 'draw',
          nextRound: room.currentRound + 1,
          teamStats: { A: room.teamAWins, B: room.teamBWins }
        });

        // Increment round count after emission
        room.currentRound++;

        // Start next round after a delay
        setTimeout(() => {
          if (rooms[roomId]) startRound(roomId);
        }, 5000); // 5 second transition
      }
    } else {
      // 1v1 Mode
      room.status = 'ended';
      const p1 = room.players[0];
      const p2 = room.players[1];
      
      let winner;
      if (p1.score > p2.score) winner = p1.socketId;
      else if (p2.score > p1.score) winner = p2.socketId;
      else winner = 'draw';
      
      io.to(roomId).emit("game_results", {
        winner,
        scores: room.players.map(p => ({ socketId: p.socketId, score: p.score }))
      });
    }

    // Auto cleanup after some time if match is truly over
    if (room.status === 'ended') {
      setTimeout(() => {
        delete rooms[roomId];
      }, 5000);
    }
  }

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
