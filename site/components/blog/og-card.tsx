import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function OgCard({ kicker, title, footer }: { kicker: string; title: string; footer: string }): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f7f8fa",
        color: "#172033",
      }}
    >
      <div style={{ width: 18, background: "#1d4e89" }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 1100,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#1d4e89" }}>
          <span>Naive</span>
          <span>{kicker}</span>
        </div>
        <div style={{ display: "flex", fontSize: 60, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#3f3f46" }}>{footer}</div>
      </div>
    </div>
  );
}

export function ogResponse(element: ReactElement) {
  return new ImageResponse(element, ogSize);
}
