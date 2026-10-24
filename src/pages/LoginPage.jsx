/**
 * Sign-in and forgot-password screen.
 *
 * Used by: routes/AppRoutes.jsx
 * API: forgotPassword, loginEmployee
 */

import { useState } from "react";
import { useCrm } from "../context/CrmContext";
import { loginEmployee, forgotPassword } from "../backend/ApiService.js";

export default function LoginPage() {
  const { setUser } = useCrm();

  const [view, setView] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Added toggle state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { employee } = await loginEmployee(email, password);
      setUser(employee); // triggers CrmContext to fetch leads
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErr("");
    setSuccess("");
    try {
      await forgotPassword(email);
      setSuccess("Reset link sent! Check your email.");
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (view) => {
    setView(view);
    setErr("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setShowPassword(false); // Reset eye state on view switch
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(var(--orange) 1px,transparent 1px),linear-gradient(90deg,var(--orange) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "20%",
          width: 500,
          height: 500,
          background: "rgba(234,88,12,.05)",
          borderRadius: "50%",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "20%",
          width: 300,
          height: 300,
          background: "rgba(234,88,12,.04)",
          borderRadius: "50%",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="fade-in"
        style={{
          position: "relative",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-mid)",
          borderRadius: 22,
          padding: 36,
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 30px 80px rgba(0,0,0,.75)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              background: "var(--orange-dim)",
              border: "1px solid var(--orange-ring)",
              borderRadius: 18,
              marginBottom: 18,
            }}
          >
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: "#f0883d",
              letterSpacing: ".15em",
              textTransform: "uppercase",
            }}
          >
            DigiDent CRM
          </h1>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 7,
              letterSpacing: ".04em",
            }}
          >
            Advanced Dental Pipeline Platform
          </p>
        </div>

        {view === "login" ? (
          <form onSubmit={handleSubmit} className="form-group">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label className="label" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--orange)",
                    fontSize: 11,
                    padding: 0,
                    letterSpacing: ".03em",
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Wrapped input in a relative container to position the eye icon */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="input mono"
                  style={{ fontSize: 13, width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    /* Eye Off Icon */
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    /* Eye On Icon */
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && (
              <div
                style={{
                  background: "var(--red-dim)",
                  border: "1px solid var(--red-ring)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "var(--red)",
                  fontSize: 12,
                }}
              >
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "13px 0",
                fontSize: 12,
                marginTop: 4,
                letterSpacing: ".15em",
              }}
            >
              {loading ? "Authorizing…" : "Authorize Access"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="form-group">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>

            {err && (
              <div
                style={{
                  background: "var(--red-dim)",
                  border: "1px solid var(--red-ring)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "var(--red)",
                  fontSize: 12,
                }}
              >
                {err}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: "rgba(34,197,94,.08)",
                  border: "1px solid rgba(34,197,94,.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#4ade80",
                  fontSize: 12,
                }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "13px 0",
                fontSize: 12,
                marginTop: 4,
                letterSpacing: ".15em",
              }}
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => switchView("login")}
              style={{
                width: "100%",
                background: "none",
                border: "1px solid var(--border-mid)",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
                letterSpacing: ".05em",
              }}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
