// initDB.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./growme.db");

// Tabloları oluştur
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        birth TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS journals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        date TEXT,
        text TEXT,
        mood TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        name TEXT,
        type TEXT,
        dailyMin INTEGER,
        desc TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS weekly (
        username TEXT PRIMARY KEY,
        data TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS profiles (
        username TEXT PRIMARY KEY,
        avatar TEXT DEFAULT '🌸',
        bio TEXT DEFAULT '',
        mood TEXT DEFAULT '😄',
        streak INTEGER DEFAULT 0,
        journals INTEGER DEFAULT 0,
        moodCount INTEGER DEFAULT 0,
        firstGoal INTEGER DEFAULT 0
    )`);
});

db.close(() => {
    console.log("growme.db oluşturuldu ve tablolar hazır!");
});
