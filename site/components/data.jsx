// Pages render the repository's own data through these components; scripts/data.mjs writes it
// before every build, so a page that lists routes, nouns, kits or decisions cannot go stale.
import decisions from "../generated/decisions.json";
import groups from "../generated/groups.json";
import kits from "../generated/kits.json";
import nouns from "../generated/nouns.json";
import routes from "../generated/routes.json";

const Code = ({ children }) => <code>{children}</code>;

export function RouteTable({ kind, gated }) {
  const rows = routes.filter((r) => (!kind || r.kind === kind) && (!gated || r.decision_class));
  return (
    <table>
      <thead><tr><th>Route</th><th>Actions</th><th>Files or script</th><th>Decision class</th><th>What it is</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.route}>
            <td><Code>{r.route}</Code></td>
            <td>{r.actions.join(", ")}</td>
            <td>{r.files ? r.files.map((f) => <Code key={f}>{f}</Code>) : r.script ? <Code>{r.script}</Code> : "router"}</td>
            <td>{r.decision_class ?? ""}</td>
            <td>{r.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Groups() {
  return (
    <table>
      <thead><tr><th>Group</th><th>The phase asks</th><th>Routes</th></tr></thead>
      <tbody>{groups.map((g) => <tr key={g.group}><td><Code>{g.group}</Code></td><td>{g.question}</td><td>{g.routes.length}</td></tr>)}</tbody>
    </table>
  );
}

export function Glossary({ level }) {
  const rows = nouns.filter((n) => !level || n.level === level);
  return (
    <table>
      <thead><tr><th>Noun</th><th>Level</th><th>Meaning</th><th>Standard</th></tr></thead>
      <tbody>{rows.map((n) => <tr key={`${n.level}-${n.noun}`}><td><b>{n.noun}</b></td><td>{n.level}</td><td>{n.meaning}</td><td>{n.standard}</td></tr>)}</tbody>
    </table>
  );
}

export function Kits() {
  return (
    <table>
      <thead><tr><th>Kit</th><th>Layer</th><th>Purpose</th><th>Skills</th><th>Records</th></tr></thead>
      <tbody>{kits.map((k) => <tr key={k.path}><td><Code>{k.path}</Code></td><td>{k.layer}</td><td>{k.purpose}</td><td>{k.skills}</td><td>{k.records.join(", ")}</td></tr>)}</tbody>
    </table>
  );
}

export function Decisions() {
  return (
    <table>
      <thead><tr><th>Id</th><th>Date</th><th>Decision</th></tr></thead>
      <tbody>{[...decisions].reverse().map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.date}</td><td>{d.decision}</td></tr>)}</tbody>
    </table>
  );
}
