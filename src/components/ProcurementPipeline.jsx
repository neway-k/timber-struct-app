import React from "react";

export default function ProcurementPipeline({ stage }) {
  if (stage === 0) return null;

  return (
    <div
      className="pipeline-container"
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: stage >= 1 ? "#3b82f6" : "#94a3b8",
          fontWeight: "bold",
        }}
      >
        💻 Platform
      </span>
      <span style={{ color: "#cbd5e1" }}>➔</span>
      <span
        style={{
          fontSize: "11px",
          color: stage >= 2 ? "#06b6d4" : "#94a3b8",
          fontWeight: "bold",
        }}
      >
        ☁️ AWS/ SQS
      </span>
      <span style={{ color: "#cbd5e1" }}>➔</span>
      <span
        style={{
          fontSize: "11px",
          color: stage >= 3 ? "#10b981" : "#94a3b8",
          fontWeight: "bold",
        }}
      >
        🏢 ERP
      </span>
    </div>
  );
}
