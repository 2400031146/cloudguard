import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiFetch";
const API = "https://cloudguard-backend-y40y.onrender.com/api/scp-policies";

const styles = {
  page: {
    padding: "24px",
    color: "var(--text-primary, #e5e7eb)",
  },
  muted: {
    color: "var(--text-secondary, #9ca3af)",
    fontSize: "14px",
  },
  button: {
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1px solid #374151",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  },
  primary: {
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #2563eb",
  },
  card: {
    border: "1px solid var(--border, #374151)",
    borderRadius: "12px",
    padding: "18px",
    background: "var(--card-bg, #111827)",
    minWidth: 0,
  },
  input: {
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "var(--input-bg, #111827)",
    color: "var(--text-primary, #e5e7eb)",
    fontSize: "14px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "85vh",
    overflowY: "auto",
    background: "var(--modal-bg, #111827)",
    color: "var(--text-primary, #e5e7eb)",
    border: "1px solid #374151",
    borderRadius: "14px",
    padding: "24px",
  },
  pre: {
    background: "#030712",
    color: "#d1d5db",
    border: "1px solid #374151",
    borderRadius: "8px",
    padding: "14px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: "12px",
    lineHeight: 1.6,
  },
};

export default function ScpPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accountId, setAccountId] = useState("");
  const [applicablePolicies, setApplicablePolicies] = useState(null);
  const [applicableLoading, setApplicableLoading] = useState(false);
  const [applicableError, setApplicableError] = useState("");

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyDetails, setPolicyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [activeTab, setActiveTab] = useState("analysis");
  const [copyMessage, setCopyMessage] = useState("");

  async function loadPolicies() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/scp-policies");
      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load SCP policies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return policies;

    return policies.filter((policy) =>
      [policy.name, policy.id, policy.description, policy.arn].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [policies, search]);

  async function loadApplicablePolicies() {
    if (!/^\d{12}$/.test(accountId.trim())) {
      setApplicableError("Enter a valid 12-digit AWS account ID.");
      setApplicablePolicies(null);
      return;
    }

    setApplicableLoading(true);
    setApplicableError("");
    setApplicablePolicies(null);

    try {
      const response = await fetch(
        `${API}/applicable/${encodeURIComponent(accountId.trim())}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || `Request failed (${response.status})`
        );
      }

      setApplicablePolicies(data);
    } catch (err) {
      setApplicableError(
        err.message || "Unable to load applicable SCP policies."
      );
    } finally {
      setApplicableLoading(false);
    }
  }

  async function viewDetails(policy) {
    setSelectedPolicy(policy);
    setPolicyDetails(null);
    setDetailsError("");
    setAnalysis(null);
    setAnalysisError("");
    setCopyMessage("");
    setActiveTab("analysis");
    setDetailsLoading(true);

    try {
      const response = await fetch(
        `${API}/${encodeURIComponent(policy.id)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || `Unable to load policy details (${response.status}).`
        );
      }

      setPolicyDetails(data);
    } catch (err) {
      setDetailsError(err.message || "Unable to load policy details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function analyzePolicy() {
    if (!selectedPolicy) return;

    setAnalysis(null);
    setAnalysisError("");
    setAnalysisLoading(true);
    setActiveTab("analysis");

    try {
      const response = await fetch(
        `${API}/${encodeURIComponent(selectedPolicy.id)}/analysis`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || `Analysis failed (${response.status}).`
        );
      }

      setAnalysis(data);
    } catch (err) {
      setAnalysisError(err.message || "Unable to analyze this policy.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function copyPolicyContent() {
    if (!policyDetails?.content) return;

    try {
      let content = policyDetails.content;
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch {
          // Keep the original content if it is not JSON text.
        }
      }

      await navigator.clipboard.writeText(
        typeof content === "string" ? content : JSON.stringify(content, null, 2)
      );
      setCopyMessage("Copied!");
    } catch {
      setCopyMessage("Copy failed. Select and copy the JSON manually.");
    }
  }

  function closeModal() {
    setSelectedPolicy(null);
    setPolicyDetails(null);
    setAnalysis(null);
    setAnalysisError("");
    setDetailsError("");
    setCopyMessage("");
  }

  function formatJson(value) {
    if (value == null) return "No data available";

    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }

    return JSON.stringify(value, null, 2);
  }

  const buttonStyle = (primary = false) => ({
    ...styles.button,
    ...(primary
      ? styles.primary
      : {
          background: "var(--button-bg, #1f2937)",
          color: "var(--text-primary, #e5e7eb)",
        }),
  });

  const applicableAttachments = applicablePolicies?.policies || [];
  const uniqueApplicablePolicies = [
    ...new Map(
      applicableAttachments.map((policy) => [policy.id, policy])
    ).values(),
  ];

  return (
    <div style={styles.page}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
            SCP Policies
          </h1>
          <p style={styles.muted}>
            Inspect AWS Service Control Policies and analyze their rules.
          </p>
        </div>

        <button
          style={buttonStyle()}
          onClick={loadPolicies}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <section style={{ ...styles.card, marginBottom: "22px" }}>
        <h2 style={{ marginTop: 0 }}>Applicable Policies by Account</h2>
        <p style={styles.muted}>
          Enter a member account ID to view SCP attachments on that account and
          inherited from its root or parent OU.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            value={accountId}
            onChange={(event) =>
              setAccountId(event.target.value.replace(/\D/g, "").slice(0, 12))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") loadApplicablePolicies();
            }}
            placeholder="12-digit AWS account ID"
            aria-label="AWS account ID"
            inputMode="numeric"
            maxLength={12}
            style={{ ...styles.input, flex: "1", minWidth: "220px" }}
          />

          <button
            style={buttonStyle(true)}
            onClick={loadApplicablePolicies}
            disabled={applicableLoading}
          >
            {applicableLoading ? "Loading..." : "View Applicable Policies"}
          </button>
        </div>

        {applicableError && (
          <p role="alert" style={{ color: "#f87171" }}>
            {applicableError}
          </p>
        )}

        {applicablePolicies && (
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div style={styles.card}>
                <p style={styles.muted}>Policy attachments</p>
                <h2 style={{ marginBottom: 0 }}>{applicableAttachments.length}</h2>
              </div>
              <div style={styles.card}>
                <p style={styles.muted}>Unique policies</p>
                <h2 style={{ marginBottom: 0 }}>{uniqueApplicablePolicies.length}</h2>
              </div>
            </div>

            <p>
              <strong>Account:</strong> {applicablePolicies.accountId || accountId}
            </p>

            {applicablePolicies.managementAccount && (
              <p style={styles.muted}>
                This is the organization's management account. SCPs do not
                restrict permissions in the management account.
              </p>
            )}

            {applicablePolicies.note && (
              <p style={styles.muted}>{applicablePolicies.note}</p>
            )}

            <h3>Applicable SCP attachments</h3>
            {applicableAttachments.length === 0 ? (
              <p style={styles.muted}>No applicable SCP attachments were returned.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {applicableAttachments.map((policy, index) => (
                  <div
                    key={`${policy.id}-${policy.attachedTo || "target"}-${index}`}
                    style={styles.card}
                  >
                    <h3 style={{ overflowWrap: "anywhere", marginTop: 0 }}>
                      {policy.name || "Unnamed policy"}
                    </h3>
                    <p style={styles.muted}>
                      <strong>Policy ID:</strong> {policy.id}
                    </p>
                    <p style={styles.muted}>
                      <strong>Attached to:</strong> {policy.attachedTo || "Unknown target"}
                    </p>
                    <button
                      style={buttonStyle(true)}
                      onClick={() => viewDetails(policy)}
                    >
                      View Details & Analyze
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div style={styles.card}>
          <p style={styles.muted}>Total SCP policies</p>
          <h2 style={{ marginBottom: 0 }}>{policies.length}</h2>
        </div>
        <div style={styles.card}>
          <p style={styles.muted}>Matching search</p>
          <h2 style={{ marginBottom: 0 }}>{filteredPolicies.length}</h2>
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by policy name, ID, or description..."
        aria-label="Search SCP policies"
        style={{
          ...styles.input,
          width: "100%",
          marginBottom: "20px",
        }}
      />

      {loading && <p style={styles.muted}>Loading policies from AWS...</p>}

      {error && (
        <div
          role="alert"
          style={{ ...styles.card, borderColor: "#dc2626", marginBottom: "20px" }}
        >
          <strong>Could not load policies</strong>
          <p>{error}</p>
          <button style={buttonStyle()} onClick={loadPolicies}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filteredPolicies.length === 0 && (
        <div style={styles.card}>
          {policies.length === 0
            ? "No SCP policies were returned."
            : "No policies match your search."}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {filteredPolicies.map((policy) => (
          <div key={policy.id} style={styles.card}>
            <div style={{ fontSize: "25px", marginBottom: "12px" }}>🛡️</div>
            <div style={styles.muted}>AWS SCP</div>
            <h3 style={{ overflowWrap: "anywhere" }}>
              {policy.name || "Unnamed policy"}
            </h3>
            <p style={{ ...styles.muted, lineHeight: 1.6 }}>
              {policy.description || "No description provided."}
            </p>
            <p style={{ fontSize: "12px", overflowWrap: "anywhere" }}>
              <strong>Policy ID:</strong> {policy.id}
            </p>
            <button
              style={buttonStyle(true)}
              onClick={() => viewDetails(policy)}
            >
              View details & Analyze
            </button>
          </div>
        ))}
      </div>

      {selectedPolicy && (
        <div style={styles.overlay} onClick={closeModal}>
          <div
            style={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scp-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <h2 id="scp-modal-title" style={{ marginTop: 0 }}>
                  {selectedPolicy.name}
                </h2>
                <p style={styles.muted}>
                  Inspect the policy document or run the SCP analyzer.
                </p>
              </div>
              <button
                style={buttonStyle()}
                onClick={closeModal}
                aria-label="Close policy dialog"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                margin: "20px 0",
              }}
            >
              <button
                style={buttonStyle(activeTab === "analysis")}
                onClick={() => setActiveTab("analysis")}
              >
                Analysis
              </button>
              <button
                style={buttonStyle(activeTab === "document")}
                onClick={() => setActiveTab("document")}
              >
                Policy document
              </button>
            </div>

            {activeTab === "analysis" && (
              <div>
                <button
                  style={buttonStyle(true)}
                  onClick={analyzePolicy}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Analyzing..." : "▶ Analyze Policy"}
                </button>

                {analysisLoading && (
                  <p style={styles.muted}>
                    Inspecting statements, effects, actions, and conditions...
                  </p>
                )}

                {analysisError && (
                  <div
                    role="alert"
                    style={{ ...styles.card, borderColor: "#dc2626", marginTop: "16px" }}
                  >
                    <strong>Analysis failed</strong>
                    <p>{analysisError}</p>
                  </div>
                )}

                {analysis && (
                  <div style={{ marginTop: "20px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <div style={styles.card}>
                        <p style={styles.muted}>Statements</p>
                        <h2>{analysis.statementCount ?? analysis.statements?.length ?? 0}</h2>
                      </div>
                      <div style={styles.card}>
                        <p style={styles.muted}>Findings</p>
                        <h2>{analysis.findingsCount ?? analysis.findings?.length ?? 0}</h2>
                      </div>
                      <div style={styles.card}>
                        <p style={styles.muted}>Policy version</p>
                        <h2 style={{ fontSize: "18px" }}>
                          {analysis.version || "Not specified"}
                        </h2>
                      </div>
                    </div>

                    <h3>Findings</h3>
                    {analysis.findings?.length > 0 ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {analysis.findings.map((finding, index) => (
                          <div
                            key={`${finding.code}-${finding.statementId}-${index}`}
                            style={{ ...styles.card, borderLeft: "4px solid #d97706" }}
                          >
                            <strong>{finding.title}</strong>
                            <p style={styles.muted}>Code: {finding.code}</p>
                            <p>
                              <strong>Statement:</strong> {finding.statementId || "Not specified"}
                            </p>
                            <p>{finding.explanation}</p>
                            {finding.recommendation && (
                              <p>
                                <strong>Recommendation:</strong> {finding.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.muted}>No findings were returned by the analyzer.</p>
                    )}

                    <h3>Statement breakdown</h3>
                    {analysis.statements?.map((statement, index) => (
                      <div
                        key={`${statement.sid || "statement"}-${index}`}
                        style={{ ...styles.card, marginBottom: "12px" }}
                      >
                        <h4 style={{ overflowWrap: "anywhere" }}>
                          {statement.sid || `Statement ${index + 1}`}
                        </h4>
                        <p>
                          <strong>Effect:</strong>{" "}
                          <span
                            style={{
                              color:
                                statement.effect === "Deny"
                                  ? "#f87171"
                                  : statement.effect === "Allow"
                                  ? "#4ade80"
                                  : "#fbbf24",
                            }}
                          >
                            {statement.effect || "Not specified"}
                          </span>
                        </p>
                        <p><strong>Action:</strong></p>
                        <pre style={styles.pre}>{formatJson(statement.action)}</pre>

                        {statement.notAction != null && (
                          <>
                            <p><strong>NotAction:</strong></p>
                            <pre style={styles.pre}>{formatJson(statement.notAction)}</pre>
                          </>
                        )}

                        <p><strong>Resource:</strong></p>
                        <pre style={styles.pre}>{formatJson(statement.resource)}</pre>

                        {statement.condition != null && (
                          <>
                            <p><strong>Condition:</strong></p>
                            <pre style={styles.pre}>{formatJson(statement.condition)}</pre>
                          </>
                        )}

                        {statement.explanation && <p>{statement.explanation}</p>}
                      </div>
                    ))}

                    {analysis.analysisNote && (
                      <p style={styles.muted}>{analysis.analysisNote}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "document" && (
              <div>
                <p><strong>Policy ID:</strong> {selectedPolicy.id}</p>
                <p style={{ overflowWrap: "anywhere" }}>
                  <strong>ARN:</strong>{" "}
                  {policyDetails?.arn || selectedPolicy.arn || "Unavailable"}
                </p>
                <p>
                  <strong>Description:</strong>{" "}
                  {policyDetails?.description ||
                    selectedPolicy.description ||
                    "No description provided."}
                </p>

                {detailsLoading && (
                  <p style={styles.muted}>Loading policy document...</p>
                )}
                {detailsError && <p role="alert">{detailsError}</p>}

                {policyDetails && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3>Policy JSON</h3>
                      <button style={buttonStyle()} onClick={copyPolicyContent}>
                        Copy JSON
                      </button>
                      {copyMessage && <span style={styles.muted}>{copyMessage}</span>}
                    </div>
                    <pre style={styles.pre}>{formatJson(policyDetails.content)}</pre>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
