

import { useEffect, useState } from "react";

import {

  LayoutDashboard,

  Network,

  ShieldCheck,

  FileText,

  Bell,

  Menu,

  Cloud,

  ChevronRight,

  LockKeyhole,

  Link2,

  X,

  LoaderCircle,

  CheckCircle2,

  Unplug,

} from "lucide-react";

import "./App.css";

import BackendStatus from "./api/BackendStatus";

import LiveOrganizationPage from "./api/LiveOrganizationPage";

import ScpPoliciesPage from "./api/ScpPoliciesPage";

import OverviewPage from "./pages/OverviewPage";

import AuditReportsPage from "./pages/AuditReportsPage";

const navigation = [

  { name: "Overview", icon: LayoutDashboard },

  { name: "Organization", icon: Network },

  { name: "SCP Policies", icon: ShieldCheck },

  { name: "Audit Reports", icon: FileText },

];

const API_BASE_URL =

  import.meta.env.VITE_API_BASE_URL || "https://cloudguard-backend-y40y.onrender.com/api";

export default function App() {

  const [active, setActive] = useState("Overview");

  const [connectionOpen, setConnectionOpen] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState(null);

  const [connectionLoading, setConnectionLoading] = useState(false);

  const [connectionError, setConnectionError] = useState("");

  const [accountId, setAccountId] = useState("");

  const [roleArn, setRoleArn] = useState("");

  const [externalId, setExternalId] = useState("");

  async function refreshConnectionStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/aws-connection`);
      if (!response.ok) {
        throw new Error("Could not read AWS connection status.");
      }
      setConnectionStatus(await response.json());
    } catch (error) {
      console.error("AWS connection status error:", error);
      setConnectionStatus(null);
    }
  }

  useEffect(() => {
    refreshConnectionStatus();
  }, []);

  async function handleConnect(event) {

    event.preventDefault();

    setConnectionLoading(true);

    setConnectionError("");

    try {

      const response = await fetch(

        `${API_BASE_URL}/aws-connection`,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            accountId: accountId.trim(),

            roleArn: roleArn.trim(),

            externalId: externalId.trim(),

          }),

        }

      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          data.detail ||

            data.message ||

            data.title ||

            "AWS connection failed. Check the role and trust policy."

        );

      }

      setConnectionStatus(data);

      setConnectionOpen(false);

      window.location.reload();

    } catch (error) {

      setConnectionError(

        error.message || "Unable to connect to AWS."

      );

    } finally {

      setConnectionLoading(false);

    }

  }

  async function handleDisconnect() {

    setConnectionLoading(true);

    setConnectionError("");

    try {

      const response = await fetch(

        `${API_BASE_URL}/aws-connection`,

        {

          method: "DELETE",

        }

      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          data.detail || "Could not disconnect AWS."

        );

      }

      setConnectionStatus(data);

      setConnectionOpen(false);

      window.location.reload();

    } catch (error) {

      setConnectionError(

        error.message || "Unable to disconnect AWS."

      );

    } finally {

      setConnectionLoading(false);

    }

  }

  return (

    <div className="app">

      <BackendStatus />

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">

            <Cloud size={23} />

          </div>

          <div className="brand-copy">

            <h2>CloudGuard</h2>

            <span>AWS GOVERNANCE</span>

          </div>

        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation" aria-label="Main navigation">

          {navigation.map(({ name, icon: Icon }) => (

            <button

              key={name}

              type="button"

              className={`nav-item ${

                active === name ? "selected" : ""

              }`}

              onClick={() => setActive(name)}

              aria-current={active === name ? "page" : undefined}

            >

              <Icon size={19} />

              <span>{name}</span>

              {active === name && (

                <ChevronRight className="nav-chevron" size={16} />

              )}

            </button>

          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="security-icon">

            <LockKeyhole size={20} />

          </div>

          <strong>Governance Center</strong>

          <p>

            Explore your AWS organization and manage governance

            through Service Control Policies.

          </p>

          <span className="status">

            <span />

            AWS workspace

          </span>

        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div className="breadcrumb">

            <Menu size={19} />

            <span>CloudGuard</span>

            <ChevronRight size={15} />

            <strong>{active}</strong>

          </div>

          <div className="top-actions">

            <span

              className={`connection-badge ${

                connectionStatus?.connected ? "connected" : ""

              }`}

            >

              <span />

              {connectionStatus?.connected

                ? `AWS ${connectionStatus.accountId}`

                : connectionStatus

                ? "Local AWS profile"

                : "AWS status unavailable"}

            </span>

            <button

              type="button"

              className="connect-button"

              onClick={() => {

                setConnectionError("");

                setConnectionOpen(true);

              }}

            >

              <Link2 size={16} />

              {connectionStatus?.connected

                ? "Change AWS Account"

                : "Connect AWS Account"}

            </button>

            <button

              type="button"

              className="icon-button"

              aria-label="Notifications"

              title="Notifications"

            >

              <Bell size={19} />

            </button>

            <div className="avatar" aria-label="Profile initials">

              AD

            </div>

          </div>

        </header>

        <section className="content">

          {active === "Overview" && (

            <OverviewPage setActive={setActive} />

          )}

          {active === "Organization" && (

            <LiveOrganizationPage />

          )}

          {active === "SCP Policies" && <ScpPoliciesPage />}

          {active === "Audit Reports" && <AuditReportsPage />}

        </section>

      </main>

      {connectionOpen && (

        <div

          className="connection-overlay"

          role="presentation"

          onMouseDown={(event) => {

            if (

              event.target === event.currentTarget &&

              !connectionLoading

            ) {

              setConnectionOpen(false);

            }

          }}

        >

          <section

            className="connection-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="connection-title"

          >

            <div className="connection-modal-header">

              <div className="connection-modal-icon">

                <Cloud size={22} />

              </div>

              <div>

                <h2 id="connection-title">

                  Connect an AWS account

                </h2>

                <p>

                  Use a read-only IAM role in your AWS Organizations

                  management account.

                </p>

              </div>

              <button

                className="connection-close"

                type="button"

                aria-label="Close"

                onClick={() => setConnectionOpen(false)}

                disabled={connectionLoading}

              >

                <X size={19} />

              </button>

            </div>

            <form

              className="connection-form"

              onSubmit={handleConnect}

            >

              <label>

                AWS account ID

                <input

                  value={accountId}

                  onChange={(event) =>

                    setAccountId(event.target.value)

                  }

                  inputMode="numeric"

                  pattern="\d{12}"

                  maxLength={12}

                  placeholder="123456789012"

                  required

                />

              </label>

              <label>

                IAM role ARN

                <input

                  value={roleArn}

                  onChange={(event) =>

                    setRoleArn(event.target.value)

                  }

                  placeholder="arn:aws:iam::123456789012:role/CloudGuardReadOnly"

                  required

                />

              </label>

              <label>

                External ID

                <input

                  value={externalId}

                  onChange={(event) =>

                    setExternalId(event.target.value)

                  }

                  placeholder="The external ID configured in the role trust policy"

                  required

                />

              </label>

              <div className="connection-help">

                <strong>Before connecting</strong>

                <ul>

                  <li>

                    The role must trust the AWS identity used by your

                    local <code>cloudguard</code> CLI profile.

                  </li>

                  <li>

                    The role needs read-only AWS Organizations

                    permissions used by CloudGuard.

                  </li>

                  <li>

                    CloudGuard never asks for your AWS password or

                    permanent access keys.

                  </li>

                </ul>

              </div>

              {connectionError && (

                <div className="connection-error" role="alert">

                  {connectionError}

                </div>

              )}

              <div className="connection-form-actions">

                {connectionStatus?.connected && (

                  <button

                    type="button"

                    className="disconnect-button"

                    onClick={handleDisconnect}

                    disabled={connectionLoading}

                  >

                    <Unplug size={16} />

                    Disconnect

                  </button>

                )}

                <button

                  type="button"

                  className="secondary-button"

                  onClick={() => setConnectionOpen(false)}

                  disabled={connectionLoading}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="connect-button"

                  disabled={connectionLoading}

                >

                  {connectionLoading ? (

                    <LoaderCircle className="spin" size={16} />

                  ) : (

                    <CheckCircle2 size={16} />

                  )}

                  {connectionLoading

                    ? "Connecting..."

                    : "Connect account"}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </div>

  );

}
