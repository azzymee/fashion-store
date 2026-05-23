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

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a2f5e",
  primaryLight: "#2a4a8e",
  accent: "#3a6bc4",
  bg: "#f5f0e8",
  bgCard: "#ffffff",
  bgDark: "#f0ece4",
  text: "#1a1a1a",
  textLight: "#555555",
  textMuted: "#888888",
  border: "#ddd8ce",
  cream: "#f5f0e8",
  green: "#25D366",
  success: "#27ae60",
};

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 1, name: "Bodycon Dress", price: 4500, category: "Dresses",
    image: "/bodycon-dress.jpg",
    description: "Sleek & form-fitting for any evening out.",
    rating: 4.5, reviews: 128,
    colors: ["#1a1a1a", "#8B4513", "#c0392b"],
  },
  {
    id: 2, name: "Floral Gown", price: 7800, category: "Dresses",
    image: "/floral-gown.jpg",
    description: "Elegant floral patterns for special occasions.",
    rating: 4.7, reviews: 94,
    colors: ["#e91e63", "#9c27b0", "#ffffff"],
  },
  {
    id: 3, name: "Maxi Gown", price: 6200, category: "Dresses",
    image: "/maxi-gown.jpg",
    description: "Flowing maxi silhouette, effortlessly chic.",
    rating: 4.6, reviews: 77,
    colors: ["#2196f3", "#009688", "#ff5722"],
  },
  {
    id: 4, name: "Midi Skirt", price: 3200, category: "Bottoms",
    image: "/midi-skirt.jpg",
    description: "Versatile midi length for work or weekend.",
    rating: 4.3, reviews: 56,
    colors: ["#607d8b", "#795548", "#000000"],
  },
  {
    id: 5, name: "Mini Skirt", price: 2800, category: "Bottoms",
    image: "/mini-skirt.jpg",
    description: "Bold mini cut, perfect for a night out.",
    rating: 4.4, reviews: 88,
    colors: ["#f06292", "#ba68c8", "#4fc3f7"],
  },
  {
    id: 6, name: "Cargo Pants", price: 4100, category: "Bottoms",
    image: "/cargo-pants.jpg",
    description: "Utility-meets-style cargo with side pockets.",
    rating: 4.2, reviews: 43,
    colors: ["#6d4c41", "#37474f", "#558b2f"],
  },
  {
    id: 7, name: "Wide Leg Pants", price: 4600, category: "Bottoms",
    image: "/wide-leg-pants.jpg",
    description: "Relaxed wide-leg cut, tailored finish.",
    rating: 4.5, reviews: 61,
    colors: ["#ffffff", "#212121", "#b0bec5"],
  },
  {
    id: 8, name: "Slim Trousers", price: 3900, category: "Bottoms",
    image: "/slim-trousers.jpg",
    description: "Sharp slim fit for a polished look.",
    rating: 4.3, reviews: 39,
    colors: ["#1a237e", "#37474f", "#4e342e"],
  },
  {
    id: 9, name: "Polo Shirt", price: 2500, category: "Tops",
    image: "/polo-shirt.jpg",
    description: "Classic polo for smart casual days.",
    rating: 4.1, reviews: 72,
    colors: ["#ffffff", "#1565c0", "#2e7d32"],
  },
  {
    id: 10, name: "Hoodie", price: 5500, category: "Tops",
    image: "/hoodie.jpg",
    description: "Cozy premium hoodie for cool evenings.",
    rating: 4.8, reviews: 115,
    colors: ["#424242", "#b71c1c", "#1a237e"],
  },
  {
    id: 11, name: "Bucket Hat", price: 1800, category: "Accessories",
    image: "/bucket-hat.jpg",
    description: "Trendy bucket hat to complete any look.",
    rating: 4.0, reviews: 34,
    colors: ["#f9a825", "#1b5e20", "#880e4f"],
  },
  {
    id: 12, name: "Snapback Cap", price: 2200, category: "Accessories",
    image: "/snapback-cap.jpg",
    description: "Streetwear snapback with adjustable fit.",
    rating: 4.2, reviews: 49,
    colors: ["#212121", "#c62828", "#1565c0"],
  },
];

