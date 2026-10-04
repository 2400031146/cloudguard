
import { useEffect, useState } from "react";
import { getOrganization } from "./api";

export default function OrganizationData() {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrganization()
      .then((data) => {
        setOrganization(data);
        setError("");
      })
      .catch((err) => {
        setError(err.message || "Unable to load AWS organization");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading AWS organization...</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>Could not load AWS organization.</p>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section>
      <h2>Live AWS Organization</h2>

      <p>
        <strong>Organization ID:</strong> {organization.id}
      </p>

      <p>
        <strong>Feature Set:</strong> {organization.featureSet}
      </p>

      <p>
        <strong>Management Account ID:</strong>{" "}
        {organization.masterAccountId}
      </p>
    </section>
  );
}