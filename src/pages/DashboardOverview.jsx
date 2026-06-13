import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import MetricCard from "../components/MetricCard";
import ProcurementPipeline from "../components/ProcurementPipeline";

export default function DashboardOverview() {
  const { user, calculations } = useAuth();
  const [dispatchState, setDispatchState] = useState({});

  const handleDispatch = (id) => {
    setDispatchState((prev) => ({ ...prev, [id]: 1 }));
    setTimeout(() => setDispatchState((prev) => ({ ...prev, [id]: 2 })), 1000);
    setTimeout(() => setDispatchState((prev) => ({ ...prev, [id]: 3 })), 2500);
  };

  // Clear calculation history from localStorage and refresh UI
  const clearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all calculation history? This cannot be undone.",
      )
    ) {
      localStorage.removeItem("ts_calculations_history");
      window.location.reload(); // Refresh to update UI
    }
  };

  return (
    <div className="overview-container">
      <h1 className="overview-headline">
        Welcome Back, Engineer {user?.fullName}
      </h1>
      <p className="overview-subheadline">
        Eurocode 5 Timber Connection Assessment Control Center.
      </p>

      <div className="metrics-grid">
        <MetricCard
          label="Total Verified Connections"
          value={calculations.length.toString()}
        />
        <MetricCard
          label="Active Verification Standard"
          value="Eurocode 5 Annex A"
          isText={true}
        />
      </div>

      <div className="data-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 className="card-title" style={{ margin: 0 }}>
            Calculation Audit History
          </h3>
          {calculations.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              🗑️ Clear History
            </button>
          )}
        </div>

        {calculations.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
            No calculations logged in this session yet.
          </p>
        ) : (
          <div className="audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Calculation ID</th>
                  <th>Design Element</th>
                  <th>Standard Mapping</th>
                  <th>Timestamp</th>
                  <th>Verification Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((item) => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.id}</td>
                    <td>{item.type}</td>
                    <td>{item.standard}</td>
                    <td className="text-muted">{item.date}</td>
                    <td>
                      <span
                        style={{
                          backgroundColor:
                            item.status === "Passed" || item.status === "SAFE"
                              ? "#dcfce7"
                              : "#fef2f2",
                          color:
                            item.status === "Passed" || item.status === "SAFE"
                              ? "#15803d"
                              : "#b91c1c",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {!dispatchState[item.id] ? (
                        <button
                          onClick={() => handleDispatch(item.id)}
                          style={{
                            padding: "5px 10px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                        >
                          🛒 Dispatch Order
                        </button>
                      ) : (
                        <ProcurementPipeline stage={dispatchState[item.id]} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
