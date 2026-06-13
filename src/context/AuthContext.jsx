import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 1. የተጠቃሚ ሴሽን (User Session)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("ts_active_session");
    return saved ? JSON.parse(saved) : null;
  });

  // 2. የስሌት ታሪክ (Calculations History) - ከlocalStorage በመጫን ላይ
  const [calculations, setCalculations] = useState(() => {
    const savedCalcs = localStorage.getItem("ts_calculations_history");
    return savedCalcs ? JSON.parse(savedCalcs) : [];
  });

  // 3. Global Form State
  const [connectionFormData, setConnectionFormData] = useState({
    slabThickness: 140,
    beamWidth: 200,
    screwDiameter: 8,
    screwLength: 220,
    woodDensity: 420,
    timberGrade: "GL24h",
    shearLoad: 25.0,
  });

  // ስሌት ሲጨመር በየጊዜው localStorage ላይ ማዘመን
  const addCalculation = (newCalc) => {
    setCalculations((prev) => {
      const updated = [newCalc, ...prev];
      localStorage.setItem("ts_calculations_history", JSON.stringify(updated));
      return updated;
    });
  };

  // 4. የተጠቃሚ መመዝገቢያ (Register)
  const register = (fullName, email, password) => {
    const users = JSON.parse(localStorage.getItem("timberstruct_db") || "{}");
    const normalizedEmail = email.toLowerCase().trim();
    if (users[normalizedEmail])
      return { success: false, msg: "Account already exists." };

    users[normalizedEmail] = { fullName: fullName.trim(), password };
    localStorage.setItem("timberstruct_db", JSON.stringify(users));
    return { success: true };
  };

  // 5. መግቢያ (Login)
  const login = (email, password) => {
    const normalizedEmail = email.toLowerCase().trim();
    const users = JSON.parse(localStorage.getItem("timberstruct_db") || "{}");

    if (
      normalizedEmail === "admin@timberstruct.com" &&
      password === "eurocode5"
    ) {
      const activeUser = {
        fullName: "Admin Developer",
        email: normalizedEmail,
      };
      setUser(activeUser);
      localStorage.setItem("ts_active_session", JSON.stringify(activeUser));
      return true;
    }
    if (
      users[normalizedEmail] &&
      users[normalizedEmail].password === password
    ) {
      const activeUser = {
        fullName: users[normalizedEmail].fullName,
        email: normalizedEmail,
      };
      setUser(activeUser);
      localStorage.setItem("ts_active_session", JSON.stringify(activeUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ts_active_session");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        calculations,
        addCalculation,
        connectionFormData,
        setConnectionFormData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
