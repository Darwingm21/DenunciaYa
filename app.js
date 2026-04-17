const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('database.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret123',
    resave: false,
    saveUninitialized: true
}));

// --- DISEÑO, PERSISTENCIA Y VALIDACIONES ---
const style = `
<style>
    :root { --bg: #0f172a; --card: #1e293b; --primary: #38bdf8; --success: #22c55e; --danger: #ef4444; --warning: #f59e0b; --text: #f1f5f9; --subtext: #94a3b8; }
    body { background: radial-gradient(circle at top, #1e293b, #0f172a); color: var(--text); font-family: 'Segoe UI', sans-serif; margin: 0; min-height: 100vh; }
    .container { width: 95%; max-width: 1400px; margin: 20px auto; padding: 20px; }
    
    /* TARJETA DE DENUNCIA */
    .card { background: var(--card); padding: 25px; margin: 20px 0; border-radius: 16px; border: 1px solid #334155; position: relative; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .card-title { font-size: 1.6rem; font-weight: bold; color: var(--primary); margin: 0; }
    .card-body { font-size: 1.1rem; line-height: 1.6; color: #cbd5e1; margin: 15px 0; }
    .card-meta { font-size: 0.85rem; color: var(--subtext); margin-bottom: 15px; display: block; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    
    /* BOTONES */
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .btn-group { display: flex; gap: 10px; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-weight: bold; color: white; border: none; cursor: pointer; transition: 0.2s; font-size: 0.9rem; text-decoration: none; }
    .btn-primary { background: var(--primary); }
    .btn-danger { background: var(--danger); }
    .btn-success { background: var(--success); }
    .btn-warning { background: var(--warning); color: #000; }
    .btn:disabled { background: #475569; opacity: 0.5; cursor: not-allowed; }

    .vote-btn { background: #334155; min-width: 65px; border: 2px solid transparent; }
    .vote-btn.active-up { border-color: var(--success); background: #064e3b; }
    .vote-btn.active-down { border-color: var(--danger); background: #7f1d1d; }

    /* CONTENEDOR OJITO */
    .password-wrapper { position: relative; width: 100%; margin: 8px 0; }
    .toggle-pass { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--primary); z-index: 10; }

    /* COMENTARIOS */
    .comment-box { background: rgba(15, 23, 42, 0.6); padding: 15px; border-radius: 12px; margin-top: 20px; }
    .comment-item { padding: 12px; border-bottom: 1px solid #334155; margin-bottom: 10px; }
    .reply-item { margin-left: 35px; border-left: 3px solid var(--primary); background: rgba(255,255,255,0.02); border-bottom: none; }
    .comment-author { display: block; font-weight: bold; color: var(--primary); font-size: 0.9rem; }
    .comment-text { display: block; font-size: 1rem; margin: 5px 0; color: #e2e8f0; }
    
    .c-action-bar { display: flex; gap: 8px; align-items: center; margin-top: 5px; }
    .c-vote-btn { background: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; color: #94a3b8; text-decoration: none; border: 1px solid #334155; }
    .c-vote-btn.active-up { border-color: var(--success); color: var(--success); }
    .c-vote-btn.active-down { border-color: var(--danger); color: var(--danger); }
    .reply-link { font-size: 0.75rem; color: var(--subtext); cursor: pointer; text-decoration: underline; }

    .other-comments { display: none; }
    .see-more { color: var(--primary); cursor: pointer; font-size: 0.85rem; font-weight: bold; display: block; margin: 10px 0; text-align: center; background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #334155; }

    input, textarea, select { width: 100%; padding: 12px; margin: 0; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; }
    .req-item { color: var(--danger); font-size: 0.8rem; margin: 2px 0; }
    .req-item.valid { color: var(--success); }
</style>

<script>
    window.addEventListener('scroll', () => localStorage.setItem('scrollPos', window.scrollY));
    window.addEventListener('load', () => {
        const scrollPos = localStorage.getItem('scrollPos');
        if (scrollPos) window.scrollTo({ top: parseInt(scrollPos), behavior: 'instant' });
        
        const openAcords = JSON.parse(localStorage.getItem('openAcords') || "[]");
        openAcords.forEach(id => {
            const el = document.getElementById('other-' + id);
            if (el) el.style.display = "block";
        });
    });

    function togglePass(id) {
        const input = document.getElementById(id);
        if (input) input.type = (input.type === "password" ? "text" : "password");
    }

    function liveValidate() {
        const pass = document.getElementById('regP').value;
        const conf = document.getElementById('confP').value;
        const btn = document.getElementById('regBtn');
        if(!pass || !btn) return;

        const isUpper = (c) => /[A-Z]/.test(c);
        const isSign = (c) => /[!@#$%^&*(),.?":{}|<>]/.test(c);
        const core = pass.length > 2 ? pass.substring(1, pass.length - 1) : "";

        const reqs = {
            len: pass.length >= 8,
            up: isUpper(core),
            num: /[0-9]/.test(pass),
            sign: isSign(core),
            match: pass === conf && pass !== ""
        };

        document.getElementById('r-len').className = reqs.len ? 'req-item valid' : 'req-item';
        document.getElementById('r-up').className = reqs.up ? 'req-item valid' : 'req-item';
        document.getElementById('r-num').className = reqs.num ? 'req-item valid' : 'req-item';
        document.getElementById('r-sign').className = reqs.sign ? 'req-item valid' : 'req-item';
        document.getElementById('r-match').className = reqs.match ? 'req-item valid' : 'req-item';

        btn.disabled = !Object.values(reqs).every(Boolean);
    }

    function showMore(id) {
        const other = document.getElementById('other-' + id);
        const link = document.getElementById('link-' + id);
        let openAcords = JSON.parse(localStorage.getItem('openAcords') || "[]");
        if (other.style.display === "block") {
            other.style.display = "none";
            link.innerText = "Ver más comentarios...";
            openAcords = openAcords.filter(i => i !== id);
        } else {
            other.style.display = "block";
            link.innerText = "Ver menos";
            if(!openAcords.includes(id)) openAcords.push(id);
        }
        localStorage.setItem('openAcords', JSON.stringify(openAcords));
    }

    function toggleReply(cid) {
        const f = document.getElementById('rf-' + cid);
        f.style.display = f.style.display === "none" ? "flex" : "none";
    }
</script>
`;

