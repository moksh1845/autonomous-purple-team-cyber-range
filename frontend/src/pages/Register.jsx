import { useState } from "react";
import { Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register({ onSwitchToLogin }) {
  const { register, loading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await register(username, email, password);
    if (ok) setSuccess(true);
  };

  if (success) {
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
        <div className="card fade-in" style={{ width: 380, padding: 32, textAlign: "center" }}>
          <CheckCircle2 size={36} color="var(--green-600)" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: "1.0625rem", marginBottom: 8 }}>Account created</h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: 20 }}>
            New accounts start with the Viewer role. An Admin can upgrade your
            access if you need to run simulations or generate reports.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onSwitchToLogin}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

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
            <h1 style={{ fontSize: "1.125rem" }}>Create Account</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Join the Purple Team Cyber Range
            </p>
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
            minLength={3}
            required
          />

          <label style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
            Email
          </label>
          <input
            className="input"
            type="email"
            style={{ width: "100%", marginBottom: 16 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <label style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
            Password
          </label>
          <input
            className="input"
            type="password"
            style={{ width: "100%", marginBottom: 8 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 20 }}>
            Minimum 8 characters — matches the backend's password policy.
          </p>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: 20, textAlign: "center" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
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
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
