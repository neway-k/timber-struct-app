import React from "react";

export default function MetricCard({ label, value, isText = false }) {
  return (
    <div className="metric-card">
      <h4 className="metric-label">{label}</h4>
      <p className={isText ? "metric-value-text" : "metric-value"}>{value}</p>
    </div>
  );
}