// --- DB ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, is_admin INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, user_id INTEGER, is_anonymous INTEGER, created_at DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS votes (report_id INTEGER, user_id INTEGER, type TEXT, PRIMARY KEY(report_id, user_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER, user_id INTEGER, parent_id INTEGER DEFAULT NULL, content TEXT, created_at DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS comment_votes (comment_id INTEGER, user_id INTEGER, type TEXT, PRIMARY KEY(comment_id, user_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS support_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, message TEXT, created_at DATETIME)`);
    db.run("INSERT OR IGNORE INTO users (username, password, is_admin) VALUES ('admin', 'Admin@123', 1)");
});

// --- AUTH ---
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/reports');
    const { error, success, locked } = req.query;
    let h = `${style}<div class="container" style="max-width: 450px; margin-top: 80px;">`;
    if (error) h += `<div style="color:var(--danger); text-align:center; margin-bottom:15px;">${error}</div>`;
    if (success) h += `<div style="color:var(--success); text-align:center; margin-bottom:15px;">${success}</div>`;
    
    if (locked === 'true') {
        h += `<div style="background:#450a0a; padding:25px; border-radius:15px; border:1px solid var(--danger);"><h3>⚠️ Bloqueado</h3><form method="POST" action="/contact-support"><input name="support_user" placeholder="Usuario Real" required /><textarea name="support_msg" placeholder="Explica tu caso..." required style="height:100px; margin-top:8px;"></textarea><button class="btn btn-warning" style="width:100%; margin-top:10px;">Enviar</button></form><p style="text-align:center"><a href="/" style="color:white; font-size:0.8rem">Volver</a></p></div>`;
    } else {
        h += `<h2 style="text-align:center">DenunciaYa</h2><form method="POST" action="/login">
            <input name="username" placeholder="Usuario" required style="margin-bottom:8px" />
            <div class="password-wrapper"><input name="password" id="lP" type="password" placeholder="Contraseña" required /><button type="button" class="toggle-pass" onclick="togglePass('lP')">👁️</button></div>
            <button class="btn btn-primary" style="width:100%; margin-top:10px">Entrar</button>
        </form><p style="text-align:center; margin-top:20px">¿Nuevo? <a href="/register" style="color:var(--primary)">Crea una cuenta</a></p>`;
    }
    res.send(h + "</div>");
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.redirect('/?error=Acceso denegado');
        if (user.attempts >= 5) return res.redirect('/?locked=true');
        if (user.password === password) {
            db.run(`UPDATE users SET attempts = 0 WHERE id = ?`, [user.id]);
            req.session.user = user.username; req.session.user_id = user.id; req.session.is_admin = user.is_admin;
            res.redirect('/reports');
        } else {
            db.run(`UPDATE users SET attempts = attempts + 1 WHERE id = ?`, [user.id], () => res.redirect('/?error=Acceso denegado'));
        }
    });
});

