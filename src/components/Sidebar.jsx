import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">⚙️ TimberStruct Studio</h3>
        <p className="sidebar-operator">User: Engineer {auth.user?.fullName}</p>
      </div>
      <nav className="sidebar-nav">
        <Link to="/dashboard/overview" className="nav-item">
          📊 Analytics Dashboard
        </Link>
        <Link to="/dashboard/connection-design" className="nav-item nav-active">
          🔩 Connection Design
        </Link>
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={() => {
            auth.logout();
            navigate("/login");
          }}
          className="btn-logout"
        >
          Logout Session
        </button>
      </div>
    </aside>
  );
}
