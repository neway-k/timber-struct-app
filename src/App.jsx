import React from "react";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Component & Page Imports
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import DashboardOverview from "./pages/DashboardOverview";
import ConnectionDesign from "./pages/ConnectionDesign";

// Protected Route Guard
function RequireAuth({ children }) {
  const auth = useAuth();
  return auth.user ? children : <Navigate to="/login" replace />;
}

// Master Dashboard Interface Layout
function DashboardLayout() {
  return (
    <div className="dashboard-root">
      <Sidebar />
      <main className="dashboard-content">
        <Routes>
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="connection-design" element={<ConnectionDesign />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