app.get('/register', (req, res) => {
    res.send(`${style}<div class="container" style="max-width: 450px; margin-top: 50px;"><h2>Registro</h2>
        <form method="POST" action="/register">
            <input name="username" placeholder="Usuario" required style="margin-bottom:8px" />
            <div class="password-wrapper"><input name="password" id="regP" type="password" placeholder="Contraseña" oninput="liveValidate()" required /><button type="button" class="toggle-pass" onclick="togglePass('regP')">👁️</button></div>
            <div class="password-wrapper"><input name="confirmP" id="confP" type="password" placeholder="Confirmar" oninput="liveValidate()" required /><button type="button" class="toggle-pass" onclick="togglePass('confP')">👁️</button></div>
            <div style="margin:10px 0"><div id="r-len" class="req-item">✖ Mínimo 8 caracteres</div><div id="r-up" class="req-item">✖ Mayúscula interna</div><div id="r-num" class="req-item">✖ Un número</div><div id="r-sign" class="req-item">✖ Signo interno</div><div id="r-match" class="req-item">✖ Coinciden</div></div>
            <button class="btn btn-success" id="regBtn" style="width:100%" disabled>Registrarse</button>
        </form><p style="text-align:center; margin-top:15px"><a href="/" style="color:var(--primary)">Volver</a></p></div>`);
});

app.post('/register', (req, res) => {
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [req.body.username, req.body.password], (err) => {
        if (err) return res.redirect('/register?error=Usuario ya existe');
        res.redirect('/?success=Registro exitoso.');
    });
});

// --- REPORTS ---
app.get('/reports', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { order, start_date, end_date } = req.query;
    let orderBy = "r.created_at DESC";
    if (order === "top") orderBy = "likes DESC";
    if (order === "worst") orderBy = "dislikes DESC";
    if (order === "comments") orderBy = "comment_count DESC";

    let sql = `SELECT r.*, u.username, 
        (SELECT COUNT(*) FROM votes WHERE report_id = r.id AND type = 'up') as likes,
        (SELECT COUNT(*) FROM votes WHERE report_id = r.id AND type = 'down') as dislikes,
        (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comment_count,
        (SELECT type FROM votes WHERE report_id = r.id AND user_id = ?) as user_vote
        FROM reports r LEFT JOIN users u ON r.user_id = u.id WHERE 1=1`;
    
    let params = [req.session.user_id];
    if (start_date) { sql += ` AND r.created_at >= ?`; params.push(start_date + " 00:00:00"); }
    if (end_date) { sql += ` AND r.created_at <= ?`; params.push(end_date + " 23:59:59"); }
    sql += ` ORDER BY ${orderBy}`;

    db.all(sql, params, (err, rows) => {
        let h = `${style}<div class="container"><div class="nav"><h1>Denuncias</h1><div><a href="/report" class="btn btn-success">+ Nueva</a>${req.session.is_admin ? '<a href="/admin/users" class="btn btn-warning" style="margin-left:10px">Admin</a>' : ''}<a href="/logout" class="btn btn-danger" style="margin-left:10px">Salir</a></div></div><form class="card" style="display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap;"><div style="flex:1"><label>Ordenar</label><select name="order"><option value="recent" ${order==='recent'?'selected':''}>Recientes</option><option value="comments" ${order==='comments'?'selected':''}>Más Debate</option><option value="top" ${order==='top'?'selected':''}>Más Likes</option><option value="worst" ${order==='worst'?'selected':''}>Más Dislikes</option></select></div><div style="flex:1"><label>Desde</label><input type="date" name="start_date" value="${start_date||''}"></div><div style="flex:1"><label>Hasta</label><input type="date" name="end_date" value="${end_date||''}"></div><button class="btn btn-primary" style="height:48px">Filtrar</button></form>`;
        rows.forEach(r => {
            const esMio = r.user_id === req.session.user_id || req.session.is_admin;
            h += `<div class="card"><div class="card-header"><h3 class="card-title">${r.title}</h3>${esMio ? `<a href="/delete/${r.id}" class="btn btn-danger">Borrar</a>` : ''}</div><div class="card-body">${r.description}</div><span class="card-meta">Por: <b>${r.username || 'Anónimo'}</b> | ${r.created_at}</span><div class="card-footer"><div class="btn-group"><a href="/vote/${r.id}/up" class="btn vote-btn ${r.user_vote === 'up' ? 'active-up' : ''}">👍 ${r.likes}</a><a href="/vote/${r.id}/down" class="btn vote-btn ${r.user_vote === 'down' ? 'active-down' : ''}">👎 ${r.dislikes}</a></div><span style="color:var(--subtext); font-weight:bold">💬 ${r.comment_count}</span></div><div class="comment-box"><div id="cb-${r.id}">Cargando...</div><form method="POST" action="/comment/${r.id}" style="display:flex; gap:10px; margin-top:15px;"><input name="content" placeholder="Comenta..." required><button class="btn btn-primary">Enviar</button></form></div></div>`;
        });
        h += `<script>${rows.map(r => `fetch('/get-comments/${r.id}').then(res => res.text()).then(data => { document.getElementById('cb-${r.id}').innerHTML = data; });`).join('')}</script></div>`;
        res.send(h);
    });
});

