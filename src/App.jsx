import { useState, useEffect, useCallback, useMemo } from "react";

/*
 * ═══════════════════════════════════════════════════════════
 *  WEALTHVIEW — Online Investment Portfolio Dashboard
 *  Standalone version for Vercel deployment
 * ═══════════════════════════════════════════════════════════
 */

const C = {
  bg: "#060a10", bg2: "#0c1220", card: "#0f1729", cardHover: "#141e33",
  border: "#1a2540", borderFocus: "#2563eb", borderSubtle: "#111d35",
  text: "#e8ecf4", textSoft: "#8b9dc3", textDim: "#4a5f88",
  blue: "#2563eb", blueGlow: "rgba(37,99,235,0.12)", blueSoft: "#3b82f6",
  green: "#059669", greenLight: "#10b981", greenBg: "rgba(5,150,105,0.08)",
  red: "#dc2626", redLight: "#ef4444", redBg: "rgba(220,38,38,0.08)",
  gold: "#d97706", purple: "#7c3aed", cyan: "#0891b2", pink: "#db2777",
  orange: "#ea580c",
};

const CLASSES = {
  "Ação BR": { color: "#2563eb", icon: "📊" },
  "Ação US": { color: "#7c3aed", icon: "🇺🇸" },
  "FII": { color: "#0891b2", icon: "🏢" },
  "Renda Fixa": { color: "#059669", icon: "🔒" },
  "Cripto": { color: "#d97706", icon: "₿" },
  "ETF": { color: "#db2777", icon: "📈" },
  "BDR": { color: "#ea580c", icon: "🌐" },
  "Outro": { color: "#4a5f88", icon: "📁" },
};

// ─── STORAGE (localStorage for standalone) ───
const DB = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { console.error("Storage error:", e); }
  }
};

// ─── SEED DATA ───
const SEED_CLIENTS = [
  {
    id: "c1", name: "Maria Silva", email: "maria@email.com", pin: "1234", avatar: "MS",
    portfolio: [
      { ticker: "PETR4", name: "Petrobras PN", cls: "Ação BR", qty: 200, avg: 28.5, price: 36.82, chg: 1.2 },
      { ticker: "VALE3", name: "Vale ON", cls: "Ação BR", qty: 150, avg: 62.0, price: 58.45, chg: -0.8 },
      { ticker: "HGLG11", name: "CSHG Logística FII", cls: "FII", qty: 50, avg: 160.0, price: 168.30, chg: 0.3 },
      { ticker: "IVVB11", name: "iShares S&P500 ETF", cls: "ETF", qty: 80, avg: 280.0, price: 312.50, chg: 0.9 },
      { ticker: "IPCA2029", name: "Tesouro IPCA+ 2029", cls: "Renda Fixa", qty: 5, avg: 3200.0, price: 3450.0, chg: 0.05 },
    ],
  },
  {
    id: "c2", name: "João Santos", email: "joao@email.com", pin: "5678", avatar: "JS",
    portfolio: [
      { ticker: "ITUB4", name: "Itaú Unibanco PN", cls: "Ação BR", qty: 300, avg: 24.0, price: 31.20, chg: 0.6 },
      { ticker: "WEGE3", name: "WEG ON", cls: "Ação BR", qty: 100, avg: 35.0, price: 42.80, chg: 1.5 },
      { ticker: "XPML11", name: "XP Malls FII", cls: "FII", qty: 40, avg: 95.0, price: 102.40, chg: -0.2 },
      { ticker: "BTC", name: "Bitcoin", cls: "Cripto", qty: 0.15, avg: 280000, price: 345000, chg: 2.1 },
    ],
  },
  {
    id: "c3", name: "Ana Oliveira", email: "ana@email.com", pin: "9012", avatar: "AO",
    portfolio: [
      { ticker: "BBDC4", name: "Bradesco PN", cls: "Ação BR", qty: 500, avg: 14.0, price: 15.80, chg: -0.4 },
      { ticker: "MXRF11", name: "Maxi Renda FII", cls: "FII", qty: 200, avg: 10.5, price: 10.85, chg: 0.1 },
      { ticker: "AAPL34", name: "Apple BDR", cls: "BDR", qty: 30, avg: 52.0, price: 58.90, chg: 1.8 },
    ],
  },
];

