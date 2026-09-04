const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== ADMIN ====================

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Taha92mm";

// ==================== DATABASE ====================

const db = new Database("talon.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team TEXT NOT NULL,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS honors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points INTEGER DEFAULT 0
  );
`);

// ساخت ادمین
const adminExists = db
  .prepare("SELECT id FROM admins WHERE username = ?")
  .get(ADMIN_USERNAME);

if (!adminExists) {
  db.prepare(
    "INSERT INTO admins (username, password) VALUES (?, ?)"
  ).run(ADMIN_USERNAME, ADMIN_PASSWORD);
}

// ==================== MIDDLEWARE ====================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "talon-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      error: "دسترسی غیرمجاز"
    });
  }

  next();
}

// ==================== LOGIN ====================

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {
    req.session.admin = true;

    return res.json({
      success: true
    });
  }

  res.status(401).json({
    success: false,
    error: "نام کاربری یا رمز عبور اشتباه است"
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

app.get("/api/me", (req, res) => {
  res.json({
    loggedIn: !!req.session.admin
  });
});

// ==================== NEWS ====================

app.get("/api/news", (req, res) => {
  const news = db
    .prepare("SELECT * FROM news ORDER BY id DESC")
    .all();

  res.json(news);
});

app.post("/api/news", requireAdmin, (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "عنوان و متن خبر الزامی است"
    });
  }

  const result = db
    .prepare(
      "INSERT INTO news (title, content) VALUES (?, ?)"
    )
    .run(title, content);

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/news/:id", requireAdmin, (req, res) => {
  const { title, content } = req.body;

  db.prepare(`
    UPDATE news
    SET title = ?, content = ?
    WHERE id = ?
  `).run(title, content, req.params.id);

  res.json({
    success: true
  });
});

app.delete("/api/news/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM news WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// ==================== GAMES ====================

app.get("/api/games", (req, res) => {
  const games = db
    .prepare("SELECT * FROM games ORDER BY id DESC")
    .all();

  res.json(games);
});

app.post("/api/games", requireAdmin, (req, res) => {
  const {
    home_team,
    away_team,
    home_score,
    away_score,
    date
  } = req.body;

  const result = db.prepare(`
    INSERT INTO games
    (home_team, away_team, home_score, away_score, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    home_team,
    away_team,
    home_score || 0,
    away_score || 0,
    date || ""
  );

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/games/:id", requireAdmin, (req, res) => {
  const {
    home_team,
    away_team,
    home_score,
    away_score,
    date
  } = req.body;

  db.prepare(`
    UPDATE games
    SET home_team = ?,
        away_team = ?,
        home_score = ?,
        away_score = ?,
        date = ?
    WHERE id = ?
  `).run(
    home_team,
    away_team,
    home_score || 0,
    away_score || 0,
    date || "",
    req.params.id
  );

  res.json({
    success: true
  });
});

app.delete("/api/games/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM games WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// ==================== STANDINGS ====================

app.get("/api/standings", (req, res) => {
  const standings = db
    .prepare(`
      SELECT * FROM standings
      ORDER BY points DESC, wins DESC
    `)
    .all();

  res.json(standings);
});

app.post("/api/standings", requireAdmin, (req, res) => {
  const {
    team,
    played,
    wins,
    draws,
    losses,
    points
  } = req.body;

  const result = db.prepare(`
    INSERT INTO standings
    (team, played, wins, draws, losses, points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    team,
    played || 0,
    wins || 0,
    draws || 0,
    losses || 0,
    points || 0
  );

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/standings/:id", requireAdmin, (req, res) => {
  const {
    team,
    played,
    wins,
    draws,
    losses,
    points
  } = req.body;

  db.prepare(`
    UPDATE standings
    SET team = ?,
        played = ?,
        wins = ?,
        draws = ?,
        losses = ?,
        points = ?
    WHERE id = ?
  `).run(
    team,
    played || 0,
    wins || 0,
    draws || 0,
    losses || 0,
    points || 0,
    req.params.id
  );

  res.json({
    success: true
  });
});

app.delete("/api/standings/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM standings WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// ==================== HONORS ====================

app.get("/api/honors", (req, res) => {
  const honors = db
    .prepare(`
      SELECT * FROM honors
      ORDER BY points DESC, name ASC
    `)
    .all();

  res.json(honors);
});

app.post("/api/honors", requireAdmin, (req, res) => {
  const { name, points } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "نام الزامی است"
    });
  }

  const result = db
    .prepare(
      "INSERT INTO honors (name, points) VALUES (?, ?)"
    )
    .run(name, points || 0);

  res.json({
    success: true,
    id: result.lastInsertRowid
  });
});

app.put("/api/honors/:id", requireAdmin, (req, res) => {
  const { name, points } = req.body;

  db.prepare(`
    UPDATE honors
    SET name = ?, points = ?
    WHERE id = ?
  `).run(name, points || 0, req.params.id);

  res.json({
    success: true
  });
});

app.delete("/api/honors/:id", requireAdmin, (req, res) => {
  db.prepare(
    "DELETE FROM honors WHERE id = ?"
  ).run(req.params.id);

  res.json({
    success: true
  });
});

// ==================== WEBSITE ====================

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ==================== START ====================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TALON running on port ${PORT}`);
});
