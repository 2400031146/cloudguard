
import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  RefreshCw,
  Download,
  ShieldCheck,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

const API = "http://localhost:8080/api";

function getPolicies(data) {
  if (Array.isArray(data)) return data;
  return data?.policies || data?.Policies || data?.items || [];
}

function getPolicyId(policy) {
  return policy?.Id || policy?.id || policy?.policyId || "";
}

function getPolicyName(policy) {
  return (
    policy?.Name ||
    policy?.name ||
    policy?.policyName ||
    getPolicyId(policy) ||
    "Unnamed policy"
  );
}

function getFindings(data) {
  if (Array.isArray(data?.findings)) return data.findings;
  if (Array.isArray(data?.analysis?.findings)) {
    return data.analysis.findings;
  }
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getRecommendations(data) {
  if (Array.isArray(data?.recommendations)) {
    return data.recommendations;
  }
  if (Array.isArray(data?.analysis?.recommendations)) {
    return data.analysis.recommendations;
  }
  return [];
}

function findingText(finding) {
  if (typeof finding === "string") return finding;

  return (
    finding?.message ||
    finding?.description ||
    finding?.finding ||
    finding?.recommendation ||
    finding?.type ||
    JSON.stringify(finding)
  );
}

export default function AuditReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/scp-policies`);

      if (!response.ok) {
        throw new Error(`Could not load SCP policies (${response.status}).`);
      }

      const policyData = await response.json();
      const policies = getPolicies(policyData);

      const results = await Promise.all(
        policies.map(async (policy) => {
          const id = getPolicyId(policy);

          if (!id) {
            return {
              id: "",
              name: getPolicyName(policy),
              findings: [],
              recommendations: [],
              error: "Policy ID was not returned by the backend.",
            };
          }

          try {
            const analysisResponse = await fetch(
              `${API}/scp-policies/${encodeURIComponent(id)}/analysis`
            );

            if (!analysisResponse.ok) {
              throw new Error(
                `Analysis request failed (${analysisResponse.status}).`
              );
            }

            const analysis = await analysisResponse.json();

            return {
              id,
              name: getPolicyName(policy),
              findings: getFindings(analysis),
              recommendations: getRecommendations(analysis),
              analysisNote: analysis?.analysisNote || "",
              error: "",
            };
          } catch (err) {
            return {
              id,
              name: getPolicyName(policy),
              findings: [],
              recommendations: [],
              error: err.message || "Analysis failed.",
            };
          }
        })
      );

      setReports(results);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        `${err.message} Make sure the Spring Boot backend is running.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const totalFindings = reports.reduce(
    (sum, report) => sum + report.findings.length,
    0
  );

  const totalRecommendations = reports.reduce(
    (sum, report) => sum + report.recommendations.length,
    0
  );

  const analyzedPolicies = reports.filter((report) => !report.error).length;

  function exportCSV() {
    const rows = [
      ["Policy Name", "Policy ID", "Finding", "Recommendations", "Status"],
    ];

    reports.forEach((report) => {
      if (report.findings.length === 0) {
        rows.push([
          report.name,
          report.id,
          report.error ? report.error : "No findings returned",
          report.recommendations.map(findingText).join("; "),
          report.error ? "Analysis failed" : "Analyzed",
        ]);
      } else {
        report.findings.forEach((finding, index) => {
          rows.push([
            report.name,
            report.id,
            findingText(finding),
            index === 0
              ? report.recommendations.map(findingText).join("; ")
              : "",
            report.error ? "Analysis failed" : "Analyzed",
          ]);
        });
      }
    });

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cloudguard-audit-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <p className="audit-eyebrow">AWS GOVERNANCE</p>
          <h1>Audit Reports</h1>
          <p className="audit-subtitle">
            Review structural findings and recommendations from your SCP
            policies.
          </p>
        </div>

        <div className="audit-actions">
          <button
            className="audit-button secondary"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="audit-button primary"
            onClick={exportCSV}
            disabled={loading || reports.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="audit-notice">
        <ShieldCheck size={21} />
        <div>
          <strong>Read-only audit</strong>
          <p>
            Reports use the backend's SCP structural analyzer. Findings are
            informational and do not establish effective permissions or prove
            that an AWS account is secure or insecure.
          </p>
        </div>
      </div>

      {error && (
        <div className="audit-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="audit-stats">
        <div className="audit-stat">
          <FileText size={20} />
          <span>Policies loaded</span>
          <strong>{reports.length}</strong>
        </div>

        <div className="audit-stat">
          <ShieldCheck size={20} />
          <span>Analyzed successfully</span>
          <strong>{analyzedPolicies}</strong>
        </div>

        <div className="audit-stat">
          <AlertTriangle size={20} />
          <span>Findings returned</span>
          <strong>{totalFindings}</strong>
        </div>

        <div className="audit-stat">
          <FileText size={20} />
          <span>Recommendations</span>
          <strong>{totalRecommendations}</strong>
        </div>
      </div>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <h2>Policy Audit Results</h2>
            <p>
              Each policy is analyzed separately using the existing backend
              endpoint.
            </p>
          </div>

          {lastUpdated && (
            <span className="audit-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading ? (
          <div className="audit-state">
            <LoaderCircle className="audit-spinner" size={25} />
            <p>Loading policies and analyzing findings...</p>
          </div>
        ) : reports.length === 0 && !error ? (
          <div className="audit-state">
            <FileText size={30} />
            <p>No SCP policies were returned by the backend.</p>
          </div>
        ) : (
          <div className="audit-results">
            {reports.map((report, index) => (
              <details className="audit-report" key={report.id || index}>
                <summary>
                  <div className="audit-report-title">
                    <ShieldCheck size={19} />
                    <div>
                      <strong>{report.name}</strong>
                      <small>{report.id || "Policy ID unavailable"}</small>
                    </div>
                  </div>

                  <div className="audit-report-meta">
                    <span className="audit-count">
                      {report.findings.length} findings
                    </span>
                    <span className="audit-expand">View details</span>
                  </div>
                </summary>

                <div className="audit-report-body">
                  {report.error ? (
                    <div className="audit-error">
                      <AlertTriangle size={17} />
                      {report.error}
                    </div>
                  ) : (
                    <>
                      <h3>Findings</h3>

                      {report.findings.length === 0 ? (
                        <p className="audit-empty">
                          No findings were returned by the analyzer. This does
                          not by itself mean the policy is secure.
                        </p>
                      ) : (
                        <ul className="audit-list">
                          {report.findings.map((finding, i) => (
                            <li key={i}>{findingText(finding)}</li>
                          ))}
                        </ul>
                      )}

                      <h3>Recommendations</h3>

                      {report.recommendations.length === 0 ? (
                        <p className="audit-empty">
                          No separate recommendations were returned for this
                          policy.
                        </p>
                      ) : (
                        <ul className="audit-list recommendations">
                          {report.recommendations.map((item, i) => (
                            <li key={i}>{findingText(item)}</li>
                          ))}
                        </ul>
                      )}

                      {report.analysisNote && (
                        <p className="audit-note">{report.analysisNote}</p>
                      )}
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <p className="audit-footer">
        CloudGuard generates informational reports from the policies returned
        by AWS Organizations. Review findings before taking any action.
      </p>

      <style>{`
        .audit-page {
          color: #17233b;
          width: 100%;
          padding-bottom: 30px;
        }
        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 26px;
        }
        .audit-eyebrow {
          color: #526fe8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin: 0 0 12px;
        }
        .audit-header h1 {
          font-size: clamp(26px, 3vw, 36px);
          margin: 0 0 10px;
          letter-spacing: -1px;
        }
        .audit-subtitle {
          color: #71809a;
          line-height: 1.6;
          margin: 0;
        }
        .audit-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .audit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
        }
        .audit-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .audit-button.primary {
          background: #4563ef;
          color: white;
          border: 1px solid #4563ef;
        }
        .audit-button.secondary {
          background: white;
          color: #263858;
          border: 1px solid #dbe2ef;
        }
        .audit-notice {
          display: flex;
          gap: 13px;
          padding: 18px;
          border: 1px solid #dce5ff;
          border-radius: 13px;
          background: #f0f4ff;
          color: #3457bd;
          margin-bottom: 22px;
        }
        .audit-notice strong {
          display: block;
          margin-bottom: 5px;
        }
        .audit-notice p {
          margin: 0;
          color: #6379a8;
          font-size: 13px;
          line-height: 1.6;
        }
        .audit-error {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #fff4f2;
          color: #a5372b;
          border: 1px solid #ffd7d1;
          padding: 14px;
          border-radius: 10px;
          margin-bottom: 18px;
          overflow-wrap: anywhere;
        }
        .audit-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 25px;
        }
        .audit-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 9px;
          background: white;
          border: 1px solid #e4e9f2;
          border-radius: 13px;
          padding: 20px;
          box-shadow: 0 3px 12px rgba(23, 35, 59, .025);
        }
        .audit-stat svg {
          color: #5872e8;
        }
        .audit-stat span {
          color: #71809a;
          font-size: 13px;
        }
        .audit-stat strong {
          font-size: 29px;
          line-height: 1.2;
        }
        .audit-panel {
          background: white;
          border: 1px solid #e4e9f2;
          border-radius: 15px;
          overflow: hidden;
        }
        .audit-panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 22px;
          border-bottom: 1px solid #edf0f6;
        }
        .audit-panel-heading h2 {
          font-size: 18px;
          margin: 0 0 7px;
        }
        .audit-panel-heading p {
          font-size: 13px;
          color: #71809a;
          margin: 0;
          line-height: 1.5;
        }
        .audit-updated {
          font-size: 12px;
          color: #71809a;
          white-space: nowrap;
        }
        .audit-state {
          min-height: 170px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 25px;
          color: #71809a;
          text-align: center;
        }
        .audit-spinner {
          animation: audit-spin 1s linear infinite;
        }
        @keyframes audit-spin {
          to { transform: rotate(360deg); }
        }
        .audit-report {
          border-bottom: 1px solid #edf0f6;
        }
        .audit-report:last-child {
          border-bottom: none;
        }
        .audit-report summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 18px 22px;
          cursor: pointer;
          list-style: none;
        }
        .audit-report summary::-webkit-details-marker {
          display: none;
        }
        .audit-report summary:hover {
          background: #f8faff;
        }
        .audit-report-title {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .audit-report-title > svg {
          color: #5872e8;
          flex-shrink: 0;
        }
        .audit-report-title strong {
          display: block;
          overflow-wrap: anywhere;
        }
        .audit-report-title small {
          display: block;
          margin-top: 5px;
          color: #8490a5;
          font-size: 11px;
          overflow-wrap: anywhere;
        }
        .audit-report-meta {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-shrink: 0;
        }
        .audit-count {
          color: #5369c9;
          background: #eef2ff;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        .audit-expand {
          color: #7b879c;
          font-size: 12px;
        }
        .audit-report-body {
          padding: 4px 22px 22px;
          background: #fbfcff;
        }
        .audit-report-body h3 {
          font-size: 14px;
          margin: 17px 0 10px;
        }
        .audit-list {
          margin: 0;
          padding-left: 22px;
          color: #485875;
          font-size: 13px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }
        .audit-list li {
          padding-left: 3px;
          margin-bottom: 5px;
        }
        .audit-list.recommendations li::marker {
          color: #5371e8;
        }
        .audit-empty, .audit-note {
          color: #71809a;
          font-size: 13px;
          line-height: 1.7;
        }
        .audit-note {
          background: #f0f4ff;
          padding: 12px;
          border-radius: 8px;
        }
        .audit-footer {
          margin-top: 18px;
          color: #8490a5;
          font-size: 12px;
          line-height: 1.6;
        }
        @media (max-width: 1000px) {
          .audit-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 560px) {
          .audit-stats {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .audit-stat {
            padding: 14px;
          }
          .audit-panel-heading {
            flex-direction: column;
          }
          .audit-report summary {
            padding: 15px;
          }
          .audit-report-meta {
            align-items: flex-end;
            flex-direction: column;
            gap: 6px;
          }
          .audit-expand {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
