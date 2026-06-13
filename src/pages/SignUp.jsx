import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = auth.register(fullName, email, password);
    setLoading(false);
    if (res.success) {
      navigate("/login");
    } else {
      setError(res.msg);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSignUp} className="auth-form">
        <h2 className="auth-title">Create Engineering Account</h2>
        <p className="auth-subtitle">
          Provide your professional metadata profile.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., New-way.K"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Corporate Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="name@firm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Secure Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Registering..." : "Register Account"}
        </button>
        <p className="auth-footer">
          Already registered?{" "}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
