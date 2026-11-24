export function applyFilters<T extends {
  kind: string;
  kinds?: string[];
  category: string;
  framework?: string | null;
  title: string;
  description: string;
  source: string;
  useCases?: { id: string; label: string }[];
  commands?: { text: string }[];
  prompts?: { text: string }[];
}>(items: T[], query?: {
  q?: string;
  kinds?: string[];
  categories?: string[];
  frameworks?: string[];
  uses?: string[];
}): T[];