const CATEGORIES = ["all", "Tops", "Dresses", "Bottoms", "Accessories"];
const fmt = (n) => `₦${Number(n).toLocaleString()}`;

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <span style={{ color: "#d97706", fontSize: "12px" }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
      <span style={{ color: C.textMuted, marginLeft: "4px" }}>{rating}</span>
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: type === "error" ? "#c0392b" : C.primary,
      color: "#fff", padding: "12px 24px", borderRadius: "10px",
      fontWeight: 700, fontSize: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>{msg}</div>
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
          position: "absolute", inset: 0, background: "rgba(245,240,232,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 20, borderRadius: "20px",
        }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🤖</div>
          <div style={{ fontWeight: 700, color: C.primary, fontSize: "14px" }}>
            {status === "loading" ? "Loading AI Model..." : "Detecting body pose..."}
          </div>
          <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "6px" }}>Please wait a moment</div>
        </div>
      )}
      <canvas ref={canvasRef} style={{
        width: "100%", height: "450px", objectFit: "cover",
        borderRadius: "20px", border: `2px solid ${C.border}`,
        display: "block", background: C.bgDark,
      }} />
      {status === "done" && (
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(39,174,96,0.9)", color: "#fff",
          padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
        }}>✓ AI Try-On Complete</div>
      )}
      {status === "fallback" && (
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          background: "rgba(26,47,94,0.85)", color: "#fff",
          padding: "4px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
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
    } catch { setError("Could not send reset email. Check your email address."); }
  };

  const inp = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    border: `1px solid ${C.border}`, background: "#fff", color: C.text,
    fontSize: "14px", boxSizing: "border-box", outline: "none", marginBottom: "12px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "24px", padding: "40px",
        width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/unilorin-logo.png"
            alt="Unilorin"
            style={{ height: "56px", display: "block", margin: "0 auto 14px" }}
            onError={e => (e.target.style.display = "none")}
          />
          <div style={{ fontSize: "38px", lineHeight: 1, marginBottom: "6px" }}>👗</div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: C.primary, margin: "0 0 4px" }}>TechFit</h1>
          <p style={{ color: C.textMuted, fontSize: "13px", margin: 0 }}>University of Ilorin · Fashion Store</p>
        </div>

        <div style={{
          display: "flex", background: C.bgDark, borderRadius: "12px",
          padding: "4px", marginBottom: "24px",
        }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setResetSent(false); }} style={{
              flex: 1, padding: "10px", borderRadius: "9px", border: "none",
              background: mode === m ? C.primary : "transparent",
              color: mode === m ? "#fff" : C.textMuted,
              fontWeight: mode === m ? 700 : 400,
              cursor: "pointer", fontSize: "14px", transition: "all 0.2s",
            }}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <input placeholder="Full Name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
        )}
        <input placeholder="Email Address" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} style={inp} type="email" />
        <input placeholder="Password (min 6 characters)" type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          style={{ ...inp, marginBottom: "8px" }}
          onKeyDown={e => e.key === "Enter" && handle()} />

        {mode === "login" && (
          <button onClick={handleForgotPassword} style={{
            background: "none", border: "none", color: C.accent,
            fontSize: "13px", cursor: "pointer", textAlign: "right",
            width: "100%", marginBottom: "8px", display: "block",
          }}>Forgot Password?</button>
        )}

        {resetSent && (
          <div style={{ color: C.success, fontSize: "13px", marginBottom: "10px", background: "#e8f5e9", padding: "8px 12px", borderRadius: "8px" }}>
            ✓ Password reset email sent! Check your inbox.
          </div>
        )}
        {error && (
          <div style={{ color: "#c0392b", fontSize: "13px", marginBottom: "12px", background: "#fdf0f0", padding: "8px 12px", borderRadius: "8px" }}>
            {error}
          </div>
        )}

        <button onClick={handle} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? C.border : C.primary,
          border: "none", borderRadius: "12px",
          color: loading ? C.textMuted : "#fff",
          fontWeight: 900, fontSize: "15px",
          cursor: loading ? "wait" : "pointer", marginBottom: "12px",
        }}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <button onClick={() => onLogin({ name: "Guest", email: "guest@techfit.com", uid: "guest" })} style={{
          width: "100%", padding: "12px", background: "transparent",
          border: `1px solid ${C.border}`, borderRadius: "12px",
          color: C.textLight, fontWeight: 600, fontSize: "14px", cursor: "pointer",
        }}>
          Continue as Guest
        </button>
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
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
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
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.textLight, padding: "8px 16px", cursor: "pointer",
        marginBottom: "20px", fontSize: "14px",
      }}>← Back</button>
      <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 24px", color: C.text }}>Order History</h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: C.textMuted }}>Loading orders...</div>
      ) : user.uid === "guest" ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px" }}>🔐</div>
          <h3 style={{ color: C.textMuted, marginTop: "16px" }}>Sign in to view order history</h3>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px" }}>📦</div>
          <h3 style={{ color: C.textMuted, marginTop: "16px" }}>No orders yet</h3>
          <p style={{ color: C.textLight }}>Start shopping to see your orders here!</p>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} style={{
            background: C.bgCard, borderRadius: "14px", padding: "20px",
            marginBottom: "16px", border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: "15px" }}>Order #{order.id.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize: "12px", color: C.textMuted }}>{order.createdAt?.toDate?.()?.toLocaleDateString() || "Recent"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, color: C.primary, fontSize: "16px" }}>{fmt(order.total)}</div>
                <div style={{ fontSize: "12px", background: "#e8f5e9", color: C.success, padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>✓ Confirmed</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: C.textLight, padding: "4px 0" }}>
                  <span>{item.name} × {item.qty}</span>
                  <span>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "10px", fontSize: "12px", color: C.textMuted }}>
              📍 {order.address} | 📞 {order.phone}
            </div>
            <button onClick={() => shareOrder(order)} style={{
              marginTop: "12px", padding: "8px 18px", background: C.green,
              border: "none", borderRadius: "8px", color: "#fff",
              fontWeight: 700, fontSize: "13px", cursor: "pointer",
            }}>📱 Share on WhatsApp</button>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ onShop, user }) {
  return (
    <div style={{
      minHeight: "80vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "40px 20px",
      background: `linear-gradient(160deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
    }}>
      <img
        src="/unilorin-logo.png"
        alt="Unilorin"
        style={{ height: "64px", display: "block", marginBottom: "20px" }}
        onError={e => (e.target.style.display = "none")}
      />
      <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "10px" }}>👗</div>
      <h1 style={{
        fontSize: "clamp(32px, 6vw, 60px)", fontWeight: 900,
        margin: "0 0 6px", color: "#fff", letterSpacing: "-1px",
      }}>TechFit</h1>

      {user && (
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "16px", margin: "0 0 10px" }}>
          Welcome back, {user.name}! 👋
        </p>
      )}

      <p style={{
        fontSize: "17px", color: "rgba(255,255,255,0.75)",
        maxWidth: "500px", lineHeight: 1.7, margin: "0 0 32px",
      }}>
        Nigeria's premium online fashion store.<br />
        Shop the latest styles and try them on virtually before you buy.
      </p>

      <button
        onClick={onShop}
        style={{
          padding: "14px 40px", background: C.cream,
          border: "2px solid #fff", borderRadius: "14px",
          color: C.primary, fontWeight: 800, fontSize: "16px", cursor: "pointer",
        }}
        onMouseEnter={e => { e.target.style.background = "transparent"; e.target.style.color = "#fff"; }}
        onMouseLeave={e => { e.target.style.background = C.cream; e.target.style.color = C.primary; }}
      >
        Shop Now 🛍️
      </button>

      <div style={{ display: "flex", gap: "40px", marginTop: "60px", flexWrap: "wrap", justifyContent: "center" }}>
        {[["500+", "Products"], ["50k+", "Customers"], ["4.8★", "Rating"], ["Free", "Returns"]].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "26px", fontWeight: 900, color: C.cream }}>{v}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{l}</div>
          </div>
        ))}
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
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 20px", color: C.text }}>Our Collection</h2>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search products..."
          style={{
            flex: 1, minWidth: "200px", padding: "10px 16px",
            borderRadius: "10px", border: `1px solid ${C.border}`,
            background: C.bgCard, color: C.text, fontSize: "14px", outline: "none",
          }} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: "10px 16px", borderRadius: "10px",
              border: category === cat ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: category === cat ? C.primary : C.bgCard,
              color: category === cat ? "#fff" : C.textLight,
              cursor: "pointer", fontSize: "13px",
              fontWeight: category === cat ? 700 : 400,
              textTransform: "capitalize",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
        {filtered.map(product => (
          <div key={product.id}
            style={{
              background: C.bgCard, borderRadius: "16px",
              border: `1px solid ${C.border}`, overflow: "hidden",
              transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(26,47,94,0.15)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
          >
            <div style={{ height: "200px", position: "relative", overflow: "hidden", background: C.bgDark }}>
              <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{
                position: "absolute", top: "8px", right: "8px",
                background: C.primary, borderRadius: "6px",
                padding: "2px 8px", fontSize: "11px", fontWeight: 700, color: "#fff",
              }}>{product.category.toUpperCase()}</div>
              <button onClick={() => shareProduct(product)} style={{
                position: "absolute", top: "8px", left: "8px",
                background: C.green, border: "none", borderRadius: "6px",
                padding: "4px 8px", cursor: "pointer", fontSize: "14px",
              }} title="Share on WhatsApp">📱</button>
            </div>
            <div style={{ padding: "14px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: C.text }}>{product.name}</h3>
              <StarRating rating={product.rating} />
              <span style={{ fontSize: "11px", color: C.textMuted, marginLeft: "6px" }}>({product.reviews})</span>
              <p style={{ fontSize: "12px", color: C.textLight, margin: "8px 0", lineHeight: 1.5 }}>{product.description}</p>
              <div style={{ display: "flex", gap: "6px", margin: "10px 0", flexWrap: "wrap" }}>
                {product.colors.map(c => (
                  <div key={c} style={{ width: "18px", height: "18px", borderRadius: "50%", background: c, border: `2px solid ${C.border}` }} />
                ))}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 900, color: C.primary, margin: "8px 0" }}>{fmt(product.price)}</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => addToCart(product)} style={{
                  flex: 1, padding: "9px",
                  background: added === product.id ? C.success : C.primary,
                  border: "none", borderRadius: "9px", color: "#fff",
                  fontWeight: 700, fontSize: "13px", cursor: "pointer", transition: "background 0.3s",
                }}>
                  {added === product.id ? "✓ Added!" : "Add to Cart"}
                </button>
                <button onClick={() => onTryOn(product)} style={{
                  padding: "9px 12px", background: C.bgDark,
                  border: `1px solid ${C.primary}`, borderRadius: "9px",
                  color: C.primary, fontWeight: 700, fontSize: "13px", cursor: "pointer",
                }}>Try On</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    setLoading(true);
    setError(null);
    try {
      const garmentResponse = await fetch(product.image);
      const garmentBlob = await garmentResponse.blob();
      const garmentFile = new File([garmentBlob], 'garment.jpg', { type: garmentBlob.type });
      const formData = new FormData();
      formData.append('human', userPhoto);
      formData.append('garment', garmentFile);
      const response = await fetch('/api/virtual-tryon', { method: 'POST', body: formData });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Try-on failed');
      const imgSrc = data.outputImage?.url || data.outputImage;
      setResultImage(imgSrc);
    } catch (err) {
      setError('Try-on failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.textLight, padding: "8px 16px", cursor: "pointer",
        marginBottom: "20px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px",
      }}>← Back to Shop</button>

      <h2 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 900, color: C.text }}>Virtual Try-On</h2>
      <p style={{ color: C.textLight, marginBottom: "24px" }}>
        Upload your photo to see how <strong>{product?.name}</strong> looks on you.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'inline-block', padding: '10px 20px',
          background: C.primary, color: '#fff', cursor: 'pointer',
          borderRadius: '8px', fontSize: "14px", fontWeight: 700,
        }}>
          📷 Upload Your Photo
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {userPhotoPreview && (
          <div>
            <p style={{ fontWeight: 700, marginBottom: "8px", color: C.text }}>Your Photo</p>
            <img src={userPhotoPreview} alt="Your photo" style={{ width: '250px', borderRadius: '10px', border: `1px solid ${C.border}` }} />
          </div>
        )}
        {product?.image && (
          <div>
            <p style={{ fontWeight: 700, marginBottom: "8px", color: C.text }}>Garment</p>
            <img src={product.image} alt="Garment" style={{ width: '250px', borderRadius: '10px', border: `1px solid ${C.border}` }} />
          </div>
        )}
      </div>

      {userPhoto && (
        <button onClick={handleTryOn} disabled={loading} style={{
          padding: '12px 30px',
          background: loading ? C.border : C.primary,
          color: loading ? C.textMuted : '#fff',
          border: 'none', borderRadius: '10px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '15px', fontWeight: 700,
        }}>
          {loading ? '⏳ Generating... (30-60s)' : '✨ Generate AI Try-On'}
        </button>
      )}

      {error && (
        <div style={{ marginTop: '10px', background: "#fdf0f0", padding: "14px 16px", borderRadius: "8px", border: "1px solid #f5c6cb" }}>
          <div style={{ color: "#c0392b", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>⚠️ Try-On Unavailable</div>
          <div style={{ color: "#666", fontSize: "13px", lineHeight: 1.6 }}>
            The AI try-on service is temporarily busy. Please wait a few minutes and try again.
          </div>
        </div>
      )}

      {resultImage && (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontWeight: 800, color: C.text, marginBottom: "12px" }}>Result</h3>
          <img src={resultImage} alt="Try-on result" style={{ width: '350px', borderRadius: '10px', display: 'block', border: `1px solid ${C.border}` }} />
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={resultImage}
              download="tryon-result.jpg"
              style={{
                padding: '10px 20px', background: C.primary,
                color: '#fff', borderRadius: '8px',
                textDecoration: 'none', fontSize: '14px', fontWeight: 700,
              }}
            >
              💾 Save Image
            </a>
            <button
              onClick={() => onAddToCart && onAddToCart(product)}
              style={{
                padding: '10px 20px', background: C.success,
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 700,
              }}
            >
              🛒 Add to Cart
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=Check%20out%20my%20virtual%20try-on!%20${encodeURIComponent(resultImage)}`, '_blank')}
              style={{
                padding: '10px 20px', background: C.green,
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 700,
              }}
            >
              📱 Share on WhatsApp
            </button>
          </div>
          <button onClick={onBack} style={{
            marginTop: "20px", background: "none",
            border: `1px solid ${C.border}`, borderRadius: "8px",
            color: C.textLight, padding: "10px 20px",
            cursor: "pointer", fontSize: "14px",
          }}>← Back to Shopping</button>
        </div>
      )}
    </div>
  );
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
function CartPage({ cart, setCart, onCheckout, onBack }) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const updateQty = (id, delta) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));

  if (cart.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: "64px" }}>🛒</div>
      <h2 style={{ color: C.textMuted, marginTop: "16px" }}>Your cart is empty</h2>
      <p style={{ color: C.textLight }}>Add some items from the shop!</p>
      <button onClick={onBack} style={{
        marginTop: "16px", padding: "10px 24px",
        background: C.primary, border: "none", borderRadius: "10px",
        color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer",
      }}>← Back to Shop</button>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.textLight, padding: "8px 16px", cursor: "pointer",
        marginBottom: "20px", fontSize: "14px",
      }}>← Back</button>

      <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 24px", color: C.text }}>Your Cart ({cart.length})</h2>
      {cart.map(item => (
        <div key={item.id} style={{
          display: "flex", alignItems: "center", gap: "16px",
          background: C.bgCard, borderRadius: "14px", padding: "16px",
          marginBottom: "12px", border: `1px solid ${C.border}`,
        }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
            <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "15px", color: C.text }}>{item.name}</div>
            <div style={{ color: C.primary, fontWeight: 700 }}>{fmt(item.price)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => updateQty(item.id, -1)} style={{ width: "28px", height: "28px", borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bgDark, color: C.text, cursor: "pointer", fontSize: "16px" }}>-</button>
            <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center", color: C.text }}>{item.qty}</span>
            <button onClick={() => updateQty(item.id, 1)} style={{ width: "28px", height: "28px", borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bgDark, color: C.text, cursor: "pointer", fontSize: "16px" }}>+</button>
          </div>
          <div style={{ fontWeight: 900, color: C.text, minWidth: "80px", textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
        </div>
      ))}
      <div style={{ background: C.bgCard, borderRadius: "14px", padding: "20px", border: `1px solid ${C.border}`, marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: C.textMuted, fontSize: "14px" }}><span>Subtotal</span><span>{fmt(total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", color: C.textMuted, fontSize: "14px" }}><span>Delivery</span><span style={{ color: C.success }}>Free</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", fontWeight: 900, borderTop: `1px solid ${C.border}`, paddingTop: "12px", marginBottom: "16px", color: C.text }}><span>Total</span><span style={{ color: C.primary }}>{fmt(total)}</span></div>
        <button onClick={onCheckout} style={{ width: "100%", padding: "14px", background: C.primary, border: "none", borderRadius: "12px", color: "#fff", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>Proceed to Checkout →</button>
      </div>
    </div>
  );
}

// ─── Checkout Page ────────────────────────────────────────────────────────────
function CheckoutPage({ cart, user, onSuccess, onBack }) {
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: "", address: "" });
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
          total,
          address: form.address,
          phone: form.phone,
          email: form.email,
          payment,
          createdAt: serverTimestamp(),
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

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: `1px solid ${C.border}`, background: C.bgCard, color: C.text,
    fontSize: "14px", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.textLight, padding: "8px 16px", cursor: "pointer",
        marginBottom: "20px", fontSize: "14px",
      }}>← Back to Cart</button>

      <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 24px", color: C.text }}>Checkout</h2>
      <div style={{ background: C.bgCard, borderRadius: "14px", padding: "20px", border: `1px solid ${C.border}`, marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: C.primary }}>📦 Delivery Information</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
          <input placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
          <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} />
          <input placeholder="Delivery Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} />
        </div>
      </div>
      <div style={{ background: C.bgCard, borderRadius: "14px", padding: "20px", border: `1px solid ${C.border}`, marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: C.primary }}>💳 Payment Method</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[["card", "💳 Card"], ["transfer", "🏦 Transfer"], ["cod", "💵 Cash on Delivery"]].map(([val, label]) => (
            <button key={val} onClick={() => setPayment(val)} style={{
              flex: 1, padding: "10px", borderRadius: "10px",
              border: payment === val ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: payment === val ? `${C.primary}15` : C.bgDark,
              color: payment === val ? C.primary : C.textMuted,
              cursor: "pointer", fontSize: "12px", fontWeight: payment === val ? 700 : 400,
            }}>{label}</button>
          ))}
        </div>
        {payment === "card" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="Card Number" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} style={inp} />
            <div style={{ display: "flex", gap: "10px" }}>
              <input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} style={{ ...inp, flex: 1 }} />
              <input placeholder="CVV" value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} style={{ ...inp, flex: 1 }} />
            </div>
          </div>
        )}
        {payment === "transfer" && (
          <div style={{ background: C.bgDark, borderRadius: "10px", padding: "16px", fontSize: "13px", color: C.textLight, lineHeight: 2 }}>
            <strong style={{ color: C.text }}>Bank Transfer Details:</strong><br />
            Bank: GTBank | Account: 0123456789<br />
            Name: TechFit Ltd | Amount: {fmt(total)}
          </div>
        )}
        {payment === "cod" && (
          <div style={{ background: C.bgDark, borderRadius: "10px", padding: "16px", fontSize: "13px", color: C.textLight }}>
            Pay {fmt(total)} when your order arrives. Available within Lagos only.
          </div>
        )}
      </div>
      <div style={{ background: C.bgCard, borderRadius: "14px", padding: "16px", border: `1px solid ${C.border}`, marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.textMuted, fontSize: "14px", marginBottom: "8px" }}><span>Subtotal</span><span>{fmt(total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.textMuted, fontSize: "14px", marginBottom: "8px" }}><span>Delivery</span><span style={{ color: C.success }}>Free</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "18px", borderTop: `1px solid ${C.border}`, paddingTop: "8px", color: C.text }}><span>Total</span><span style={{ color: C.primary }}>{fmt(total)}</span></div>
      </div>
      <p style={{ fontSize: "12px", color: C.textMuted, textAlign: "center", marginBottom: "8px" }}>📱 WhatsApp receipt will be sent automatically after order</p>
      <button onClick={handleSubmit} disabled={processing} style={{
        width: "100%", padding: "15px",
        background: processing ? C.border : C.primary,
        border: "none", borderRadius: "12px",
        color: processing ? C.textMuted : "#fff",
        fontWeight: 900, fontSize: "16px",
        cursor: processing ? "wait" : "pointer",
      }}>
        {processing ? "Processing Payment... ⏳" : `Place Order · ${fmt(total)}`}
      </button>
    </div>
  );
}