const ADMIN = { id: "admin", name: "Administrador", pin: "0000", role: "admin" };

// ─── BRAPI ───
const fetchQuote = async (ticker) => {
  try {
    const r = await fetch(`https://brapi.dev/api/quote/${ticker}?token=`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.results?.length) {
      const q = d.results[0];
      return { ticker: q.symbol, name: q.shortName || q.longName || q.symbol, price: q.regularMarketPrice, chg: q.regularMarketChangePercent, cls: guessClass(q.symbol, q.currency) };
    }
  } catch {}
  return null;
};

const guessClass = (t, cur) => {
  t = t.toUpperCase();
  if (/11$/.test(t) && !["BOVA11","IVVB11","HASH11","SMAL11"].includes(t)) return "FII";
  if (/3[45]$/.test(t)) return "BDR";
  if (["BOVA11","IVVB11","HASH11","SMAL11"].includes(t)) return "ETF";
  if (cur === "USD") return "Ação US";
  return "Ação BR";
};

// ─── FORMATTERS ───
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtK = (v) => v >= 1e6 ? `R$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `R$${(v/1e3).toFixed(1)}K` : fmt(v);
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const sparkData = () => Array.from({ length: 20 }, (_, i) => 50 + Math.sin(i * 0.5) * 20 + Math.random() * 15);

// ─── SVG ICONS ───
const Ico = ({ path, size = 18, color = C.textSoft, style: s, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s} {...p}>{typeof path === "string" ? <path d={path} /> : path}</svg>
);
const ICONS = {
  home: "M3 9.5L12 3l9 6.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z",
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>,
  plus: "M12 5v14M5 12h14",
  trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></>,
  edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  reset: <><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></>,
};

// ─── SPARKLINE ───
const Spark = ({ data, color, w = 72, h = 28 }) => {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - ((v-mn)/rng)*h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" /></svg>;
};

// ─── DONUT ───
const Donut = ({ segments, size = 180, thick = 28 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return null;
  const r = (size - thick) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={thick} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "all 0.5s ease" }} />;
        off += dash;
        return el;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800" fontFamily="'Outfit',sans-serif">{fmtK(total)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={C.textDim} fontSize="10" fontFamily="'Outfit',sans-serif">TOTAL</text>
    </svg>
  );
};

// ─── BARS ───
const Bars = ({ data, h = 160 }) => {
  const mx = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: h, padding: "0 2px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, color: C.textDim, whiteSpace: "nowrap" }}>{fmtK(d.value)}</span>
          <div style={{ width: "100%", maxWidth: 36, height: Math.max((d.value/mx)*(h-28), 3), background: `linear-gradient(to top, ${d.color}44, ${d.color})`, borderRadius: "4px 4px 0 0", transition: "height 0.4s" }} />
          <span style={{ fontSize: 8, color: C.textDim, textAlign: "center", maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── STYLES ───
const font = "'Outfit', sans-serif";
const S = {
  input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "10px 14px", fontSize: 13, outline: "none", width: "100%", fontFamily: font, transition: "border-color 0.2s" },
  btn: { background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font, display: "inline-flex", alignItems: "center", gap: 7, transition: "all 0.2s" },
  btnGhost: { background: "transparent", color: C.textSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font, transition: "all 0.2s" },
  card: { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 22, marginBottom: 18, transition: "border-color 0.2s" },
  th: { padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}` },
  td: { padding: "13px 14px", borderBottom: `1px solid ${C.borderSubtle}`, fontSize: 13 },
  tag: (color) => ({ background: `${color}14`, color, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.3 }),
};

