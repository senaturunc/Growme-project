const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

// .env dosyasını manuel oku ve process.env'ye yükle
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}


// SQLite DB bağlantısı
const db = new sqlite3.Database("./growme.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ------------------- ANA SAYFA -------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "giris.html")));

// ------------------- DATABASE TABLES (Oluşturma) -------------------
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

// ------------------- KAYIT -------------------
app.post("/register", (req, res) => {
    const { name, username, email, password, birth } = req.body;
    if (!name || !username || !email || !password || !birth)
        return res.json({ success: false, message: "Tüm alanlar zorunludur." });

    db.get("SELECT * FROM users WHERE username=? OR email=?", [username, email], (err, user) => {
        if (user) return res.json({ success: false, message: "Kullanıcı adı veya email zaten kayıtlı." });

        db.run(
            "INSERT INTO users (name, username, email, password, birth) VALUES (?,?,?,?,?)",
            [name, username, email, password, birth],
            function () {
                db.run(`INSERT OR IGNORE INTO profiles (username) VALUES (?)`, [username]);
                res.json({ success: true });
            }
        );
    });
});

// ------------------- GİRİŞ -------------------
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username=? AND password=?", [username, password], (err, user) => {
        if (!user) return res.json({ success: false, message: "Kullanıcı adı veya şifre yanlış." });
        res.json({ success: true, username: user.username });
    });
});

// ------------------- DASHBOARD -------------------
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));

// ------------------- JOURNAL CRUD -------------------
app.post("/journal", (req, res) => {
    const { username, date, text, mood } = req.body;
    if (!username || !date || !text) return res.json({ success: false, message: "Eksik bilgi." });

    db.run("INSERT INTO journals (username,date,text,mood) VALUES (?,?,?,?)", [username, date, text, mood], function () {
        db.all("SELECT * FROM journals WHERE username=?", [username], (err, journals) => {
            const streak = calculateStreak(journals);
            db.run("UPDATE profiles SET streak=?, journals=? WHERE username=?", [streak, journals.length, username]);
            res.json({ success: true, journals, streak });
        });
    });
});

app.get("/journal", (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ success: false, message: "Kullanıcı yok." });

    db.all("SELECT * FROM journals WHERE username=?", [username], (err, journals) => {
        const streak = calculateStreak(journals);
        res.json({ success: true, journals, streak });
    });
});

app.put("/journal/:id", (req, res) => {
    const { id } = req.params;
    const { text, mood } = req.body;
    db.get("SELECT * FROM journals WHERE id=?", [id], (err, journal) => {
        if (!journal) return res.json({ success: false, message: "Günlük bulunamadı" });

        db.run("UPDATE journals SET text=?, mood=? WHERE id=?", [text, mood, id], function () {
            db.all("SELECT * FROM journals WHERE username=?", [journal.username], (err, journals) => {
                const streak = calculateStreak(journals);
                db.run("UPDATE profiles SET streak=?, journals=? WHERE username=?", [streak, journals.length, journal.username]);
                res.json({ success: true, journals, streak });
            });
        });
    });
});

app.delete("/journal/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM journals WHERE id=?", [id], (err, journal) => {
        if (!journal) return res.json({ success: false, message: "Günlük bulunamadı" });

        db.run("DELETE FROM journals WHERE id=?", [id], function () {
            db.all("SELECT * FROM journals WHERE username=?", [journal.username], (err, journals) => {
                const streak = calculateStreak(journals);
                db.run("UPDATE profiles SET streak=?, journals=? WHERE username=?", [streak, journals.length, journal.username]);
                res.json({ success: true, journals, streak });
            });
        });
    });
});

// ------------------- GOALS CRUD -------------------
app.post("/goals", (req, res) => {
    const { username, name, type, dailyMin, desc } = req.body;
    if (!username || !name || !type || dailyMin == null) return res.json({ success: false, message: "Eksik bilgi" });

    db.run(
        "INSERT INTO goals (username,name,type,dailyMin,desc) VALUES (?,?,?,?,?)",
        [username, name, type, dailyMin, desc || ""],
        function () {
            db.run("UPDATE profiles SET firstGoal=1 WHERE username=?", [username]);
            db.all("SELECT * FROM goals WHERE username=?", [username], (err, goals) => {
                res.json({ success: true, goals });
            });
        }
    );
});

app.get("/goals", (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ success: false });
    db.all("SELECT * FROM goals WHERE username=?", [username], (err, goals) => {
        res.json({ success: true, goals });
    });
});

app.put("/goals/:id", (req, res) => {
    const { id } = req.params;
    const { name, type, dailyMin, desc } = req.body;

    db.get("SELECT * FROM goals WHERE id=?", [id], (err, goal) => {
        if (!goal) return res.json({ success: false, message: "Hedef bulunamadı" });

        db.run(
            "UPDATE goals SET name=?, type=?, dailyMin=?, desc=? WHERE id=?",
            [name, type, dailyMin || goal.dailyMin, desc || goal.desc, id],
            function () {
                db.all("SELECT * FROM goals WHERE username=?", [goal.username], (err, goals) => {
                    res.json({ success: true, goals });
                });
            }
        );
    });
});