app.get('/get-comments/:id', (req, res) => {
    const user_id = req.session.user_id;
    db.all(`SELECT c.*, u.username, (SELECT COUNT(*) FROM comment_votes WHERE comment_id = c.id AND type = 'up') as lks, (SELECT COUNT(*) FROM comment_votes WHERE comment_id = c.id AND type = 'down') as dlks, (SELECT type FROM comment_votes WHERE comment_id = c.id AND user_id = ?) as my_vote FROM comments c JOIN users u ON c.user_id = u.id WHERE c.report_id = ? ORDER BY c.parent_id ASC, lks DESC`, [user_id, req.params.id], (err, rows) => {
        if (err || rows.length === 0) return res.send("<span style='opacity:0.5'>Sin comentarios aún</span>");
        const main = rows.filter(r => !r.parent_id);
        const repl = rows.filter(r => r.parent_id);
        const renderC = (c, isR = false) => `<div class="comment-item ${isR ? 'reply-item' : ''}"><span class="comment-author">${c.username}</span><span class="comment-text">${c.content}</span><div class="c-action-bar"><a href="/vote-comment/${c.id}/up" class="c-vote-btn ${c.my_vote==='up'?'active-up':''}">👍 ${c.lks}</a><a href="/vote-comment/${c.id}/down" class="c-vote-btn ${c.my_vote==='down'?'active-down':''}">👎 ${c.dlks}</a>${!isR ? `<span class="reply-link" onclick="toggleReply(${c.id})">Responder</span>` : ''}</div><form id="rf-${c.id}" method="POST" action="/comment/${c.report_id}" style="display:none; gap:10px; margin-top:10px;"><input type="hidden" name="parent_id" value="${c.id}"><input name="content" placeholder="Responde..." required style="padding:8px; font-size:0.8rem;"><button class="btn btn-primary" style="padding:5px 10px;">Ok</button></form></div>`;
        let h = renderC(main[0]);
        repl.filter(r => r.parent_id === main[0].id).forEach(r => h += renderC(r, true));
        if (main.length > 1) {
            h += `<div class="see-more" id="link-${req.params.id}" onclick="showMore(${req.params.id})">Ver otros ${main.length - 1} hilos...</div><div class="other-comments" id="other-${req.params.id}">`;
            for (let i = 1; i < main.length; i++) { h += renderC(main[i]); repl.filter(r => r.parent_id === main[i].id).forEach(r => h += renderC(r, true)); }
            h += `</div>`;
        }
        res.send(h);
    });
});

// --- VOTES & ACTIONS ---
app.get('/vote/:id/:type', (req, res) => {
    const { id, type } = req.params;
    db.get(`SELECT * FROM votes WHERE report_id = ? AND user_id = ?`, [id, req.session.user_id], (err, row) => {
        if (row) row.type === type ? db.run(`DELETE FROM votes WHERE report_id = ? AND user_id = ?`, [id, req.session.user_id]) : db.run(`UPDATE votes SET type = ? WHERE report_id = ? AND user_id = ?`, [type, id, req.session.user_id]);
        else db.run(`INSERT INTO votes (report_id, user_id, type) VALUES (?, ?, ?)`, [id, req.session.user_id, type]);
        res.redirect(req.get('Referer') || '/reports');
    });
});