// ─── Success Page ─────────────────────────────────────────────────────────────
function SuccessPage({ onHome }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: "72px" }}>🎉</div>
      <h2 style={{ fontSize: "32px", fontWeight: 900, margin: "16px 0 8px", color: C.text }}>Order Placed!</h2>
      <p style={{ color: C.textLight, maxWidth: "400px", margin: "0 auto 32px", lineHeight: 1.7 }}>
        Thank you for shopping with TechFit! Your order has been confirmed.<br />
        A WhatsApp receipt has been sent to you.
      </p>
      <button onClick={onHome} style={{
        padding: "14px 36px", background: C.primary, border: "none",
        borderRadius: "14px", color: "#fff", fontWeight: 800,
        fontSize: "16px", cursor: "pointer",
      }}>Continue Shopping 🛍️</button>
    </div>
  );
}

// ─── Help Page ────────────────────────────────────────────────────────────────
function HelpPage({ onBack }) {
  const sections = [
    {
      title: "Getting Started",
      items: [
        { q: "How do I create an account?", a: "Tap Sign Up on the login page, enter your name, email and password (min 6 characters), then tap Create Account." },
        { q: "How do I sign in?", a: "Enter your email and password on the login page and tap Sign In." },
        { q: "I forgot my password", a: "Enter your email on the login page, tap Forgot Password, then check your email for a reset link." },
        { q: "Can I use the app without an account?", a: "Yes, tap Continue as Guest. Note that guests cannot view order history." },
      ]
    },
    {
      title: "Shopping",
      items: [
        { q: "How do I find a product?", a: "Go to Shop and use the search bar or category buttons to filter products." },
        { q: "How do I add to cart?", a: "Tap Add to Cart on any product card. The cart count in the top bar updates automatically." },
        { q: "How do I share a product?", a: "Tap the green phone icon on any product card to share it on WhatsApp." },
      ]
    },
    {
      title: "Virtual Try-On",
      items: [
        { q: "How do I try on a garment?", a: "Tap Try On on any product, upload your photo, then tap Generate AI Try-On. Results take 30-60 seconds." },
        { q: "How do I get the best try-on result?", a: "Use a clear photo standing straight with a plain background and good lighting, facing the camera directly." },
        { q: "How do I save my try-on result?", a: "Tap Save Image after the result appears to download it to your device." },
        { q: "The try-on failed. What do I do?", a: "Wait 5 minutes and try again. The AI has a usage limit that resets every hour." },
      ]
    },
    {
      title: "Checkout & Orders",
      items: [
        { q: "What payment methods are accepted?", a: "Card payment, Bank Transfer (GTBank), and Cash on Delivery (Lagos only)." },
        { q: "How do I track my order?", a: "Tap Orders in the navigation bar to see all your past orders." },
        { q: "Will I get a receipt?", a: "Yes, a WhatsApp receipt is generated automatically after every order." },
      ]
    },
    {
      title: "Troubleshooting",
      items: [
        { q: "The site is slow to load", a: "Wait 30-60 seconds on first visit. The server wakes up when you visit." },
        { q: "Images are not showing", a: "Check your internet connection and refresh the page." },
        { q: "My cart is empty after logging in", a: "The cart resets when you log out. Add your items again after signing in." },
      ]
    },
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
        color: C.textLight, padding: "8px 16px", cursor: "pointer",
        marginBottom: "20px", fontSize: "14px",
      }}>← Back</button>

      <h2 style={{ fontSize: "28px", fontWeight: 900, color: C.primary, marginBottom: "8px" }}>User Guide</h2>
      <p style={{ color: C.textMuted, marginBottom: "30px" }}>Everything you need to know about using TechFit.</p>

      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: "30px" }}>
          <h3 style={{
            fontSize: "18px", fontWeight: 800, color: C.primary,
            borderBottom: `2px solid ${C.accent}`, paddingBottom: "8px", marginBottom: "16px"
          }}>{section.title}</h3>
          {section.items.map(item => (
            <div key={item.q} style={{
              background: C.bgCard, borderRadius: "10px", padding: "16px",
              marginBottom: "10px", border: `1px solid ${C.border}`
            }}>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: "6px", fontSize: "14px" }}>{item.q}</div>
              <div style={{ color: C.textLight, fontSize: "13px", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      ))}

      <div style={{
        background: C.primary, borderRadius: "12px", padding: "20px",
        textAlign: "center", marginTop: "20px"
      }}>
        <div style={{ color: "#fff", fontWeight: 700, marginBottom: "4px" }}>Need more help?</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>
          Contact Apex Software Corp. · University of Ilorin
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [pageHistory, setPageHistory] = useState([]);  // ← history stack
  const [cart, setCart] = useState([]);
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Navigate to a new page, pushing current page onto history stack ────────
  const navigate = (newPage) => {
    setPageHistory(prev => [...prev, page]);
    setPage(newPage);
  };

  // ── Go back to the previous page in history ────────────────────────────────
  const goBack = () => {
    if (pageHistory.length === 0) return;
    const prev = pageHistory[pageHistory.length - 1];
    setPageHistory(h => h.slice(0, -1));
    setPage(prev);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setPage("home");
    setPageHistory([]);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCart([]);
    setPage("home");
    setPageHistory([]);
  };

  const handleTryOn = (product) => {
    setTryOnProduct(product);
    navigate("tryon");
  };

  const handleSuccess = () => {
    setCart([]);
    // Clear history and go to success — back from success goes to shop
    setPageHistory(["shop"]);
    setPage("success");
  };

  const addToCart = (product) => {
    setCart(prev => {
      const e = prev.find(i => i.id === product.id);
      if (e) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} added to cart!`);
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.primary }}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👗</div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>Loading TechFit...</div>
      </div>
    </div>
  );

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Navbar ── */}
      <nav style={{
        background: C.primary, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "62px", boxShadow: "0 4px 16px rgba(26,47,94,0.3)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* ── Back arrow: only show when there's history ── */}
          {pageHistory.length > 0 && (
            <button onClick={goBack} style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "8px", color: "#fff", cursor: "pointer",
              padding: "6px 12px", fontSize: "18px",
            }}>←</button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => { setPageHistory(prev => [...prev, page]); setPage("home"); }}>
            <img
              src="/unilorin-logo.png"
              height="36"
              alt="Unilorin Logo"
              onError={e => (e.target.style.display = "none")}
              style={{ borderRadius: "4px" }}
            />
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>TechFit</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            ["home", "Home"],
            ["shop", "Shop"],
            ["cart", `Cart${cart.length > 0 ? ` (${cart.reduce((s, i) => s + i.qty, 0)})` : ""}`],
          ].map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)} style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: page === id ? "rgba(255,255,255,0.2)" : "transparent",
              color: "#fff", cursor: "pointer",
              fontWeight: page === id ? 700 : 400, fontSize: "14px",
            }}>{label}</button>
          ))}
          {user.uid !== "guest" && (
            <button onClick={() => navigate("orders")} style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: page === "orders" ? "rgba(255,255,255,0.2)" : "transparent",
              color: "#fff", cursor: "pointer", fontSize: "14px",
              fontWeight: page === "orders" ? 700 : 400,
            }}>Orders</button>
          )}
          <button onClick={() => navigate("help")} style={{
            padding: "8px 14px", borderRadius: "8px", border: "none",
            background: page === "help" ? "rgba(255,255,255,0.2)" : "transparent",
            color: "#fff", cursor: "pointer", fontSize: "14px",
            fontWeight: page === "help" ? 700 : 400,
          }}>Help</button>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", marginLeft: "4px" }}>Hi, {user.name}!</span>
          <button onClick={handleLogout} style={{
            padding: "6px 12px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "transparent", color: "#fff",
            cursor: "pointer", fontSize: "12px", marginLeft: "4px",
          }}>Logout</button>
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
        background: C.primary, color: "rgba(255,255,255,0.6)",
        textAlign: "center", padding: "20px", fontSize: "13px", marginTop: "40px",
      }}>
        © 2025 TechFit · University of Ilorin · Built by Apex Software corp.
        <span style={{ margin: "0 10px" }}>·</span>
        <span
          onClick={() => navigate("help")}
          style={{ color: "rgba(255,255,255,0.8)", cursor: "pointer", textDecoration: "underline" }}
        >
          User Guide
        </span>
      </footer>
    </div>
  );
}
