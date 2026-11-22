// "use model" (EE-073): a package lists the steps that call a model. A record written
// downstream of one of those steps carries agent provenance until a person confirms it
// or its checks pass.

/** "clear" once a person confirmed it or its checks passed. Otherwise "agent". */
export function provenanceOf({ use_model, confirmed, checksPass }) {
  if (!Array.isArray(use_model) || use_model.length === 0) return "clear";
  if (confirmed || checksPass) return "clear";
  return "agent";
}
