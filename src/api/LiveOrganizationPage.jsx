
import { useEffect, useState } from "react";
import { getOrganization } from "./api";
import { apiFetch } from "./apiFetch";
function countUnits(units = []) {
  return units.reduce(
    (total, unit) => total + 1 + countUnits(unit.units || []),
    0
  );
}

function countAccounts(node) {
  return (
    (node.accounts || []).length +
    (node.units || []).reduce(
      (total, unit) => total + countAccounts(unit),
      0
    )
  );
}

function TreeNode({ node, selected, onSelect, level = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selected?.id === node.id;
  const hasChildren =
    (node.units?.length || 0) > 0 ||
    (node.accounts?.length || 0) > 0;

  const icon =
    node.type === "root" ? "☁️" :
    node.type === "ou" ? "📁" : "🗄️";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          marginLeft: level * 18,
          borderRadius: 8,
          background: isSelected ? "#e8f0ff" : "transparent",
          border: isSelected ? "1px solid #9bbcff" : "1px solid transparent",
          cursor: "pointer",
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse" : "Expand"}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span style={{ width: 14 }} />
        )}

        <button
          onClick={() => onSelect(node)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            textAlign: "left",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          <span>{icon}</span>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <strong style={{ display: "block" }}>{node.name}</strong>
            <small style={{ color: "#64748b" }}>{node.id}</small>
          </span>
        </button>
      </div>

      {expanded && (
        <div>
          {(node.units || []).map((unit) => (
            <TreeNode
              key={unit.id}
              node={unit}
              selected={selected}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}

          {(node.accounts || []).map((account) => (
            <TreeNode
              key={account.id}
              node={{
                ...account,
                type: "account",
                units: [],
                accounts: [],
              }}
              selected={selected}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiveOrganizationPage() {
  const [organization, setOrganization] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrganization() {
    setLoading(true);
    setError("");

    try {
      const data = await getOrganization();
      setOrganization(data);

      const firstRoot = data.roots?.[0];

      setSelected(
        firstRoot
          ? {
              ...firstRoot,
              type: "root",
              name: firstRoot.name || "Organization Root",
            }
          : {
              id: data.id,
              name: "AWS Organization",
              type: "organization",
            }
      );
    } catch (err) {
      setError(err.message || "Could not load AWS organization data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganization();
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading live AWS organization...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Could not load organization</h2>
        <p>{error}</p>
        <button onClick={loadOrganization}>Try again</button>
      </div>
    );
  }

  const roots = organization.roots || [];
  const totalUnits = roots.reduce(
    (total, root) => total + countUnits(root.units || []),
    0
  );
  const totalAccounts = roots.reduce(
    (total, root) => total + countAccounts(root),
    0
  );

  const selectedType =
    selected?.type === "ou"
      ? "Organizational unit"
      : selected?.type === "account"
        ? "AWS account"
        : selected?.type === "root"
          ? "Organization root"
          : "Organization";

  return (
    <div style={{ padding: 24, color: "inherit" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ color: "#64748b", fontSize: 12 }}>
            AWS ORGANIZATIONS / STRUCTURE
          </p>
          <h1>Organization Structure</h1>
          <p>Live organizational units and AWS accounts.</p>
        </div>

        <span
          style={{
            padding: "7px 12px",
            borderRadius: 20,
            background: "#dcfce7",
            color: "#166534",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          LIVE AWS DATA
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <SummaryCard label="Organizational units" value={totalUnits} />
        <SummaryCard label="Accounts" value={totalAccounts} />
        <SummaryCard
          label="Management account"
          value={organization.masterAccountId || "Unavailable"}
        />
        <SummaryCard
          label="Feature set"
          value={organization.featureSet || "Unavailable"}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2>Organization hierarchy</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Select a resource to view its details.
          </p>

          <button
            onClick={() =>
              setSelected({
                id: organization.id,
                name: "AWS Organization",
                type: "organization",
              })
            }
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: 12,
              margin: "12px 0",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              cursor: "pointer",
            }}
          >
            ☁️ <strong>AWS Organization</strong>
            <br />
            <small>{organization.id}</small>
          </button>

          {roots.length === 0 ? (
            <p>No organization roots were returned by AWS.</p>
          ) : (
            roots.map((root) => (
              <TreeNode
                key={root.id}
                node={{
                  ...root,
                  name: root.name || "Organization Root",
                  type: "root",
                }}
                selected={selected}
                onSelect={setSelected}
              />
            ))
          )}
        </section>

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
            overflowWrap: "anywhere",
          }}
        >
          <h2>Selected resource</h2>

          {selected ? (
            <>
              <p style={{ fontSize: 30 }}>
                {selected.type === "ou"
                  ? "📁"
                  : selected.type === "account"
                    ? "🗄️"
                    : "☁️"}
              </p>

              <h3>{selected.name}</h3>

              <Detail label="Resource type" value={selectedType} />
              <Detail label="Identifier" value={selected.id} />
              <Detail
                label="Data source"
                value="AWS Organizations API"
              />

              {selected.type === "account" && (
                <>
                  <Detail
                    label="Account type"
                    value={selected.type === "account" ? selected.name : ""}
                  />
                  <Detail
                    label="Email"
                    value={selected.email || "Not returned"}
                  />
                  <Detail
                    label="Status"
                    value={selected.status || "Not returned"}
                  />
                </>
              )}

              {selected.type === "organization" && (
                <>
                  <Detail label="ARN" value={organization.arn} />
                  <Detail
                    label="Feature set"
                    value={organization.featureSet}
                  />
                  <Detail
                    label="Management account ID"
                    value={organization.masterAccountId}
                  />
                </>
              )}
            </>
          ) : (
            <p>Select a resource from the hierarchy.</p>
          )}
        </section>
      </div>

      <button
        onClick={loadOrganization}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          cursor: "pointer",
        }}
      >
        ↻ Refresh AWS data
      </button>

      <p style={{ color: "#64748b", fontSize: 12, marginTop: 20 }}>
        CloudGuard · Read-only organization view
      </p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <strong style={{ display: "block", marginTop: 8 }}>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <small style={{ color: "#64748b", display: "block" }}>
        {label}
      </small>
      <strong>{value || "Unavailable"}</strong>
    </div>
  );
}