app.delete("/goals/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM goals WHERE id=?", [id], (err, goal) => {
        if (!goal) return res.json({ success: false, message: "Hedef bulunamadı" });

        db.run("DELETE FROM goals WHERE id=?", [id], function () {
            db.all("SELECT * FROM goals WHERE username=?", [goal.username], (err, goals) => {
                res.json({ success: true, goals });
            });
        });
    });
});

// ------------------- WEEKLY -------------------
app.post("/weekly", (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ success: false });

    db.run("INSERT OR REPLACE INTO weekly (username,data) VALUES (?,?)", [username, JSON.stringify(req.body)], function () {
        res.json({ success: true });
    });
});

app.get("/weekly", (req, res) => {
    const username = req.query.username;
    db.get("SELECT * FROM weekly WHERE username=?", [username], (err, row) => {
        const data = row ? JSON.parse(row.data) : null;
        res.json({ success: true, data });
    });
});

// ------------------- PROFILE -------------------
app.get("/api/profile", (req, res) => {
    const username = req.query.username;
    db.get("SELECT * FROM profiles WHERE username=?", [username], (err, profile) => {
        if (!profile) return res.json({ success: false, message: "Kullanıcı bulunamadı" });
        res.json({ success: true, profile });
    });
});

app.put("/api/profile/bio", (req, res) => {
    const { username, bio } = req.body;
    db.run("UPDATE profiles SET bio=? WHERE username=?", [bio, username], function () {
        res.json({ success: true });
    });
});

app.put("/api/profile/mood", (req, res) => {
    const { username, mood } = req.body;
    db.get("SELECT * FROM profiles WHERE username=?", [username], (err, profile) => {
        if (!profile) return res.json({ success: false });
        const moodCount = (profile.moodCount || 0) + 1;
        db.run("UPDATE profiles SET mood=?, moodCount=? WHERE username=?", [mood, moodCount, username]);
        res.json({ success: true, moodCount });
    });
});

app.put("/api/profile/avatar", (req, res) => {
    const { username, avatar } = req.body;
    db.run("UPDATE profiles SET avatar=? WHERE username=?", [avatar, username], function () {
        res.json({ success: true });
    });
});

// ------------------- BADGES -------------------
app.get("/api/badges", (req, res) => {
    const username = req.query.username;
    db.get("SELECT * FROM profiles WHERE username=?", [username], (err, profile) => {
        if (!profile) return res.json({ success: false });
        const badges = {
            badge1: !!profile.firstGoal,
            badge2: (profile.streak || 0) >= 3,
            badge3: (profile.streak || 0) >= 7,
            badge4: (profile.streak || 0) >= 10,
            badge5: (profile.moodCount || 0) >= 5,
            badge6: false
        };
        res.json({ success: true, badges });
    });
});

// ------------------- HELPER -------------------
function calculateStreak(journals) {
    let streak = 0;
    const dates = journals.map(j => new Date(j.date)).sort((a, b) => b - a);
    if (dates.length) {
        let today = new Date(),
            count = 0;
        for (let d of dates) {
            const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
            if (diff === count) count++;
            else break;
        }
        streak = count;
    }
    return streak;
}

