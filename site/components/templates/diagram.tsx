const COLORS: Record<string, string> = {
  "Venture type": "#1d4e89",
  Package: "#0f5c5c",
  "Decision docket": "#6b4c2a",
  Frame: "#3f3f46",
  Kit: "#1d4e89",
  Skill: "#2f5d3a",
  Handoff: "#6a3d55",
  Guide: "#1d4e89",
  Playbook: "#2f5d3a",
};

export function Diagram({ title, category, lines }: { title: string; category: string; lines: string[] }) {
  const color = COLORS[category] ?? "#1d4e89";
  const rows = lines.slice(0, 6);
  const label = `Diagram of ${title}. ${category}. ${rows.join(", ")}`;
  return (
    <svg viewBox="0 0 640 360" role="img" aria-label={label}>
      <rect width="640" height="360" fill="#eef2f6" />
      <rect x="36" y="32" width="568" height="296" rx="12" fill="#fff" stroke="#d7dde5" />
      <rect x="36" y="32" width="568" height="44" rx="12" fill={color} />
      <rect x="36" y="64" width="568" height="12" fill={color} />
      <text x="56" y="60" fill="#f7f8fa" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="16">
        {category}
      </text>
      <text x="56" y="112" fill="#1a1d23" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="20">
        {clip(title, 34)}
      </text>
      {rows.map((line, index) => (
        <g key={`${line}-${index}`}>
          <rect x="56" y={136 + index * 28} width="520" height="22" rx="6" fill="#eef2f6" />
          <text x="68" y={152 + index * 28} fill="#1a1d23" fontFamily="ui-monospace, monospace" fontSize="13">
            {clip(line, 52)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}
