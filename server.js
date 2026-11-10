// Server Jimpitan: tanpa paket tambahan, cukup Node.js 18+.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const ADMIN = process.env.ADMIN_PASSWORD || "";
const PIN = process.env.PETUGAS_PIN || "";
if (ADMIN.length < 6) { console.error("Isi ADMIN_PASSWORD minimal 6 karakter. Contoh: ADMIN_PASSWORD=sandi-rahasia node server.js"); process.exit(1); }
const SECRET = process.env.SESSION_SECRET || crypto.createHash("sha256").update("jimpitan:" + ADMIN).digest("hex");
const DB = path.join(process.env.DATA_DIR || __dirname, "data.json");
let D = { warga: [], setoran: [], usulan: [] };
try { D = Object.assign(D, JSON.parse(fs.readFileSync(DB, "utf8"))); } catch (e) {}
const save = () => { const t = DB + ".tmp"; fs.writeFileSync(t, JSON.stringify(D)); fs.renameSync(t, DB); };
const newId = () => crypto.randomBytes(6).toString("hex");
const hmac = s => crypto.createHmac("sha256", SECRET).update(s).digest("hex");
const sign = r => { const p = r + "." + (Date.now() + 30 * 864e5); return p + "." + hmac(p); };
const verify = t => {
  if (!t) return null; const a = t.split("."); if (a.length !== 3) return null;
  const x = Buffer.from(a[2]), y = Buffer.from(hmac(a[0] + "." + a[1]));
  if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return null;
  return +a[1] > Date.now() ? a[0] : null;
};
const sess = req => { const m = (req.headers.cookie || "").match(/(?:^|; )sess=([^;]+)/); return m && m[1]; };
const same = (a, b) => crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());
const secure = process.env.HTTPS === "1" ? "; Secure" : "";
const tries = {};
const send = (res, code, obj, h = {}) => { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store", ...h }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(ok => {
  let s = ""; req.on("data", c => { s += c; if (s.length > 1e5) req.destroy(); });
  req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { ok({}); } });
});
const clean = s => String(s || "").trim().slice(0, 80);

http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, "http://x").pathname;
    if (!p.startsWith("/api/")) {
      if (p === "/" || p === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        return res.end(fs.readFileSync(path.join(__dirname, "public", "index.html")));
      }
      res.writeHead(404); return res.end("Tidak ditemukan");
    }
    if (req.method !== "GET" && req.headers["x-requested-with"] !== "jimpitan") return send(res, 403, { error: "ditolak" });

    if (p === "/api/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress, t = tries[ip] = (tries[ip] || []).filter(x => Date.now() - x < 6e5);
      if (t.length >= 10) return send(res, 429, { error: "Terlalu banyak percobaan" });
      const k = String((await readBody(req)).kode || "");
      const role = same(k, ADMIN) ? "owner" : (PIN && same(k, PIN) ? "petugas" : null);
      if (!role) { t.push(Date.now()); return send(res, 401, { error: "Kode salah" }); }
      return send(res, 200, { role }, { "Set-Cookie": "sess=" + sign(role) + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000" + secure });
    }
    if (p === "/api/logout") return send(res, 200, { ok: 1 }, { "Set-Cookie": "sess=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" + secure });

    const role = verify(sess(req));
    if (!role) return send(res, 401, { error: "auth" });
    const owner = role === "owner", seg = p.split("/").slice(2), m = req.method;
    if (p === "/api/state" && m === "GET") return send(res, 200, { role, warga: D.warga, setoran: D.setoran, usulan: D.usulan });

    if (seg[0] === "setoran" && m === "POST") {
      const b = await readBody(req), j = Math.round(+b.jumlah);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.tgl) || !(j > 0 && j <= 1e7) || !D.warga.some(w => w.id === b.warga)) return send(res, 400, { error: "data tidak valid" });
      (owner ? D.setoran : D.usulan).push({ id: newId(), tgl: b.tgl, warga: b.warga, jumlah: j, petugas: clean(b.petugas), ts: Date.now() });
      save(); return send(res, 200, { ok: 1 });
    }
    if (!owner) return send(res, 403, { error: "hanya pemilik" });
    if (seg[0] === "warga" && m === "POST") {
      const n = clean((await readBody(req)).nama);
      if (!n) return send(res, 400, { error: "nama kosong" });
      D.warga.push({ id: newId(), nama: n }); save(); return send(res, 200, { ok: 1 });
    }
    if (seg[0] === "usulan" && seg[2] === "setujui" && m === "POST") {
      const i = D.usulan.findIndex(x => x.id === seg[1]);
      if (i < 0) return send(res, 404, { error: "tidak ada" });
      D.setoran.push(D.usulan.splice(i, 1)[0]); save(); return send(res, 200, { ok: 1 });
    }
    if (["warga", "setoran", "usulan"].includes(seg[0]) && m === "DELETE") {
      D[seg[0]] = D[seg[0]].filter(x => x.id !== seg[1]); save(); return send(res, 200, { ok: 1 });
    }
    return send(res, 404, { error: "tidak ada" });
  } catch (e) { send(res, 500, { error: "galat server" }); }
}).listen(PORT, () => console.log("Jimpitan berjalan di http://localhost:" + PORT));
