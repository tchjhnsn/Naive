import { ImageResponse } from "next/og";

export function ogImage(title: string, description: string) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#ffffff", color: "#171717", padding: "72px", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 28, letterSpacing: "-0.03em", color: "#1d4e89" }}>Naive</div>
        <div style={{ marginTop: 36, fontSize: 68, lineHeight: 1.05, letterSpacing: "-0.04em", fontWeight: 600 }}>{title}</div>
        <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.4, color: "#3f3f46", maxWidth: 900 }}>{description}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
