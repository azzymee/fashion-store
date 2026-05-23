import { useState, useRef, useCallback, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/* ─── Google Fonts injection ────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("techfit-fonts")) {
  const link = document.createElement("link");
  link.id = "techfit-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy:         "#0f1f45",
  navyMid:      "#162a5c",
  navyLight:    "#1e3a7a",
  gold:         "#c9a84c",
  goldLight:    "#e4c47a",
  cream:        "#faf7f2",
  creamDark:    "#f0ebe0",
  white:        "#ffffff",
  text:         "#0f1f45",
  textMid:      "#4a5568",
  textLight:    "#718096",
  textMuted:    "#a0aec0",
  border:       "#e2ddd4",
  borderLight:  "#ede9e0",
  green:        "#25D366",
  success:      "#1a9e5f",
  error:        "#c0392b",
  shadow:       "rgba(15,31,69,0.10)",
  shadowMd:     "rgba(15,31,69,0.16)",
  shadowLg:     "rgba(15,31,69,0.24)",
};

const F = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'DM Sans', 'Segoe UI', sans-serif",
};

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1,  name: "Bodycon Dress",   price: 4500, category: "Dresses",     image: "/bodycon-dress.jpg",    description: "Sleek & form-fitting for any evening out.",          rating: 4.5, reviews: 128, colors: ["#1a1a1a","#8B4513","#c0392b"] },
  { id: 2,  name: "Floral Gown",     price: 7800, category: "Dresses",     image: "/floral-gown.jpg",      description: "Elegant floral patterns for special occasions.",      rating: 4.7, reviews: 94,  colors: ["#e91e63","#9c27b0","#ffffff"] },
  { id: 3,  name: "Maxi Gown",       price: 6200, category: "Dresses",     image: "/maxi-gown.jpg",        description: "Flowing maxi silhouette, effortlessly chic.",         rating: 4.6, reviews: 77,  colors: ["#2196f3","#009688","#ff5722"] },
  { id: 4,  name: "Midi Skirt",      price: 3200, category: "Bottoms",     image: "/midi-skirt.jpg",       description: "Versatile midi length for work or weekend.",          rating: 4.3, reviews: 56,  colors: ["#607d8b","#795548","#000000"] },
  { id: 5,  name: "Mini Skirt",      price: 2800, category: "Bottoms",     image: "/mini-skirt.jpg",       description: "Bold mini cut, perfect for a night out.",             rating: 4.4, reviews: 88,  colors: ["#f06292","#ba68c8","#4fc3f7"] },
  { id: 6,  name: "Cargo Pants",     price: 4100, category: "Bottoms",     image: "/cargo-pants.jpg",      description: "Utility-meets-style cargo with side pockets.",        rating: 4.2, reviews: 43,  colors: ["#6d4c41","#37474f","#558b2f"] },
  { id: 7,  name: "Wide Leg Pants",  price: 4600, category: "Bottoms",     image: "/wide-leg-pants.jpg",   description: "Relaxed wide-leg cut, tailored finish.",              rating: 4.5, reviews: 61,  colors: ["#ffffff","#212121","#b0bec5"] },
  { id: 8,  name: "Slim Trousers",   price: 3900, category: "Bottoms",     image: "/slim-trousers.jpg",    description: "Sharp slim fit for a polished look.",                 rating: 4.3, reviews: 39,  colors: ["#1a237e","#37474f","#4e342e"] },
  { id: 9,  name: "Polo Shirt",      price: 2500, category: "Tops",        image: "/polo-shirt.jpg",       description: "Classic polo for smart casual days.",                 rating: 4.1, reviews: 72,  colors: ["#ffffff","#1565c0","#2e7d32"] },
  { id: 10, name: "Hoodie",          price: 5500, category: "Tops",        image: "/hoodie.jpg",           description: "Cozy premium hoodie for cool evenings.",              rating: 4.8, reviews: 115, colors: ["#424242","#b71c1c","#1a237e"] },
  { id: 11, name: "Bucket Hat",      price: 1800, category: "Accessories", image: "/bucket-hat.jpg",       description: "Trendy bucket hat to complete any look.",             rating: 4.0, reviews: 34,  colors: ["#f9a825","#1b5e20","#880e4f"] },
  { id: 12, name: "Snapback Cap",    price: 2200, category: "Accessories", image: "/snapback-cap.jpg",     description: "Streetwear snapback with adjustable fit.",            rating: 4.2, reviews: 49,  colors: ["#212121","#c62828","#1565c0"] },
];

const CATEGORIES = ["all", "Tops", "Dresses", "Bottoms", "Accessories"];
const fmt = (n) => `₦${Number(n).toLocaleString()}`;

// ─── Global Styles ────────────────────────────────────────────────────────────
const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${F.body}; background: ${C.cream}; color: ${C.text}; }
  input, button, select, textarea { font-family: inherit; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .fade-up  { animation: fadeUp  0.55s cubic-bezier(.22,.68,0,1.2) both; }
  .fade-in  { animation: fadeIn  0.4s ease both; }
  .card-hover {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .card-hover:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px ${C.shadowMd} !important;
  }
  .btn-primary {
    background: ${C.navy};
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: ${F.body};
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  }
  .btn-primary:hover:not(:disabled) {
    background: ${C.navyLight};
    transform: translateY(-1px);
    box-shadow: 0 6px 20px ${C.shadowMd};
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }
  .btn-ghost {
    background: transparent;
    border: 1.5px solid ${C.border};
    border-radius: 10px;
    color: ${C.textMid};
    font-family: ${F.body};
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }
  .btn-ghost:hover {
    border-color: ${C.navy};
    color: ${C.navy};
    background: rgba(15,31,69,0.04);
  }
  input:focus, textarea:focus {
    outline: none;
    border-color: ${C.navyLight} !important;
    box-shadow: 0 0 0 3px rgba(30,58,122,0.12);
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.creamDark}; }
  ::-webkit-scrollbar-thumb { background: ${C.navyLight}; border-radius: 3px; }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById("techfit-styles")) return;
    const s = document.createElement("style");
    s.id = "techfit-styles";
    s.textContent = globalStyle;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ─── Shared Input Style ───────────────────────────────────────────────────────
const INP = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "10px",
  border: `1.5px solid ${C.border}`,
  background: C.white,
  color: C.text,
  fontSize: "14px",
  fontWeight: "400",
  transition: "border-color 0.2s",
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, size = 12 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
      <span style={{ color: C.gold, fontSize: size, letterSpacing: "-1px" }}>
        {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
      </span>
      <span style={{ color: C.textMuted, fontSize: size - 1, fontWeight: 500 }}>{rating}</span>
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div className="fade-in" style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: type === "error" ? C.error : C.navy,
      color: "#fff", padding: "13px 22px", borderRadius: "12px",
      fontWeight: 600, fontSize: "14px",
      boxShadow: `0 8px 28px ${C.shadowLg}`,
      display: "flex", alignItems: "center", gap: "8px",
      fontFamily: F.body,
    }}>
      <span>{type === "error" ? "⚠️" : "✓"}</span> {msg}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function GoldDivider({ style }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px", ...style,
    }}>
      <div style={{ flex: 1, height: "1px", background: C.border }} />
      <div style={{ width: "6px", height: "6px", background: C.gold, borderRadius: "50%", transform: "rotate(45deg)" }} />
      <div style={{ flex: 1, height: "1px", background: C.border }} />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function PageWrapper({ children, style }) {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px", ...style }}>
      {children}
    </div>
  );
}

// ─── Page Title ───────────────────────────────────────────────────────────────
function PageTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <h2 className="fade-up" style={{
        fontFamily: F.display, fontSize: "clamp(26px,4vw,38px)",
        fontWeight: 700, color: C.navy, lineHeight: 1.15, marginBottom: "8px",
      }}>{title}</h2>
      {subtitle && (
        <p className="fade-up" style={{
          fontSize: "15px", color: C.textMid, fontWeight: 400,
          animationDelay: "0.1s",
        }}>{subtitle}</p>
      )}
      <GoldDivider style={{ marginTop: "16px", maxWidth: "200px" }} />
    </div>
  );
}

// ─── Back Button ─────────────────────────────────────────────────────────────
function BackBtn({ onClick, label = "← Back" }) {
  return (
    <button onClick={onClick} className="btn-ghost" style={{
      padding: "9px 18px", fontSize: "13px", marginBottom: "28px",
      display: "inline-flex", alignItems: "center", gap: "6px",
    }}>{label}</button>
  );
}

// ─── TryOn Canvas (AI Pose Detection) ────────────────────────────────────────
function TryOnCanvas({ userPhoto, productImage, category }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!userPhoto || !productImage) return;
    runDetection();
  }, [userPhoto, productImage]);

  const runDetection = async () => {
    setStatus("loading");
    try {
      const tf = window.tf;
      const poseDetection = window.poseDetection;
      if (!tf || !poseDetection) throw new Error("TF not loaded");
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      const userImg = new Image();
      userImg.crossOrigin = "anonymous";
      userImg.src = userPhoto;
      await new Promise(r => { userImg.onload = r; userImg.onerror = r; });
      const canvas = canvasRef.current;
      canvas.width = userImg.naturalWidth || 400;
      canvas.height = userImg.naturalHeight || 500;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
      setStatus("detecting");
      const poses = await detector.estimatePoses(canvas);
      const clothImg = new Image();
      clothImg.crossOrigin = "anonymous";
      clothImg.src = productImage;
      await new Promise(r => { clothImg.onload = r; clothImg.onerror = r; });
      const W = canvas.width, H = canvas.height;
      let x, y, w, h;
      const cat = category?.toLowerCase() || "tops";
      if (poses.length > 0) {
        const kp = {};
        poses[0].keypoints.forEach(k => { kp[k.name] = k; });
        if (cat === "accessories") {
          const nose = kp["nose"];
          w = W * 0.4; h = H * 0.2;
          x = nose?.score > 0.3 ? nose.x - w / 2 : W * 0.3;
          y = nose?.score > 0.3 ? nose.y - h * 1.4 : 0;
        } else if (cat === "tops") {
          const ls = kp["left_shoulder"], rs = kp["right_shoulder"];
          if (ls?.score > 0.3 && rs?.score > 0.3) {
            const sw = Math.abs(rs.x - ls.x);
            w = sw * 1.5; x = Math.min(ls.x, rs.x) - sw * 0.25;
            y = Math.min(ls.y, rs.y) - sw * 0.3; h = sw * 1.6;
          } else { x = W * 0.1; y = H * 0.15; w = W * 0.8; h = H * 0.45; }
        } else if (cat === "dresses") {
          const ls = kp["left_shoulder"], rs = kp["right_shoulder"];
          if (ls?.score > 0.3 && rs?.score > 0.3) {
            const sw = Math.abs(rs.x - ls.x);
            w = sw * 1.6; x = Math.min(ls.x, rs.x) - sw * 0.3;
            y = Math.min(ls.y, rs.y) - sw * 0.25; h = H - y - H * 0.05;
          } else { x = W * 0.1; y = H * 0.12; w = W * 0.8; h = H * 0.82; }
        } else if (cat === "bottoms") {
          const lh = kp["left_hip"], rh = kp["right_hip"];
          if (lh?.score > 0.3 && rh?.score > 0.3) {
            const hw = Math.abs(rh.x - lh.x);
            w = hw * 1.8; x = Math.min(lh.x, rh.x) - hw * 0.4;
            y = Math.min(lh.y, rh.y) - hw * 0.2; h = H - y - H * 0.05;
          } else { x = W * 0.1; y = H * 0.45; w = W * 0.8; h = H * 0.5; }
        }
      } else { x = W * 0.1; y = H * 0.15; w = W * 0.8; h = H * 0.5; }
      ctx.save(); ctx.globalAlpha = 0.88;
      ctx.drawImage(clothImg, x, y, w, h);
      ctx.restore();
      setStatus("done");
      detector.dispose();
    } catch (err) {
      console.error(err);
      setStatus("fallback");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const userImg = new Image();
      userImg.src = userPhoto;
      await new Promise(r => { userImg.onload = r; });
      canvas.width = userImg.naturalWidth || 400;
      canvas.height = userImg.naturalHeight || 500;
      ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
      const clothImg = new Image();
      clothImg.crossOrigin = "anonymous";
      clothImg.src = productImage;
      await new Promise(r => { clothImg.onload = r; });
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.drawImage(clothImg, canvas.width * 0.1, canvas.height * 0.15, canvas.width * 0.8, canvas.height * 0.5);
      ctx.restore();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "370px" }}>
      {(status === "loading" || status === "detecting") && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(250,247,242,0.94)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 20, borderRadius: "16px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            border: `3px solid ${C.border}`,
            borderTopColor: C.navy,
            animation: "spin 0.8s linear infinite",
            marginBottom: "14px",
          }} />
          <div style={{ fontWeight: 600, color: C.navy, fontSize: "14px" }}>
            {status === "loading" ? "Loading AI Model…" : "Detecting pose…"}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{
        width: "100%", height: "450px", objectFit: "cover",
        borderRadius: "16px", border: `1.5px solid ${C.border}`,
        display: "block", background: C.creamDark,
      }} />
      {status === "done" && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: C.success, color: "#fff",
          padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
          whiteSpace: "nowrap",
        }}>✓ AI Try-On Complete</div>
      )}
      {status === "fallback" && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,31,69,0.82)", color: "#fff",
          padding: "5px 16px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
          whiteSpace: "nowrap",
        }}>Preview Mode</div>
      )}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handle = async () => {
    if (!form.email || !form.password) { setError("Please fill all fields"); return; }
    if (mode === "signup" && !form.name) { setError("Please enter your name"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { displayName: form.name });
        onLogin({ name: form.name, email: form.email, uid: cred.user.uid });
      } else {
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
        onLogin({ name: cred.user.displayName || form.email.split("@")[0], email: form.email, uid: cred.user.uid });
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Email already registered. Please sign in.");
      else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") setError("Wrong email or password.");
      else if (err.code === "auth/user-not-found") setError("No account found. Please sign up.");
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!form.email) { setError("Enter your email first"); return; }
    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetSent(true); setError("");
    } catch { setError("Could not send reset email."); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 50%, #0a1428 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: F.body,
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{ position:"absolute", top:"-120px", right:"-80px", width:"400px", height:"400px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.15)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"-60px", right:"-20px", width:"260px", height:"260px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.10)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-100px", left:"-60px", width:"300px", height:"300px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.08)`, pointerEvents:"none" }} />

      <div className="fade-up" style={{
        background: C.white, borderRadius: "20px", padding: "44px 40px",
        width: "100%", maxWidth: "420px",
        boxShadow: `0 32px 80px rgba(0,0,0,0.35)`,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/unilorin-logo.png" alt="Unilorin"
            style={{ height: "48px", display: "block", margin: "0 auto 16px" }}
            onError={e => (e.target.style.display = "none")} />
          <h1 style={{ fontFamily: F.display, fontSize: "32px", fontWeight: 700, color: C.navy, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            TechFit
          </h1>
          <p style={{ color: C.textMuted, fontSize: "13px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            University of Ilorin · Fashion Store
          </p>
          <GoldDivider style={{ marginTop: "16px" }} />
        </div>

        {/* Toggle */}
        <div style={{
          display: "flex", background: C.creamDark, borderRadius: "12px",
          padding: "4px", marginBottom: "24px",
        }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setResetSent(false); }} style={{
              flex: 1, padding: "10px", borderRadius: "9px", border: "none",
              background: mode === m ? C.navy : "transparent",
              color: mode === m ? "#fff" : C.textMuted,
              fontWeight: mode === m ? 600 : 400,
              cursor: "pointer", fontSize: "14px",
              transition: "all 0.2s", fontFamily: F.body,
            }}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <input placeholder="Full Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} style={INP} />
          )}
          <input placeholder="Email address" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} style={INP} type="email" />
          <input placeholder="Password (min 6 characters)" type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} style={INP}
            onKeyDown={e => e.key === "Enter" && handle()} />
        </div>

        {mode === "login" && (
          <button onClick={handleForgotPassword} style={{
            background: "none", border: "none", color: C.navyLight,
            fontSize: "13px", cursor: "pointer", textAlign: "right",
            width: "100%", marginTop: "8px", fontFamily: F.body, fontWeight: 500,
          }}>Forgot password?</button>
        )}

        {resetSent && (
          <div style={{ color: C.success, fontSize: "13px", marginTop: "10px", background: "#eafaf3", padding: "10px 14px", borderRadius: "8px", border: `1px solid #b7e4cf` }}>
            ✓ Reset link sent — check your inbox.
          </div>
        )}
        {error && (
          <div style={{ color: C.error, fontSize: "13px", marginTop: "10px", background: "#fdf0f0", padding: "10px 14px", borderRadius: "8px", border: `1px solid #f5c6cb` }}>
            {error}
          </div>
        )}

        <button onClick={handle} disabled={loading} className="btn-primary" style={{
          width: "100%", padding: "14px", marginTop: "20px",
          fontSize: "15px", fontWeight: 700, borderRadius: "12px",
          opacity: loading ? 0.7 : 1, letterSpacing: "0.2px",
        }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <button onClick={() => onLogin({ name: "Guest", email: "guest@techfit.com", uid: "guest" })}
            style={{
              background: "none", border: "none", color: C.textMuted,
              fontSize: "13px", cursor: "pointer", fontFamily: F.body,
              textDecoration: "underline",
            }}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order History ────────────────────────────────────────────────────────────
function OrderHistory({ user, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || user.uid === "guest") { setLoading(false); return; }
    (async () => {
      try {
        const q = query(collection(db, "orders"), where("userId","==",user.uid), orderBy("createdAt","desc"));
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [user]);

  const shareOrder = (order) => {
    const items = order.items?.map(i => `• ${i.name} x${i.qty} — ${fmt(i.price * i.qty)}`).join("\n");
    const msg = `🛍️ *My TechFit Order*\nOrder: #${order.id.slice(-6).toUpperCase()}\n\n${items}\n\n*Total: ${fmt(order.total)}*\n\nShop at TechFit 👗`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <PageWrapper>
      <BackBtn onClick={onBack} />
      <PageTitle title="Order History" subtitle="A record of all your TechFit purchases." />

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.textMuted, fontSize: "15px" }}>Loading orders…</div>
      ) : user.uid === "guest" ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🔐</div>
          <h3 style={{ fontFamily: F.display, color: C.navy, marginBottom: "8px" }}>Sign in to view orders</h3>
          <p style={{ color: C.textLight }}>Guest accounts do not have order history.</p>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>📦</div>
          <h3 style={{ fontFamily: F.display, color: C.navy, marginBottom: "8px" }}>No orders yet</h3>
          <p style={{ color: C.textLight }}>Start shopping to see your orders here!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map(order => (
            <div key={order.id} className="card-hover" style={{
              background: C.white, borderRadius: "16px", padding: "24px",
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: `0 2px 12px ${C.shadow}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ fontFamily: F.display, fontWeight: 700, color: C.navy, fontSize: "16px" }}>
                    Order #{order.id.slice(-6).toUpperCase()}
                  </div>
                  <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
                    {order.createdAt?.toDate?.()?.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }) || "Recent"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: F.display, fontWeight: 700, color: C.navy, fontSize: "18px" }}>{fmt(order.total)}</div>
                  <span style={{ fontSize: "11px", background: "#eafaf3", color: C.success, padding: "3px 10px", borderRadius: "20px", fontWeight: 700, display: "inline-block", marginTop: "4px" }}>✓ Confirmed</span>
                </div>
              </div>
              <GoldDivider style={{ marginBottom: "14px" }} />
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: C.textMid, padding: "5px 0", borderBottom: i < order.items.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              <div style={{ marginTop: "14px", fontSize: "12px", color: C.textMuted }}>
                📍 {order.address} &nbsp;·&nbsp; 📞 {order.phone}
              </div>
              <button onClick={() => shareOrder(order)} style={{
                marginTop: "14px", padding: "8px 20px", background: C.green,
                border: "none", borderRadius: "8px", color: "#fff",
                fontWeight: 700, fontSize: "13px", cursor: "pointer",
                fontFamily: F.body,
              }}>📱 Share on WhatsApp</button>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ onShop, user }) {
  return (
    <div style={{ fontFamily: F.body }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 55%, #0a1428 100%)`,
        minHeight: "92vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center",
        position: "relative", overflow: "hidden",
        padding: "80px 24px 60px",
      }}>
        {/* Decorative rings */}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"700px", height:"700px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.08)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"500px", height:"500px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.10)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"300px", height:"300px", borderRadius:"50%", border:`1px solid rgba(201,168,76,0.14)`, pointerEvents:"none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: "640px" }}>
          <img src="/unilorin-logo.png" alt="Unilorin"
            style={{ height: "56px", display: "block", margin: "0 auto 28px" }}
            onError={e => (e.target.style.display = "none")} />

          <div className="fade-up" style={{ display: "inline-block", background: "rgba(201,168,76,0.15)", border: `1px solid rgba(201,168,76,0.35)`, borderRadius: "20px", padding: "5px 18px", marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", color: C.goldLight, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Nigeria's Premier Fashion Destination
            </span>
          </div>

          <h1 className="fade-up" style={{
            fontFamily: F.display,
            fontSize: "clamp(48px, 8vw, 80px)",
            fontWeight: 900, color: C.white,
            lineHeight: 1.08, margin: "0 0 8px",
            letterSpacing: "-1.5px",
            animationDelay: "0.1s",
          }}>
            Tech<span style={{ color: C.gold }}>Fit</span>
          </h1>

          {user && user.uid !== "guest" && (
            <p className="fade-up" style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", marginBottom: "8px", animationDelay: "0.15s" }}>
              Welcome back, <strong style={{ color: C.goldLight }}>{user.name}</strong>
            </p>
          )}

          <p className="fade-up" style={{
            fontSize: "17px", color: "rgba(255,255,255,0.65)",
            lineHeight: 1.75, margin: "16px auto 36px",
            maxWidth: "480px", animationDelay: "0.2s",
          }}>
            Shop the latest styles with confidence — try on any garment virtually before you buy.
          </p>

          <div className="fade-up" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", animationDelay: "0.28s" }}>
            <button onClick={onShop} className="btn-primary" style={{
              padding: "15px 40px", fontSize: "15px", fontWeight: 700,
              borderRadius: "12px", letterSpacing: "0.3px",
              background: C.gold, color: C.navy,
            }}>
              Shop the Collection
            </button>
            <button onClick={onShop} className="btn-ghost" style={{
              padding: "15px 32px", fontSize: "15px", fontWeight: 600,
              borderRadius: "12px", borderColor: "rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.85)",
            }}>
              Try On Virtually →
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        background: C.white,
        borderBottom: `1px solid ${C.borderLight}`,
        padding: "0",
      }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        }}>
          {[
            ["500+",  "Products",   "🧥"],
            ["50k+",  "Customers",  "👥"],
            ["4.8★",  "Rating",     "⭐"],
            ["Free",  "Returns",    "📦"],
          ].map(([v, l, icon]) => (
            <div key={l} style={{
              textAlign: "center", padding: "28px 16px",
              borderRight: `1px solid ${C.borderLight}`,
            }}>
              <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
              <div style={{ fontFamily: F.display, fontSize: "24px", fontWeight: 700, color: C.navy, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature strip */}
      <div style={{ background: C.creamDark, padding: "48px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "24px" }}>
          {[
            { icon:"🤖", title:"AI Virtual Try-On",      desc:"See exactly how a garment looks on your body before purchasing." },
            { icon:"🚚", title:"Free Nationwide Delivery",desc:"Complimentary delivery on every order, anywhere in Nigeria." },
            { icon:"↩️", title:"Hassle-Free Returns",     desc:"Not happy? Return any item within 30 days, no questions asked." },
            { icon:"🔒", title:"Secure Payments",         desc:"Card, bank transfer, or cash on delivery — all fully protected." },
          ].map(f => (
            <div key={f.title} className="card-hover" style={{
              background: C.white, borderRadius: "16px", padding: "28px 24px",
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: `0 2px 10px ${C.shadow}`,
            }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
              <div style={{ fontFamily: F.display, fontSize: "16px", fontWeight: 700, color: C.navy, marginBottom: "6px" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shop Page ────────────────────────────────────────────────────────────────
function ShopPage({ cart, setCart, onTryOn }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [added, setAdded] = useState(null);

  const filtered = PRODUCTS.filter(p =>
    (category === "all" || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const e = prev.find(i => i.id === product.id);
      if (e) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    setAdded(product.id);
    setTimeout(() => setAdded(null), 1500);
  };

  const shareProduct = (product) => {
    const msg = `👗 Check out *${product.name}* on TechFit!\nPrice: ${fmt(product.price)}\n\nShop now 🛒`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <PageWrapper>
      <PageTitle title="Our Collection" subtitle="Discover premium fashion curated for the modern Nigerian." />

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: "15px", pointerEvents: "none" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ ...INP, paddingLeft: "38px", width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: "10px 18px", borderRadius: "10px",
              border: category === cat ? `2px solid ${C.navy}` : `1.5px solid ${C.border}`,
              background: category === cat ? C.navy : C.white,
              color: category === cat ? "#fff" : C.textMid,
              cursor: "pointer", fontSize: "13px", fontWeight: category === cat ? 700 : 500,
              textTransform: "capitalize", fontFamily: F.body,
              transition: "all 0.2s",
            }}>
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: "24px" }}>
        {filtered.map((product, i) => (
          <div key={product.id} className="card-hover fade-up" style={{
            background: C.white, borderRadius: "18px",
            border: `1.5px solid ${C.borderLight}`, overflow: "hidden",
            boxShadow: `0 2px 12px ${C.shadow}`,
            animationDelay: `${i * 0.04}s`,
          }}>
            {/* Image area */}
            <div style={{ height: "210px", position: "relative", overflow: "hidden", background: C.creamDark }}>
              <img src={product.image} alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                onMouseEnter={e => (e.target.style.transform = "scale(1.06)")}
                onMouseLeave={e => (e.target.style.transform = "scale(1)")} />
              <div style={{
                position: "absolute", top: "10px", right: "10px",
                background: C.navy, borderRadius: "6px",
                padding: "3px 10px", fontSize: "10px", fontWeight: 700,
                color: "#fff", letterSpacing: "0.8px", textTransform: "uppercase",
              }}>{product.category}</div>
              <button onClick={() => shareProduct(product)} style={{
                position: "absolute", top: "10px", left: "10px",
                background: C.green, border: "none", borderRadius: "8px",
                padding: "5px 9px", cursor: "pointer", fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }} title="Share on WhatsApp">📱</button>
            </div>

            <div style={{ padding: "18px" }}>
              <h3 style={{ fontFamily: F.display, margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: C.navy }}>{product.name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <StarRating rating={product.rating} />
                <span style={{ fontSize: "11px", color: C.textMuted }}>({product.reviews})</span>
              </div>
              <p style={{ fontSize: "12px", color: C.textMid, margin: "0 0 12px", lineHeight: 1.6 }}>{product.description}</p>
              <div style={{ display: "flex", gap: "6px", margin: "0 0 14px" }}>
                {product.colors.map(c => (
                  <div key={c} style={{ width: "16px", height: "16px", borderRadius: "50%", background: c, border: `2px solid ${C.borderLight}` }} />
                ))}
              </div>
              <div style={{ fontFamily: F.display, fontSize: "20px", fontWeight: 700, color: C.navy, marginBottom: "14px" }}>{fmt(product.price)}</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => addToCart(product)} className="btn-primary" style={{
                  flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600,
                  borderRadius: "10px",
                  background: added === product.id ? C.success : C.navy,
                }}>
                  {added === product.id ? "✓ Added!" : "Add to Cart"}
                </button>
                <button onClick={() => onTryOn(product)} className="btn-ghost" style={{
                  padding: "10px 14px", fontSize: "13px", fontWeight: 600,
                  borderRadius: "10px", color: C.navy, borderColor: C.navy,
                }}>Try On</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

// ─── Try-On Page ──────────────────────────────────────────────────────────────
function TryOnPage({ product, onBack, onAddToCart }) {
  const [userPhoto, setUserPhoto] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUserPhoto(file);
    setUserPhotoPreview(URL.createObjectURL(file));
    setResultImage(null);
    setError(null);
  };

  const handleTryOn = async () => {
    if (!userPhoto || !product?.image) return;
    setLoading(true); setError(null);
    try {
      const garmentResponse = await fetch(product.image);
      const garmentBlob = await garmentResponse.blob();
      const garmentFile = new File([garmentBlob], "garment.jpg", { type: garmentBlob.type });
      const formData = new FormData();
      formData.append("human", userPhoto);
      formData.append("garment", garmentFile);
      const response = await fetch("/api/virtual-tryon", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Try-on failed");
      setResultImage(data.outputImage?.url || data.outputImage);
    } catch (err) {
      setError("Try-on failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <BackBtn onClick={onBack} label="← Back to Shop" />
      <PageTitle title="Virtual Try-On" subtitle={`See how ${product?.name} looks on you before you buy.`} />

      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
        {/* Upload column */}
        <div style={{ flex: "1 1 300px" }}>
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "10px", padding: "32px 20px",
            background: C.white, border: `2px dashed ${C.border}`,
            borderRadius: "16px", cursor: "pointer",
            transition: "border-color 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
            <div style={{ fontSize: "36px" }}>📷</div>
            <div style={{ fontFamily: F.display, fontWeight: 700, color: C.navy, fontSize: "16px" }}>Upload Your Photo</div>
            <div style={{ fontSize: "13px", color: C.textMuted, textAlign: "center", lineHeight: 1.6 }}>
              Stand straight, plain background,<br />good lighting for best results.
            </div>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          </label>

          {userPhotoPreview && (
            <div style={{ marginTop: "16px", borderRadius: "14px", overflow: "hidden", border: `1.5px solid ${C.border}` }}>
              <img src={userPhotoPreview} alt="Your photo" style={{ width: "100%", display: "block" }} />
            </div>
          )}
        </div>

        {/* Garment + result column */}
        <div style={{ flex: "1 1 300px" }}>
          {product?.image && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.textMuted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Garment</div>
              <div style={{ borderRadius: "14px", overflow: "hidden", border: `1.5px solid ${C.border}`, maxWidth: "280px" }}>
                <img src={product.image} alt="Garment" style={{ width: "100%", display: "block" }} />
              </div>
            </div>
          )}

          {userPhoto && (
            <button onClick={handleTryOn} disabled={loading} className="btn-primary" style={{
              padding: "13px 32px", fontSize: "14px", fontWeight: 700,
              borderRadius: "12px", marginBottom: "16px",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "⏳ Generating… (30–60s)" : "✨ Generate AI Try-On"}
            </button>
          )}

          {error && (
            <div style={{ background: "#fdf0f0", padding: "14px 16px", borderRadius: "12px", border: `1px solid #f5c6cb`, marginBottom: "16px" }}>
              <div style={{ color: C.error, fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>⚠️ Try-On Unavailable</div>
              <div style={{ color: C.textMid, fontSize: "13px", lineHeight: 1.6 }}>
                The AI service is temporarily busy. Please wait a few minutes and try again.
              </div>
            </div>
          )}

          {resultImage && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.textMuted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Your Result</div>
              <img src={resultImage} alt="Try-on result" style={{
                width: "100%", maxWidth: "350px", borderRadius: "14px",
                display: "block", border: `1.5px solid ${C.border}`,
              }} />
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a href={resultImage} download="tryon-result.jpg" className="btn-primary" style={{
                  padding: "10px 20px", fontSize: "13px", fontWeight: 700,
                  borderRadius: "10px", textDecoration: "none", display: "inline-block",
                  background: C.navy, color: "#fff",
                }}>💾 Save Image</a>
                <button onClick={() => onAddToCart && onAddToCart(product)} className="btn-primary" style={{
                  padding: "10px 20px", fontSize: "13px", fontWeight: 700,
                  borderRadius: "10px", background: C.success,
                }}>🛒 Add to Cart</button>
                <button onClick={() => window.open(`https://wa.me/?text=Check%20out%20my%20virtual%20try-on!%20${encodeURIComponent(resultImage)}`, "_blank")}
                  style={{
                    padding: "10px 20px", background: C.green, color: "#fff",
                    border: "none", borderRadius: "10px", cursor: "pointer",
                    fontSize: "13px", fontWeight: 700, fontFamily: F.body,
                  }}>📱 Share</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
function CartPage({ cart, setCart, onCheckout, onBack }) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const updateQty = (id, delta) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));

  if (cart.length === 0) return (
    <PageWrapper>
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🛒</div>
        <h2 style={{ fontFamily: F.display, color: C.navy, marginBottom: "10px" }}>Your cart is empty</h2>
        <p style={{ color: C.textLight, marginBottom: "24px" }}>Add some items from the shop!</p>
        <button onClick={onBack} className="btn-primary" style={{ padding: "12px 28px", fontSize: "14px", fontWeight: 600, borderRadius: "10px" }}>← Back to Shop</button>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <BackBtn onClick={onBack} />
      <PageTitle title={`Your Cart`} subtitle={`${cart.reduce((s,i)=>s+i.qty,0)} item${cart.reduce((s,i)=>s+i.qty,0)===1?"":'s'} ready for checkout`} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(340px,100%)", gap: "28px", alignItems: "start" }}>
        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {cart.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: "16px",
              background: C.white, borderRadius: "14px", padding: "16px",
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: `0 2px 8px ${C.shadow}`,
            }}>
              <div style={{ width: "68px", height: "68px", borderRadius: "12px", overflow: "hidden", flexShrink: 0 }}>
                <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "15px", color: C.navy }}>{item.name}</div>
                <div style={{ color: C.gold, fontWeight: 700, fontSize: "14px", marginTop: "2px" }}>{fmt(item.price)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {["-","qty","+"].map((v,idx) => v === "qty"
                  ? <span key="qty" style={{ fontWeight: 700, minWidth: "24px", textAlign: "center", color: C.navy, fontSize: "15px" }}>{item.qty}</span>
                  : <button key={v} onClick={() => updateQty(item.id, v==="-"?-1:1)} style={{
                      width: "30px", height: "30px", borderRadius: "8px",
                      border: `1.5px solid ${C.border}`, background: C.creamDark,
                      color: C.navy, cursor: "pointer", fontSize: "16px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{v}</button>
                )}
              </div>
              <div style={{ fontFamily: F.display, fontWeight: 700, color: C.navy, minWidth: "90px", textAlign: "right", fontSize: "15px" }}>{fmt(item.price * item.qty)}</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: C.white, borderRadius: "16px", padding: "24px", border: `1.5px solid ${C.borderLight}`, boxShadow: `0 2px 12px ${C.shadow}` }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "18px", color: C.navy, marginBottom: "20px" }}>Order Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", color: C.textMid, fontSize: "14px" }}><span>Subtotal</span><span>{fmt(total)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", color: C.textMid, fontSize: "14px" }}><span>Delivery</span><span style={{ color: C.success, fontWeight: 600 }}>Free</span></div>
          <GoldDivider style={{ marginBottom: "16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.display, fontSize: "20px", fontWeight: 700, color: C.navy, marginBottom: "20px" }}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
          <button onClick={onCheckout} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700, borderRadius: "12px" }}>
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Checkout Page ────────────────────────────────────────────────────────────
function CheckoutPage({ cart, user, onSuccess, onBack }) {
  const [form, setForm] = useState({ name: user?.name||"", email: user?.email||"", phone: "", address: "" });
  const [payment, setPayment] = useState("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [processing, setProcessing] = useState(false);
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.address) { alert("Please fill all fields!"); return; }
    setProcessing(true);
    try {
      if (user?.uid && user.uid !== "guest") {
        await addDoc(collection(db, "orders"), {
          userId: user.uid,
          items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
          total, address: form.address, phone: form.phone,
          email: form.email, payment, createdAt: serverTimestamp(),
        });
      }
      const itemList = cart.map(i => `• ${i.name} x${i.qty} — ${fmt(i.price * i.qty)}`).join("\n");
      const msg = `🎉 *TechFit Order Confirmed!*\n\n${itemList}\n\n*Total: ${fmt(total)}*\n📍 ${form.address}\n\nThank you for shopping with TechFit! 👗`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    } catch (err) { console.error(err); }
    await new Promise(r => setTimeout(r, 1500));
    setProcessing(false);
    onSuccess();
  };

  return (
    <PageWrapper style={{ maxWidth: "680px" }}>
      <BackBtn onClick={onBack} label="← Back to Cart" />
      <PageTitle title="Checkout" subtitle="Complete your order below." />

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Delivery */}
        <div style={{ background: C.white, borderRadius: "16px", padding: "24px", border: `1.5px solid ${C.borderLight}` }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "16px", color: C.navy, marginBottom: "18px" }}>📦 Delivery Information</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} style={INP} />
            <input placeholder="Email Address" value={form.email} onChange={e => setForm({...form,email:e.target.value})} style={INP} />
            <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} style={INP} />
            <input placeholder="Delivery Address" value={form.address} onChange={e => setForm({...form,address:e.target.value})} style={INP} />
          </div>
        </div>

        {/* Payment */}
        <div style={{ background: C.white, borderRadius: "16px", padding: "24px", border: `1.5px solid ${C.borderLight}` }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "16px", color: C.navy, marginBottom: "18px" }}>💳 Payment Method</div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
            {[["card","💳 Card"],["transfer","🏦 Transfer"],["cod","💵 Cash on Delivery"]].map(([val,label]) => (
              <button key={val} onClick={() => setPayment(val)} style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                border: payment===val ? `2px solid ${C.navy}` : `1.5px solid ${C.border}`,
                background: payment===val ? `rgba(15,31,69,0.06)` : C.white,
                color: payment===val ? C.navy : C.textMid,
                cursor: "pointer", fontSize: "13px", fontWeight: payment===val ? 700 : 500,
                fontFamily: F.body, transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>
          {payment === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input placeholder="Card Number" value={card.number} onChange={e => setCard({...card,number:e.target.value})} style={INP} />
              <div style={{ display: "flex", gap: "10px" }}>
                <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({...card,expiry:e.target.value})} style={{ ...INP, flex:1 }} />
                <input placeholder="CVV" value={card.cvv} onChange={e => setCard({...card,cvv:e.target.value})} style={{ ...INP, flex:1 }} />
              </div>
            </div>
          )}
          {payment === "transfer" && (
            <div style={{ background: C.creamDark, borderRadius: "10px", padding: "16px", fontSize: "13px", color: C.textMid, lineHeight: 2 }}>
              <strong style={{ color: C.navy }}>Bank Transfer Details:</strong><br />
              Bank: GTBank &nbsp;·&nbsp; Account: 0123456789<br />
              Name: TechFit Ltd &nbsp;·&nbsp; Amount: {fmt(total)}
            </div>
          )}
          {payment === "cod" && (
            <div style={{ background: C.creamDark, borderRadius: "10px", padding: "16px", fontSize: "13px", color: C.textMid }}>
              Pay {fmt(total)} when your order arrives. Available within Lagos only.
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{ background: C.white, borderRadius: "16px", padding: "20px", border: `1.5px solid ${C.borderLight}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.textMid, fontSize: "14px", marginBottom: "8px" }}><span>Subtotal</span><span>{fmt(total)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.textMid, fontSize: "14px", marginBottom: "14px" }}><span>Delivery</span><span style={{ color: C.success, fontWeight: 600 }}>Free</span></div>
          <GoldDivider style={{ marginBottom: "14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.display, fontSize: "20px", fontWeight: 700, color: C.navy }}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        <p style={{ fontSize: "12px", color: C.textMuted, textAlign: "center" }}>📱 A WhatsApp receipt will be sent after your order is placed.</p>
        <button onClick={handleSubmit} disabled={processing} className="btn-primary" style={{
          width: "100%", padding: "15px", fontSize: "16px", fontWeight: 700,
          borderRadius: "12px", opacity: processing ? 0.7 : 1,
        }}>
          {processing ? "Processing Payment… ⏳" : `Place Order · ${fmt(total)}`}
        </button>
      </div>
    </PageWrapper>
  );
}

// ─── Success Page ─────────────────────────────────────────────────────────────
function SuccessPage({ onHome }) {
  return (
    <PageWrapper>
      <div className="fade-up" style={{ textAlign: "center", padding: "80px 20px", maxWidth: "460px", margin: "0 auto" }}>
        <div style={{
          width: "88px", height: "88px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.success}, #15b87a)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "40px", margin: "0 auto 24px",
          boxShadow: `0 12px 30px rgba(26,158,95,0.3)`,
        }}>🎉</div>
        <h2 style={{ fontFamily: F.display, fontSize: "36px", fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Order Placed!</h2>
        <GoldDivider style={{ margin: "0 auto 20px", maxWidth: "120px" }} />
        <p style={{ color: C.textMid, lineHeight: 1.8, marginBottom: "32px", fontSize: "15px" }}>
          Thank you for shopping with TechFit. Your order has been confirmed and a WhatsApp receipt has been sent to you.
        </p>
        <button onClick={onHome} className="btn-primary" style={{ padding: "14px 40px", fontSize: "15px", fontWeight: 700, borderRadius: "12px" }}>
          Continue Shopping
        </button>
      </div>
    </PageWrapper>
  );
}

// ─── Help Page ────────────────────────────────────────────────────────────────
function HelpPage({ onBack }) {
  const [open, setOpen] = useState(null);
  const sections = [
    { title: "Getting Started", items: [
      { q: "How do I create an account?", a: "Tap Sign Up on the login page, enter your name, email and password (min 6 characters), then tap Create Account." },
      { q: "I forgot my password", a: "Enter your email on the login page, tap Forgot Password, then check your email for a reset link." },
      { q: "Can I use the app without an account?", a: "Yes, tap Continue as Guest. Note that guests cannot view order history." },
    ]},
    { title: "Shopping", items: [
      { q: "How do I find a product?", a: "Go to Shop and use the search bar or category buttons to filter products." },
      { q: "How do I add to cart?", a: "Tap Add to Cart on any product card. The cart count in the top bar updates automatically." },
      { q: "How do I share a product?", a: "Tap the green phone icon on any product card to share it on WhatsApp." },
    ]},
    { title: "Virtual Try-On", items: [
      { q: "How do I try on a garment?", a: "Tap Try On on any product, upload your photo, then tap Generate AI Try-On. Results take 30-60 seconds." },
      { q: "How do I get the best result?", a: "Use a clear photo standing straight with a plain background and good lighting, facing the camera directly." },
      { q: "The try-on failed. What do I do?", a: "Wait 5 minutes and try again. The AI has a usage limit that resets every hour." },
    ]},
    { title: "Checkout & Orders", items: [
      { q: "What payment methods are accepted?", a: "Card payment, Bank Transfer (GTBank), and Cash on Delivery (Lagos only)." },
      { q: "How do I track my order?", a: "Tap Orders in the navigation bar to see all your past orders." },
      { q: "Will I get a receipt?", a: "Yes, a WhatsApp receipt is generated automatically after every order." },
    ]},
  ];

  return (
    <PageWrapper>
      <BackBtn onClick={onBack} />
      <PageTitle title="User Guide" subtitle="Everything you need to know about TechFit." />

      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: "32px" }}>
          <h3 style={{
            fontFamily: F.display, fontSize: "18px", fontWeight: 700,
            color: C.navy, marginBottom: "14px",
            paddingBottom: "10px", borderBottom: `2px solid ${C.gold}`,
          }}>{section.title}</h3>
          {section.items.map((item, i) => {
            const key = `${section.title}-${i}`;
            const isOpen = open === key;
            return (
              <div key={key} style={{
                background: C.white, borderRadius: "12px", marginBottom: "8px",
                border: `1.5px solid ${isOpen ? C.navy : C.borderLight}`,
                overflow: "hidden", transition: "border-color 0.2s",
              }}>
                <button onClick={() => setOpen(isOpen ? null : key)} style={{
                  width: "100%", display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "16px 18px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: F.body, fontWeight: 600, color: C.navy,
                  fontSize: "14px", textAlign: "left", gap: "12px",
                }}>
                  <span>{item.q}</span>
                  <span style={{ color: C.gold, fontSize: "18px", flexShrink: 0, transition: "transform 0.2s", transform: isOpen?"rotate(180deg)":"rotate(0deg)" }}>▾</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 16px", color: C.textMid, fontSize: "13px", lineHeight: 1.75, borderTop: `1px solid ${C.borderLight}`, marginTop: "0", paddingTop: "14px" }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`, borderRadius: "16px", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: F.display, color: "#fff", fontWeight: 700, fontSize: "18px", marginBottom: "6px" }}>Need more help?</div>
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>Contact Apex Software Corp. · University of Ilorin</div>
      </div>
    </PageWrapper>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [pageHistory, setPageHistory] = useState([]);
  const [cart, setCart] = useState([]);
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigate = (newPage) => { setPageHistory(prev => [...prev, page]); setPage(newPage); };
  const goBack = () => {
    if (pageHistory.length === 0) return;
    setPage(pageHistory[pageHistory.length - 1]);
    setPageHistory(h => h.slice(0, -1));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ name: firebaseUser.displayName||firebaseUser.email.split("@")[0], email: firebaseUser.email, uid: firebaseUser.uid });
      } else { setUser(null); }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = (u) => { setUser(u); setPage("home"); setPageHistory([]); };
  const handleLogout = async () => { await signOut(auth); setUser(null); setCart([]); setPage("home"); setPageHistory([]); };
  const handleTryOn = (product) => { setTryOnProduct(product); navigate("tryon"); };
  const handleSuccess = () => { setCart([]); setPageHistory(["shop"]); setPage("success"); };
  const addToCart = (product) => {
    setCart(prev => { const e=prev.find(i=>i.id===product.id); if(e) return prev.map(i=>i.id===product.id?{...i,qty:i.qty+1}:i); return [...prev,{...product,qty:1}]; });
    showToast(`${product.name} added to cart!`);
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.navy, fontFamily: F.body }}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontFamily: F.display, fontSize: "42px", fontWeight: 900, marginBottom: "8px" }}>Tech<span style={{ color: C.gold }}>Fit</span></div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Loading…</div>
      </div>
    </div>
  );

  if (!user) return <><InjectStyles /><LoginPage onLogin={handleLogin} /></>;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ minHeight: "100vh", background: C.cream, color: C.text, fontFamily: F.body }}>
      <InjectStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Navbar ── */}
      <nav style={{
        background: C.navy,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "64px", padding: "0 28px",
        boxShadow: `0 4px 20px rgba(0,0,0,0.25)`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Left: back + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {pageHistory.length > 0 && (
            <button onClick={goBack} style={{
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "8px", color: "#fff", cursor: "pointer",
              padding: "6px 12px", fontSize: "16px", fontFamily: F.body,
              transition: "background 0.2s",
            }}
              onMouseEnter={e => (e.target.style.background="rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.target.style.background="rgba(255,255,255,0.1)")}
            >←</button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => navigate("home")}>
            <img src="/unilorin-logo.png" height="34" alt="" onError={e => (e.target.style.display="none")} style={{ borderRadius: "6px" }} />
            <span style={{ fontFamily: F.display, fontSize: "20px", fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
              Tech<span style={{ color: C.gold }}>Fit</span>
            </span>
          </div>
        </div>

        {/* Right: nav links */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {[["home","Home"],["shop","Shop"]].map(([id,label]) => (
            <button key={id} onClick={() => navigate(id)} style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: page===id ? "rgba(255,255,255,0.15)" : "transparent",
              color: page===id ? "#fff" : "rgba(255,255,255,0.65)",
              cursor: "pointer", fontWeight: page===id ? 600 : 400,
              fontSize: "14px", fontFamily: F.body, transition: "all 0.2s",
            }}>{label}</button>
          ))}

          {/* Cart with badge */}
          <button onClick={() => navigate("cart")} style={{
            padding: "8px 14px", borderRadius: "8px", border: "none",
            background: page==="cart" ? "rgba(255,255,255,0.15)" : "transparent",
            color: page==="cart" ? "#fff" : "rgba(255,255,255,0.65)",
            cursor: "pointer", fontWeight: page==="cart" ? 600 : 400,
            fontSize: "14px", fontFamily: F.body, position: "relative",
            transition: "all 0.2s",
          }}>
            Cart
            {cartCount > 0 && (
              <span style={{
                position: "absolute", top: "2px", right: "2px",
                background: C.gold, color: C.navy,
                borderRadius: "50%", width: "18px", height: "18px",
                fontSize: "10px", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{cartCount}</span>
            )}
          </button>

          {user.uid !== "guest" && (
            <button onClick={() => navigate("orders")} style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: page==="orders" ? "rgba(255,255,255,0.15)" : "transparent",
              color: page==="orders" ? "#fff" : "rgba(255,255,255,0.65)",
              cursor: "pointer", fontSize: "14px", fontFamily: F.body, fontWeight: page==="orders"?600:400,
              transition: "all 0.2s",
            }}>Orders</button>
          )}
          <button onClick={() => navigate("help")} style={{
            padding: "8px 14px", borderRadius: "8px", border: "none",
            background: page==="help" ? "rgba(255,255,255,0.15)" : "transparent",
            color: page==="help" ? "#fff" : "rgba(255,255,255,0.65)",
            cursor: "pointer", fontSize: "14px", fontFamily: F.body, fontWeight: page==="help"?600:400,
            transition: "all 0.2s",
          }}>Help</button>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 6px" }} />

          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>Hi, {user.name}!</span>
          <button onClick={handleLogout} style={{
            padding: "7px 14px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent", color: "rgba(255,255,255,0.75)",
            cursor: "pointer", fontSize: "13px", fontFamily: F.body,
            marginLeft: "4px", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.borderColor="rgba(255,255,255,0.5)"; e.target.style.color="#fff"; }}
            onMouseLeave={e => { e.target.style.borderColor="rgba(255,255,255,0.2)"; e.target.style.color="rgba(255,255,255,0.75)"; }}
          >Logout</button>
        </div>
      </nav>

      {page === "home"     && <HomePage onShop={() => navigate("shop")} user={user} />}
      {page === "shop"     && <ShopPage cart={cart} setCart={setCart} onTryOn={handleTryOn} />}
      {page === "tryon"    && <TryOnPage product={tryOnProduct} onBack={goBack} onAddToCart={addToCart} />}
      {page === "cart"     && <CartPage cart={cart} setCart={setCart} onCheckout={() => navigate("checkout")} onBack={goBack} />}
      {page === "checkout" && <CheckoutPage cart={cart} user={user} onSuccess={handleSuccess} onBack={goBack} />}
      {page === "success"  && <SuccessPage onHome={() => { setPageHistory([]); setPage("shop"); }} />}
      {page === "orders"   && <OrderHistory user={user} onBack={goBack} />}
      {page === "help"     && <HelpPage onBack={goBack} />}

      {/* ── Footer ── */}
      <footer style={{
        background: C.navy,
        borderTop: `3px solid ${C.gold}`,
        padding: "32px 28px",
        marginTop: "60px",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
              Tech<span style={{ color: C.gold }}>Fit</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>University of Ilorin · Built by Apex Software Corp.</div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <span onClick={() => navigate("help")} style={{ color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "13px", textDecoration: "underline", transition: "color 0.2s" }}
              onMouseEnter={e=>(e.target.style.color="#fff")} onMouseLeave={e=>(e.target.style.color="rgba(255,255,255,0.55)")}>
              User Guide
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>© 2025 TechFit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
