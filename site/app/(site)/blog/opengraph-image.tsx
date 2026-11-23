import { OgCard, ogContentType, ogResponse, ogSize } from "@/components/blog/og-card";

export const alt = "Naive blog";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogResponse(OgCard({ kicker: "Blog", title: "Notes from the repository", footer: "Naive" }));
}
