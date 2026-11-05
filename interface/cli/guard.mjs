// The framework's global error for the command line (E-8, interface/boundaries.mjs). Imported first, so a
// broken data model or manifest answers with recovery steps before any module that reads it loads.
import { frameworkHealth, globalError } from "../boundaries.mjs";

const fw = frameworkHealth();
if (fw) { console.error(globalError(fw).error); process.exit(1); }
