import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "leaderboard.json");

  app.use(express.json());

  // --- REST API ENDPOINTS ---
  // Initialize leaderboard file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }

  // API: Get Leaderboard
  app.get("/api/leaderboard", (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      // Sort by level descending
      const sorted = data.sort((a: any, b: any) => b.level - a.level).slice(0, 50);
      res.json(sorted);
    } catch (error) {
      res.status(500).json({ error: "Failed to read leaderboard" });
    }
  });

  // API: Submit Score
  app.post("/api/leaderboard", (req, res) => {
    const { userId, name, level, isTest } = req.body;
    
    if (!userId || !name || level === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      const index = data.findIndex((p: any) => p.userId === userId);

      const entryName = isTest ? `${name} (Test Player)` : name;

      if (index !== -1) {
        // Update if higher level
        if (level > data[index].level) {
          data[index].level = level;
          data[index].name = entryName;
          data[index].updatedAt = new Date().toISOString();
        }
      } else {
        // New entry
        data.push({
          userId,
          name: entryName,
          level,
          updatedAt: new Date().toISOString()
        });
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
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
    puzzleShapes: string[]; // IDs of shapes
    timer?: NodeJS.Timeout;
    timeLeft: number;
    currentRound: number;
    teamAWins: number;
    teamBWins: number;
  }

  const rooms: Record<string, GameRoom> = {};
  const queues: Record<string, string[]> = {
    '1v1': [],
    '2v2': [],
  };

  const SHAPE_IDS = ['clover_3', 'clover_4', 'rune_eye', 'grimoire', 'sword', 'void_gate', 'arcane_eye', 'fractal_star'];
  const QUEUE_TIMEOUT_MS = 5000; // 5 seconds wait before adding bots

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

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
      // Remove from queues
      Object.keys(queues).forEach(type => {
        queues[type] = queues[type].filter(id => id !== socket.id);
      });

      // Handle room disconnection
      Object.values(rooms).forEach(room => {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          io.to(room.id).emit("player_disconnected", { socketId: socket.id });
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

      const puzzleShapes = [];
      const numShapes = type === '1v1' ? 5 : 4;
      for(let i=0; i<numShapes; i++) {
        puzzleShapes.push(SHAPE_IDS[Math.floor(Math.random() * SHAPE_IDS.length)]);
      }

      const room: GameRoom = {
        id: roomId,
        type: type as '1v1' | '2v2',
        players,
        status: 'starting',
        puzzleShapes,
        timeLeft: 60,
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
    room.timeLeft = 60;
    
    // Reset individual player state for the new round
    room.players.forEach(p => {
      p.score = 0;
      p.chances = 3;
    });

    // New shapes for each round in 2v2
    if (room.type === '2v2') {
      room.puzzleShapes = [];
      for(let i=0; i<4; i++) {
        room.puzzleShapes.push(SHAPE_IDS[Math.floor(Math.random() * SHAPE_IDS.length)]);
      }
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
