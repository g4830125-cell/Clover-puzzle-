import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "leaderboard.json");

  app.use(express.json());

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

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