// ─── LOGIN ───
const Login = ({ onLogin, clients }) => {
  const [step, setStep] = useState("pick");
  const [pin, setPin] = useState("");
  const [selClient, setSelClient] = useState(null);
  const [err, setErr] = useState("");
  const [anim, setAnim] = useState(false);

  useEffect(() => { setTimeout(() => setAnim(true), 50); }, []);

  const doLogin = () => {
    if (step === "admin") {
      if (pin === ADMIN.pin) onLogin({ ...ADMIN });
      else setErr("PIN incorreto");
    } else if (selClient) {
      if (pin === selClient.pin) onLogin({ ...selClient, role: "client" });
      else setErr("PIN incorreto");
    }
  };

  const cardStyle = (delay) => ({
    ...S.card, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, padding: 20, marginBottom: 0,
    opacity: anim ? 1 : 0, transform: anim ? "translateY(0)" : "translateY(12px)",
    transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 30% 20%, #0c1a3a 0%, ${C.bg} 60%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border}22 1px, transparent 1px), linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ width: 440, padding: 40, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 44, opacity: anim ? 1 : 0, transform: anim ? "translateY(0)" : "translateY(-20px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 18, boxShadow: `0 8px 32px ${C.blue}40` }}>W</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: -1, color: C.text }}>WealthView</h1>
          <p style={{ color: C.textSoft, fontSize: 13, margin: "8px 0 0", letterSpacing: 0.5 }}>Gestão de Carteiras de Investimento</p>
        </div>

        {step === "pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={cardStyle(0.1)} onClick={() => setStep("admin")} onMouseEnter={e => e.currentTarget.style.borderColor = C.blue} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>A</div>
              <div><div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Administrador</div><div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>Acesso completo · gerenciar todos os clientes</div></div>
            </div>
            <div style={cardStyle(0.2)} onClick={() => setStep("client")} onMouseEnter={e => e.currentTarget.style.borderColor = C.green} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>C</div>
              <div><div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Cliente</div><div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>Visualizar e editar minha carteira</div></div>
            </div>
          </div>
        )}

        {step === "admin" && (
          <div style={{ opacity: anim ? 1 : 0, transition: "opacity 0.3s" }}>
            <button onClick={() => { setStep("pick"); setPin(""); setErr(""); }} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0, fontFamily: font }}>← Voltar</button>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700 }}>Login Administrador</h3>
            <input type="password" placeholder="Digite o PIN" value={pin} onChange={e => { setPin(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} style={{ ...S.input, marginBottom: 14 }} autoFocus />
            {err && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{err}</p>}
            <button onClick={doLogin} style={{ ...S.btn, width: "100%", justifyContent: "center" }}>Entrar</button>
          </div>
        )}

        {step === "client" && !selClient && (
          <div>
            <button onClick={() => { setStep("pick"); setErr(""); }} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0, fontFamily: font }}>← Voltar</button>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700 }}>Selecione seu perfil</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clients.map((c, i) => (
                <div key={c.id} style={cardStyle(0.05 * i)} onClick={() => setSelClient(c)} onMouseEnter={e => e.currentTarget.style.borderColor = C.green} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.avatar}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: C.textSoft }}>{c.email}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "client" && selClient && (
          <div>
            <button onClick={() => { setSelClient(null); setPin(""); setErr(""); }} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0, fontFamily: font }}>← Voltar</button>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700 }}>Olá, {selClient.name.split(" ")[0]}!</h3>
            <input type="password" placeholder="Digite seu PIN" value={pin} onChange={e => { setPin(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} style={{ ...S.input, marginBottom: 14 }} autoFocus />
            {err && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{err}</p>}
            <button onClick={doLogin} style={{ ...S.btn, width: "100%", justifyContent: "center", background: C.green }}>Entrar</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SIDEBAR ───
const Sidebar = ({ user, view, setView, clients, selId, setSelId, onLogout }) => {
  const isAdmin = user.role === "admin";
  const nav = isAdmin
    ? [{ id: "overview", label: "Visão Geral", icon: ICONS.home }, { id: "clients", label: "Clientes", icon: ICONS.users }, { id: "portfolio", label: "Carteira", icon: ICONS.briefcase }]
    : [{ id: "portfolio", label: "Minha Carteira", icon: ICONS.briefcase }];

  return (
    <div style={{ width: 240, background: "#080d16", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 }}>
      <div style={{ padding: "22px 18px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>W</div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.5 }}>WealthView</span>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "14px 10px" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
            background: view === n.id ? C.blueGlow : "transparent", border: "none", borderRadius: 10,
            color: view === n.id ? C.blueSoft : C.textSoft, cursor: "pointer", fontSize: 13,
            fontWeight: view === n.id ? 600 : 500, fontFamily: font, marginBottom: 2, textAlign: "left", transition: "all 0.15s",
          }}>
            <Ico path={n.icon} size={17} color={view === n.id ? C.blueSoft : C.textDim} /> {n.label}
          </button>
        ))}
        {isAdmin && clients.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, padding: "0 12px" }}>Clientes</span>
            <div style={{ marginTop: 8 }}>
              {clients.map(c => (
                <button key={c.id} onClick={() => { setSelId(c.id); setView("portfolio"); }} style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 12px",
                  background: selId === c.id && view === "portfolio" ? C.blueGlow : "transparent",
                  border: "none", borderRadius: 8, cursor: "pointer", fontFamily: font,
                  color: selId === c.id ? C.text : C.textSoft, fontSize: 12, marginBottom: 1, textAlign: "left", transition: "all 0.15s",
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, fontSize: 9, fontWeight: 700, background: selId === c.id ? `${C.blue}25` : `${C.textDim}15`, color: selId === c.id ? C.blueSoft : C.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.avatar}</div>
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div style={{ padding: "14px 10px 18px", borderTop: `1px solid ${C.border}`, margin: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: isAdmin ? `linear-gradient(135deg, ${C.blue}, ${C.purple})` : `linear-gradient(135deg, ${C.green}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{isAdmin ? "A" : user.avatar}</div>
          <div><div style={{ fontSize: 12, fontWeight: 600 }}>{user.name.split(" ")[0]}</div><div style={{ fontSize: 10, color: C.textDim }}>{isAdmin ? "Admin" : "Cliente"}</div></div>
        </div>
        <button onClick={onLogout} style={{ ...S.btnGhost, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, padding: "7px 10px" }}>
          <Ico path={ICONS.logout} size={13} color={C.textSoft} /> Sair
        </button>
      </div>
    </div>
  );
};

// ─── OVERVIEW ───
const Overview = ({ clients }) => {
  const stats = useMemo(() => {
    let tot = 0, inv = 0, clsMap = {}, top = [];
    clients.forEach(c => c.portfolio.forEach(a => {
      const v = a.qty * a.price, i2 = a.qty * a.avg;
      tot += v; inv += i2;
      clsMap[a.cls] = (clsMap[a.cls] || 0) + v;
      top.push({ ...a, total: v });
    }));
    top.sort((a, b) => b.total - a.total);
    return { tot, inv, ret: tot - inv, retPct: inv ? ((tot - inv) / inv) * 100 : 0, cls: Object.entries(clsMap).map(([n, v]) => ({ n, v, c: CLASSES[n]?.color || C.textDim })), top: top.slice(0, 8), nClients: clients.length, nAssets: new Set(clients.flatMap(c => c.portfolio.map(a => a.ticker))).size };
  }, [clients]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}><h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Visão Geral</h1><p style={{ color: C.textSoft, fontSize: 13, margin: "5px 0 0" }}>Consolidação de todas as carteiras</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { l: "Patrimônio Total", v: fmt(stats.tot), c: C.blue },
          { l: "Rentabilidade", v: `${stats.ret >= 0 ? "+" : ""}${fmt(stats.ret)}`, sub: pct(stats.retPct), c: stats.ret >= 0 ? C.greenLight : C.redLight },
          { l: "Clientes", v: stats.nClients, c: C.purple },
          { l: "Ativos Únicos", v: stats.nAssets, c: C.cyan },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, marginBottom: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${k.c}, transparent)` }} />
            <p style={{ fontSize: 11, color: C.textSoft, margin: "6px 0 7px", fontWeight: 500 }}>{k.l}</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: k.c }}>{k.v}</p>
            {k.sub && <p style={{ fontSize: 11, color: k.c, margin: "3px 0 0", fontWeight: 600 }}>{k.sub}</p>}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
        <div style={S.card}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Alocação por Classe</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Donut segments={stats.cls.map(x => ({ value: x.v, color: x.c }))} size={170} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {stats.cls.map((x, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c, flexShrink: 0 }} />
                  <span style={{ color: C.textSoft, minWidth: 72 }}>{x.n}</span>
                  <span style={{ fontWeight: 600 }}>{((x.v / stats.tot) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Patrimônio por Cliente</h3>
          <Bars data={clients.map(c => ({ label: c.name.split(" ")[0], value: c.portfolio.reduce((s, a) => s + a.qty * a.price, 0), color: C.blue }))} />
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Maiores Posições</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Ativo", "Classe", "Preço", "Variação", "Valor Total"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {stats.top.map((a, i) => (
                <tr key={i} style={{ transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = C.cardHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${CLASSES[a.cls]?.color || C.textDim}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: CLASSES[a.cls]?.color }}>{a.ticker.slice(0, 4)}</div>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{a.ticker}</div><div style={{ fontSize: 10, color: C.textSoft }}>{a.name}</div></div>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.tag(CLASSES[a.cls]?.color || C.textDim)}>{a.cls}</span></td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{fmt(a.price)}</td>
                  <td style={S.td}><span style={{ color: a.chg >= 0 ? C.greenLight : C.redLight, fontWeight: 600, fontSize: 12 }}>{pct(a.chg)}</span></td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{fmt(a.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── CLIENTS ───
const Clients = ({ clients, setClients, onSelect, save }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pin, setPin] = useState("");
  const add = () => {
    if (!name.trim()) return;
    const initials = name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const updated = [...clients, { id: "c" + Date.now(), name: name.trim(), email: email.trim(), pin: pin || "0000", avatar: initials, portfolio: [] }];
    setClients(updated); save(updated);
    setName(""); setEmail(""); setPin(""); setShowAdd(false);
  };
  const remove = (id) => { const updated = clients.filter(c => c.id !== id); setClients(updated); save(updated); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Clientes</h1><p style={{ color: C.textSoft, fontSize: 13, margin: "5px 0 0" }}>{clients.length} cadastrados</p></div>
        <button onClick={() => setShowAdd(true)} style={S.btn}><Ico path={ICONS.plus} size={15} color="#fff" /> Novo Cliente</button>
      </div>
      {showAdd && (
        <div style={{ ...S.card, borderColor: C.blue }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Novo Cliente</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 10, marginBottom: 14 }}>
            <input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} style={S.input} />
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
            <input placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} style={S.input} maxLength={4} />
          </div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={add} style={S.btn}>Adicionar</button><button onClick={() => setShowAdd(false)} style={S.btnGhost}>Cancelar</button></div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {clients.map(c => {
          const tot = c.portfolio.reduce((s, a) => s + a.qty * a.price, 0);
          const inv = c.portfolio.reduce((s, a) => s + a.qty * a.avg, 0);
          const ret = inv ? ((tot - inv) / inv) * 100 : 0;
          return (
            <div key={c.id} style={{ ...S.card, marginBottom: 0, cursor: "pointer", position: "relative" }} onClick={() => onSelect(c.id)} onMouseEnter={e => e.currentTarget.style.borderColor = C.blue} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <button onClick={e => { e.stopPropagation(); remove(c.id); }} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ico path={ICONS.x} size={13} color={C.textDim} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${C.green}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>{c.avatar}</div>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div><div style={{ fontSize: 11, color: C.textSoft }}>{c.email}</div></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>PATRIMÔNIO</div><div style={{ fontSize: 17, fontWeight: 800 }}>{fmt(tot)}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>RETORNO</div><div style={{ fontSize: 15, fontWeight: 700, color: ret >= 0 ? C.greenLight : C.redLight }}>{pct(ret)}</div></div>
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 10 }}>{c.portfolio.length} ativos</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PORTFOLIO ───
const Portfolio = ({ client, updatePortfolio, isAdmin }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [ticker, setTicker] = useState(""); const [name, setName] = useState(""); const [cls, setCls] = useState("Ação BR");
  const [qty, setQty] = useState(""); const [avg, setAvg] = useState(""); const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false); const [editIdx, setEditIdx] = useState(null);

  const p = client.portfolio || [];
  const tot = p.reduce((s, a) => s + a.qty * a.price, 0);
  const inv = p.reduce((s, a) => s + a.qty * a.avg, 0);
  const ret = tot - inv, retPct = inv ? (ret / inv) * 100 : 0;

  const clsBrk = useMemo(() => {
    const m = {};
    p.forEach(a => { m[a.cls] = (m[a.cls] || 0) + a.qty * a.price; });
    return Object.entries(m).map(([n, v]) => ({ n, v, c: CLASSES[n]?.color || C.textDim }));
  }, [p]);

  const sparks = useMemo(() => { const m = {}; p.forEach(a => { m[a.ticker] = sparkData(); }); return m; }, [p.length]);

  const lookup = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    const q = await fetchQuote(ticker.trim().toUpperCase());
    if (q) { setName(q.name); setPrice(String(q.price)); setCls(q.cls); }
    setLoading(false);
  };

  const save = () => {
    if (!ticker.trim() || !qty || !avg) return;
    const asset = { ticker: ticker.trim().toUpperCase(), name: name || ticker.trim().toUpperCase(), cls, qty: parseFloat(qty), avg: parseFloat(avg), price: parseFloat(price) || parseFloat(avg), chg: 0 };
    let updated;
    if (editIdx !== null) { updated = [...p]; updated[editIdx] = asset; } else { updated = [...p, asset]; }
    updatePortfolio(client.id, updated);
    reset();
  };

  const reset = () => { setTicker(""); setName(""); setQty(""); setAvg(""); setPrice(""); setCls("Ação BR"); setShowAdd(false); setEditIdx(null); };
  const startEdit = (i) => { const a = p[i]; setTicker(a.ticker); setName(a.name); setCls(a.cls); setQty(String(a.qty)); setAvg(String(a.avg)); setPrice(String(a.price)); setEditIdx(i); setShowAdd(true); };
  const remove = (i) => updatePortfolio(client.id, p.filter((_, j) => j !== i));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>{isAdmin ? `Carteira · ${client.name}` : "Minha Carteira"}</h1><p style={{ color: C.textSoft, fontSize: 13, margin: "5px 0 0" }}>{p.length} ativos</p></div>
        <button onClick={() => { reset(); setShowAdd(true); }} style={S.btn}><Ico path={ICONS.plus} size={15} color="#fff" /> Adicionar Ativo</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { l: "Patrimônio Total", v: fmt(tot), c: C.blue },
          { l: "Total Investido", v: fmt(inv), c: C.purple },
          { l: "Rentabilidade", v: `${ret >= 0 ? "+" : ""}${fmt(ret)}`, sub: pct(retPct), c: ret >= 0 ? C.greenLight : C.redLight },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, marginBottom: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${k.c}, transparent)` }} />
            <p style={{ fontSize: 11, color: C.textSoft, margin: "6px 0 7px", fontWeight: 500 }}>{k.l}</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: k.c }}>{k.v}</p>
            {k.sub && <p style={{ fontSize: 11, color: k.c, margin: "3px 0 0", fontWeight: 600 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ ...S.card, borderColor: C.blue }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>{editIdx !== null ? "Editar Ativo" : "Adicionar Ativo"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px", gap: 10, marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <input placeholder="Ticker" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onBlur={lookup} onKeyDown={e => e.key === "Enter" && lookup()} style={S.input} />
              {loading && <span style={{ position: "absolute", right: 10, top: 11, fontSize: 11, color: C.textSoft }}>...</span>}
            </div>
            <input placeholder="Nome do ativo" value={name} onChange={e => setName(e.target.value)} style={S.input} />
            <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...S.input, cursor: "pointer" }}>{Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input placeholder="Quantidade" type="number" value={qty} onChange={e => setQty(e.target.value)} style={S.input} />
            <input placeholder="Preço Médio (R$)" type="number" value={avg} onChange={e => setAvg(e.target.value)} style={S.input} />
            <input placeholder="Preço Atual (R$)" type="number" value={price} onChange={e => setPrice(e.target.value)} style={S.input} />
          </div>
          <p style={{ fontSize: 10, color: C.textDim, margin: "0 0 12px" }}>💡 Digite o ticker e tecle Enter para buscar cotação automaticamente</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={S.btn}><Ico path={ICONS.check} size={14} color="#fff" />{editIdx !== null ? "Salvar" : "Adicionar"}</button>
            <button onClick={reset} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {p.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
          <div style={S.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Alocação por Classe</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Donut segments={clsBrk.map(x => ({ value: x.v, color: x.c }))} size={150} thick={24} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {clsBrk.map((x, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: x.c, flexShrink: 0 }} />
                    <span style={{ color: C.textSoft, minWidth: 66 }}>{x.n}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(x.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={S.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Valor por Ativo</h3>
            <Bars data={p.map(a => ({ label: a.ticker, value: a.qty * a.price, color: CLASSES[a.cls]?.color || C.textDim }))} />
          </div>
        </div>
      )}

      {p.length > 0 ? (
        <div style={S.card}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Ativos</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead><tr>{["Ativo", "Classe", "Qtd", "PM", "Atual", "", "Investido", "Atual", "Retorno", ""].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {p.map((a, i) => {
                  const iv = a.qty * a.avg, cv = a.qty * a.price, rt = cv - iv, rp = iv ? (rt / iv) * 100 : 0, pos = rt >= 0;
                  return (
                    <tr key={i} style={{ transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = C.cardHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${CLASSES[a.cls]?.color || C.textDim}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: CLASSES[a.cls]?.color }}>{a.ticker.slice(0, 4)}</div>
                          <div><div style={{ fontWeight: 600 }}>{a.ticker}</div><div style={{ fontSize: 10, color: C.textSoft, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div></div>
                        </div>
                      </td>
                      <td style={S.td}><span style={S.tag(CLASSES[a.cls]?.color || C.textDim)}>{a.cls}</span></td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{a.qty}</td>
                      <td style={S.td}>{fmt(a.avg)}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{fmt(a.price)}</td>
                      <td style={S.td}><Spark data={sparks[a.ticker]} color={pos ? C.greenLight : C.redLight} /></td>
                      <td style={S.td}>{fmt(iv)}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{fmt(cv)}</td>
                      <td style={S.td}>
                        <div><div style={{ fontWeight: 700, color: pos ? C.greenLight : C.redLight, fontSize: 13 }}>{pos ? "+" : ""}{fmt(rt)}</div><div style={{ fontSize: 10, color: pos ? C.greenLight : C.redLight }}>{pct(rp)}</div></div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ico path={ICONS.edit} size={13} color={C.textDim} /></button>
                          <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 3 }}><Ico path={ICONS.trash} size={13} color={C.red} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", padding: 56 }}>
          <Ico path={ICONS.briefcase} size={44} color={C.textDim} style={{ margin: "0 auto 14px", display: "block" }} />
          <h3 style={{ color: C.textSoft, fontWeight: 600, margin: "0 0 6px", fontSize: 16 }}>Carteira vazia</h3>
          <p style={{ color: C.textDim, fontSize: 13, margin: 0 }}>Clique em "Adicionar Ativo" para começar</p>
        </div>
      )}
    </div>
  );
};

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState(() => {
    const stored = DB.load("wv-clients", null);
    if (stored && stored.length > 0) return stored;
    DB.save("wv-clients", SEED_CLIENTS);
    return SEED_CLIENTS;
  });
  const [view, setView] = useState("overview");
  const [selId, setSelId] = useState(() => {
    const stored = DB.load("wv-clients", null);
    return stored?.[0]?.id || SEED_CLIENTS[0].id;
  });

  const saveClients = useCallback((data) => { setClients(data); DB.save("wv-clients", data); }, []);

  const updatePortfolio = useCallback((clientId, portfolio) => {
    const updated = clients.map(c => c.id === clientId ? { ...c, portfolio } : c);
    setClients(updated);
    DB.save("wv-clients", updated);
  }, [clients]);

  const login = (u) => { setUser(u); if (u.role === "admin") setView("overview"); else { setSelId(u.id); setView("portfolio"); } };
  const logout = () => { setUser(null); setView("overview"); };
  const selClient = clients.find(c => c.id === selId) || clients[0];

  if (!user) return <Login onLogin={login} clients={clients} />;
  const isAdmin = user.role === "admin";

  return (
    <div style={{ fontFamily: font, background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      <Sidebar user={user} view={view} setView={setView} clients={clients} selId={selId} setSelId={setSelId} onLogout={logout} />
      <main style={{ flex: 1, padding: "26px 32px", overflowY: "auto", minHeight: "100vh" }}>
        {isAdmin && view === "overview" && <Overview clients={clients} />}
        {isAdmin && view === "clients" && <Clients clients={clients} setClients={setClients} onSelect={id => { setSelId(id); setView("portfolio"); }} save={saveClients} />}
        {view === "portfolio" && selClient && <Portfolio client={selClient} updatePortfolio={updatePortfolio} isAdmin={isAdmin} />}
      </main>
    </div>
  );
}
