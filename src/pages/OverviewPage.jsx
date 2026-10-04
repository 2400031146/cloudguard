import { useEffect, useState } from "react";
import { apiFetch } from "../api/apiFetch";
import {
  Activity,
  CircleCheck,
  CircleX,
  ChevronRight,
  FileText,
  FlaskConical,
  LockKeyhole,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api";


async function getJson(path) {
  const endpoint = path.startsWith("/")
    ? path
    : `/${path}`;

  const response = await apiFetch(endpoint);

  if (!response.ok) {
    throw new Error(
      `Backend request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}


function collectOrganizationStats(data) {
  let organizationalUnits = 0;
  let memberAccounts = 0;

  function walkUnits(units = []) {
    for (const unit of units) {
      organizationalUnits += 1;
      memberAccounts += Array.isArray(unit.accounts) ? unit.accounts.length : 0;
      walkUnits(unit.units || unit.children || []);
    }
  }

  const roots = Array.isArray(data?.roots)
    ? data.roots
    : Array.isArray(data?.organization?.roots)
      ? data.organization.roots
      : [];

  for (const root of roots) {
    memberAccounts += Array.isArray(root.accounts) ? root.accounts.length : 0;
    walkUnits(root.units || root.children || []);
  }

  // Also support APIs that return flat summary fields.
  if (!organizationalUnits && Number.isFinite(Number(data?.organizationalUnitCount))) {
    organizationalUnits = Number(data.organizationalUnitCount);
  }
  if (!memberAccounts && Number.isFinite(Number(data?.accountCount))) {
    memberAccounts = Number(data.accountCount);
  }

  return { organizationalUnits, memberAccounts };
}

function getPolicyList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.policies)) return data.policies;
  if (Array.isArray(data?.Policies)) return data.Policies;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function ModuleCard({ icon: Icon, number, title, description, status, onClick }) {
  return (
    <button className="module-card" onClick={onClick}>
      <div className="module-top">
        <div className="module-icon"><Icon size={22} /></div>
        <span>{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="module-footer"><span>{status}</span><ChevronRight size={17} /></div>
    </button>
  );
}

export default function OverviewPage({ setActive }) {
  const [organization, setOrganization] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");

    try {
      const [orgData, policyData] = await Promise.all([
        getJson("/organization"),
        getJson("/scp-policies"),
      ]);
      setOrganization(orgData);
      setPolicies(getPolicyList(policyData));
    } catch (err) {
      setError(err?.message || "Could not load live AWS data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const orgStats = collectOrganizationStats(organization);

  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">AWS ORGANIZATIONS • SERVICE CONTROL POLICIES</p>
          <h1>Cloud Governance Overview</h1>
          <p className="subtitle">
            Monitor your live organization structure and Service Control Policies.
          </p>
        </div>
        <button className="primary-button" onClick={() => setActive("SCP Policies")}>
          <ShieldCheck size={17} /> Explore SCP Policies
        </button>
      </div>

      <div className={`notice ${error ? "notice-error" : ""}`}>
        {error ? <CircleX size={19} /> : <Activity size={19} />}
        <div>
          <strong>
            {loading ? "Loading live AWS data…" : error ? "Unable to load live AWS data" : "Live AWS data"}
          </strong>
          <p>
            {loading
              ? "Connecting to the CloudGuard backend to retrieve your organization and SCP policies."
              : error
                ? `${error} Make sure the Spring Boot backend is running on port 8080.`
                : "Overview counts are loaded from the backend. This page does not modify AWS resources."}
          </p>
          {error && <button className="secondary-button" onClick={loadOverview}>Retry</button>}
        </div>
      </div>

      <div className="stats">
        <StatCard
          icon={Network}
          label="Organizational Units"
          value={loading ? "…" : orgStats.organizationalUnits}
          detail="From AWS Organizations"
        />
        <StatCard
          icon={Users}
          label="Member Accounts"
          value={loading ? "…" : orgStats.memberAccounts}
          detail="From AWS Organizations"
        />
        <StatCard
          icon={ShieldCheck}
          label="SCP Policies"
          value={loading ? "…" : policies.length}
          detail="Policies returned by backend"
        />
      </div>

      <div className="section-heading">
        <div>
          <h2>Governance Workspace</h2>
          <p>Open a module to explore your AWS governance data.</p>
        </div>
        <button className="secondary-button" onClick={() => setActive("Organization")}>
          View organization <ChevronRight size={16} />
        </button>
      </div>

      <div className="module-grid">
        <ModuleCard
          icon={Network}
          number="01"
          title="Organization Structure"
          description="Explore your organization, organizational units, and member accounts."
          status="Open live organization"
          onClick={() => setActive("Organization")}
        />
        <ModuleCard
          icon={ShieldCheck}
          number="02"
          title="SCP Policy Manager"
          description="View attached policies, inspect policy JSON, and run structural analysis."
          status="Open policy manager"
          onClick={() => setActive("SCP Policies")}
        />
        <ModuleCard
          icon={FlaskConical}
          number="03"
          title="Policy Tester"
          description="Workspace for testing and understanding policy behavior."
          status="Open policy tester"
          onClick={() => setActive("Policy Tester")}
        />
        <ModuleCard
          icon={FileText}
          number="04"
          title="Audit & Reports"
          description="Workspace for governance findings and report generation."
          status="Open audit reports"
          onClick={() => setActive("Audit Reports")}
        />
      </div>

      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Connection Summary</h3>
              <p>Latest overview data request</p>
            </div>
            <Activity size={19} />
          </div>
          <div className="activity-row">
            {organization ? <CircleCheck size={19} /> : <CircleX size={19} />}
            <div>
              <strong>Organization API</strong>
              <p>{organization ? "Organization data loaded successfully." : loading ? "Loading organization data…" : "Organization data unavailable."}</p>
            </div>
            <span>{organization ? "Loaded" : loading ? "Loading" : "Error"}</span>
          </div>
          <div className="activity-row">
            {!loading && !error ? <CircleCheck size={19} /> : <Activity size={19} />}
            <div>
              <strong>SCP Policies API</strong>
              <p>{loading ? "Loading policies…" : error ? "Check backend connection." : `${policies.length} policies returned.`}</p>
            </div>
            <span>{loading ? "Loading" : error ? "Check" : "Loaded"}</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Security Principles</h3>
              <p>Core concepts behind CloudGuard</p>
            </div>
            <LockKeyhole size={19} />
          </div>
          <div className="principle">
            <CircleCheck size={18} />
            <span><strong>Least privilege</strong><small>Limit permissions to what is required.</small></span>
          </div>
          <div className="principle">
            <CircleCheck size={18} />
            <span><strong>Central governance</strong><small>Review controls across member accounts.</small></span>
          </div>
          <div className="principle">
            <CircleCheck size={18} />
            <span><strong>Safe analysis</strong><small>Inspect policies without changing AWS resources.</small></span>
          </div>
        </div>
      </div>

      <footer>CloudGuard · AWS Organizations & SCPs · Read-only overview</footer>
    </>
  );
}
