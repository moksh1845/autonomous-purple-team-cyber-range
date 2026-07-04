import { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login({ onSwitchToRegister }) {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
      }}
    >
      <div className="card fade-in" style={{ width: 380, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--blue-600), var(--purple-600))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.125rem" }}>Purple Team Cyber Range</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sign in to continue</p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--red-50)",
              color: "var(--red-600)",
              fontSize: "0.8125rem",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
            Username
          </label>
          <input
            className="input"
            style={{ width: "100%", marginBottom: 16 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your.username"
            autoComplete="username"
            required
          />

          <label style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
            Password
          </label>
          <input
            className="input"
            type="password"
            style={{ width: "100%", marginBottom: 20 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: 20, textAlign: "center" }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="btn-ghost"
            style={{
              border: "none",
              background: "none",
              color: "var(--blue-600)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.8125rem",
              padding: 0,
            }}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
