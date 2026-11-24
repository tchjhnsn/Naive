import Link from "next/link";

export default function TemplatesNotFound() {
  return (
    <div className="tpl-main">
      <h1>Record not found</h1>
      <p className="tpl-lead">That slug is not in the catalog built from this repository.</p>
      <p><Link className="tpl-back" href="/templates">Templates and playbooks</Link></p>
    </div>
  );
}