app.get('/vote-comment/:id/:type', (req, res) => {
    const { id, type } = req.params;
    db.get(`SELECT * FROM comment_votes WHERE comment_id = ? AND user_id = ?`, [id, req.session.user_id], (err, row) => {
        if (row) row.type === type ? db.run(`DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?`, [id, req.session.user_id]) : db.run(`UPDATE comment_votes SET type = ? WHERE comment_id = ? AND user_id = ?`, [type, id, req.session.user_id]);
        else db.run(`INSERT INTO comment_votes (comment_id, user_id, type) VALUES (?, ?, ?)`, [id, req.session.user_id, type]);
        res.redirect(req.get('Referer') || '/reports');
    });
});

app.post('/comment/:id', (req, res) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.run(`INSERT INTO comments (report_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?)`, [req.params.id, req.session.user_id, req.body.parent_id || null, req.body.content, now], () => res.redirect(req.get('Referer') || '/reports'));
});

app.get('/admin/users', (req, res) => {
    if (!req.session.is_admin) return res.redirect('/');
    db.all(`SELECT * FROM users`, (err, users) => {
        db.all(`SELECT * FROM support_messages ORDER BY created_at DESC`, (err, msgs) => {
            let h = `${style}<div class="container"><a href="/reports" class="btn btn-outline">← Volver</a><h1>Panel Admin</h1><div class="card"><h3>Buzón</h3><table>`;
            msgs.forEach(m => h += `<tr><td><b>${m.username}</b>: ${m.message}</td><td><a href="/admin/del-msg/${m.id}" class="btn btn-danger">X</a></td></tr>`);
            h += `</table></div><div class="card"><h3>Usuarios</h3><table>`;
            users.forEach(u => { if(u.username!=='admin') h += `<tr><td>${u.username} (${u.attempts})</td><td><a href="/admin/reset/${u.id}" class="btn btn-primary">Reset</a> <a href="/admin/delete-u/${u.id}" class="btn btn-danger">Borrar</a></td></tr>`});
            res.send(h + `</table></div></div>`);
        });
    });
});

app.post('/contact-support', (req, res) => {
    const { support_user, support_msg } = req.body;
    db.get(`SELECT id FROM users WHERE username = ?`, [support_user], (err, user) => {
        if (!user) return res.redirect('/?locked=true&error=Usuario inexistente.');
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        db.run(`INSERT INTO support_messages (username, message, created_at) VALUES (?, ?, ?)`, [support_user, support_msg, now], () => res.redirect('/?success=Enviado.'));
    });
});

app.get('/report', (req, res) => res.send(`${style}<div class="container"><h1>Nueva Denuncia</h1><form method="POST" action="/report" class="card"><input name="title" placeholder="Título" required /><textarea name="description" rows="5" placeholder="Detalles..." required style="margin-top:8px"></textarea><button class="btn btn-primary" style="margin-top:10px">Publicar</button></form></div>`));
app.post('/report', (req, res) => { const now = new Date().toISOString().replace('T', ' ').substring(0, 19); db.run(`INSERT INTO reports (title, description, user_id, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)`, [req.body.title, req.body.description, req.session.user_id, 0, now], () => res.redirect('/reports')); });
app.get('/delete/:id', (req, res) => { db.get(`SELECT * FROM reports WHERE id = ?`, [req.params.id], (err, r) => { if(req.session.is_admin || (r && r.user_id === req.session.user_id)) db.run(`DELETE FROM reports WHERE id = ?`, [req.params.id]); res.redirect('/reports'); }); });
app.get('/admin/reset/:id', (req, res) => { if (req.session.is_admin) db.run(`UPDATE users SET attempts = 0 WHERE id = ?`, [req.params.id], () => res.redirect('/admin/users')); });
app.get('/admin/del-msg/:id', (req, res) => { if (req.session.is_admin) db.run(`DELETE FROM support_messages WHERE id = ?`, [req.params.id], () => res.redirect('/admin/users')); });
app.get('/admin/delete-u/:id', (req, res) => { if (req.session.is_admin) db.serialize(() => { db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]); db.run(`DELETE FROM reports WHERE user_id = ?`, [req.params.id]); }); res.redirect('/admin/users'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
