
import { useEffect, useState } from "react";
import { checkBackendHealth } from "./api";

export default function BackendStatus() {
  const [status, setStatus] = useState("Checking backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setStatus(`${data.application}: ${data.status}`);
        setError("");
      })
      .catch((err) => {
        setStatus("Backend unavailable");
        setError(err.message);
      });
  }, []);

  return (
    <div style={{ padding: "12px", fontSize: "14px" }}>
      <strong>{status}</strong>
      {error && <p>{error}. Make sure Spring Boot is running in Eclipse.</p>}
    </div>
  );
}