// ------------------- AI COACH ENDPOINT -------------------
app.post("/api/ai-coach", async (req, res) => {
    const { username, mood, goals, streak } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.json({ 
            success: true, 
            advice: `Merhaba ${username}! Bugün hedeflerine ulaşmak için küçük adımlarla başlamayı unutma. Her gün kendin için yapacağın küçük bir iyilik, uzun vadede büyük bir değişime dönüşecektir. Kendine inan!` 
        });
    }

    const prompt = `Sen, GrowMe adında bir kişisel gelişim ve motivasyon uygulamasında profesyonel bir Kişisel Gelişim Koçusun (AI Coach). 
Kullanıcı Adı: ${username}
Bugünkü Ruh Hali: ${mood || "Belirtilmedi"}
Belirlediği Hedefler: ${goals && goals.length ? goals.join(", ") : "Henüz hedef girilmedi"}
Günlük Seri (Streak): ${streak || 0} gün

Lütfen kullanıcıya durumuna özel, sıcak, samimi, teşvik edici ve motive edici kısa bir günlük koç mesajı yaz (maksimum 4-5 cümle). 
Yanıtında sadece doğrudan bu mesajı ver, tırnak işareti veya 'Koç:' gibi başlıklar kullanma. Türkçe yanıt ver.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const advice = data.candidates[0].content.parts[0].text.trim();
            res.json({ success: true, advice });
        } else {
            console.log("Gemini Coach API Hata Detayı:", JSON.stringify(data));
            throw new Error("API'den geçersiz yanıt alındı.");
        }
    } catch (error) {
        console.error("Gemini API Hatası:", error);
        res.json({
            success: true,
            advice: `Merhaba ${username}! Bugün kendini ${mood || "iyi"} hissettiğini görüyorum. Unutma, gelişim bir süreçtir ve her gün yeni bir başlangıçtır. Bugün hedefin için atacağın ufak bir adım bile yeterlidir. Kendine iyi davran.`
        });
    }
});


// ------------------- AI CHAT ENDPOINT -------------------
app.post("/api/ai-chat", async (req, res) => {
    const { username, message, history } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.json({ 
            success: true, 
            reply: "Merhaba! Sunucuda API anahtarı tanımlanmadığı için şu an sizinle sohbet edemiyorum. Ama hedefleriniz üzerinde çalışmaya devam etmeniz için her zaman buradayım!" 
        });
    }

    const contents = [];
    const systemPrompt = `Sen, GrowMe adında bir kişisel gelişim ve motivasyon uygulamasında uzman bir Kişisel Gelişim Koçusun (AI Coach). 
Kullanıcı adı: ${username}.
Kullanıcının alışkanlık edinme, verimlilik, motivasyon ve kişisel gelişim hakkındaki sorularına samimi, bilgili, pratik ve teşvik edici yanıtlar ver. 
Tavsiyelerin uygulanabilir ve somut adımlar içersin. Yanıtların kısa, öz ve anlaşılır olsun (maksimum 4-5 cümle). Türkçe konuş.`;

    if (history && history.length > 0) {
        history.forEach(msg => {
            contents.push({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            });
        });
    }
    
    const userMessageText = history && history.length > 0 
        ? message 
        : `[Sistem Talimatı: ${systemPrompt}]\n\nKullanıcı Sorusu: ${message}`;
        
    contents.push({
        role: "user",
        parts: [{ text: userMessageText }]
    });

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const reply = data.candidates[0].content.parts[0].text.trim();
            res.json({ success: true, reply });
        } else {
            console.log("Gemini API Hata Detayı:", JSON.stringify(data));
            throw new Error("API'den geçersiz yanıt alındı.");
        }
    } catch (error) {
        console.error("Gemini Chat Hatası:", error);
        res.json({
            success: true,
            reply: "Bağlantı kurarken küçük bir sorun oluştu. Ama unutma, en iyi tavsiye kendi iç sesindir. Bugün hedefin için küçük bir adım atmayı ihmal etme!"
        });
    }
});

// ------------------- AI WEEKLY REPORT ENDPOINT -------------------
app.post("/api/ai-weekly-report", async (req, res) => {
    const { username, goals, pzt, sal, car, per, cum, cmt, paz, total } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.json({ 
            success: true, 
            report: "Yapay zeka koçunuz şu an meşgul. Gelişiminizi sürdürmeye devam edin! 🌸" 
        });
    }

    const systemPrompt = `Sen, GrowMe adında bir kişisel gelişim ve motivasyon uygulamasında profesyonel bir Gelişim Analistisin (AI Coach). 
Kullanıcının haftalık gelişim verilerini ve hedeflerini analiz et.
Kullanıcı adı: ${username}.
Haftalık Performans (Hedefler için harcanan süreler):
- Pazartesi: ${pzt} dakika
- Salı: ${sal} dakika
- Çarşamba: ${car} dakika
- Perşembe: ${per} dakika
- Cuma: ${cum} dakika
- Cumartesi: ${cmt} dakika
- Pazar: ${paz} dakika
Toplam Süre: ${total} dakika.
Kullanıcının Aktif Hedefleri: ${goals && goals.length ? goals.join(", ") : "Henüz hedef eklenmemiş"}

Lütfen kullanıcıya haftalık performansını değerlendiren, hangi günlerde iyi gittiğini ve hangi günlerde desteklenmesi gerektiğini samimi, motive edici ve yapıcı bir dille özetleyen kısa bir haftalık gelişim raporu yaz (maksimum 4-5 cümle). Türkçe yanıt ver.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            }
        );

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const report = data.candidates[0].content.parts[0].text.trim();
            res.json({ success: true, report });
        } else {
            console.log("Gemini Weekly Report Hata Detayı:", JSON.stringify(data));
            throw new Error("API'den geçersiz yanıt alındı.");
        }
    } catch (error) {
        console.error("Gemini Weekly Report Hatası:", error);
        res.json({
            success: true,
            report: "Haftalık rapor oluşturulurken küçük bir sorun yaşandı. Ancak harcadığın her dakika gelişimine katkı sağladı, tebrikler!"
        });
    }
});

// ------------------- SERVER -------------------
const PORT = 3000;
app.listen(PORT, () => console.log("Server çalışıyor: http://localhost:" + PORT));
