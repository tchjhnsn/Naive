// The same filter the templates page applies. Every combination returns an array.
// A combination that matches nothing returns an empty array.

export function applyFilters(items, query = {}) {
  const kinds = query.kinds ?? [];
  const categories = query.categories ?? [];
  const frameworks = query.frameworks ?? [];
  const uses = query.uses ?? [];
  const q = String(query.q ?? "").trim().toLowerCase();
  return items.filter((item) => {
    const itemKinds = item.kinds ?? [item.kind];
    if (kinds.length && !kinds.some((kind) => itemKinds.includes(kind))) return false;
    if (categories.length && !categories.includes(item.category)) return false;
    if (frameworks.length && !frameworks.includes(item.framework ?? "")) return false;
    if (uses.length && !(item.useCases ?? []).some((useCase) => uses.includes(useCase.id))) return false;
    if (!q) return true;
    const haystack = [
      item.title,
      item.description,
      item.category,
      item.source,
      item.framework ?? "",
      ...(item.useCases ?? []).map((useCase) => `${useCase.label} ${useCase.id}`),
      ...(item.commands ?? []).map((command) => command.text),
      ...(item.prompts ?? []).map((prompt) => prompt.text),
    ].join("\n").toLowerCase();
    return haystack.includes(q);
  });
}
