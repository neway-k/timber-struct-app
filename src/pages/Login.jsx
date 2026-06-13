import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (auth.login(email, password)) {
      navigate("/dashboard/overview");
    } else {
      setError(
        "Invalid credentials. Verify your email and password configuration.",
      );
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleLogin} className="auth-form">
        <h2 className="auth-title">TimberStruct app Login</h2>
        <p className="auth-subtitle">
          Sign in to resume Eurocode 5 verification tracks.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            placeholder="engineer@firm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-submit">
          Sign In
        </button>
        <p className="auth-footer">
          New engineer?{" "}
          <Link to="/signup" className="auth-link">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
