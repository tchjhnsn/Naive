"""Validates every record in the repository against its JSON Schema (EE-017).

    python3 schema/validate.py

Needs the jsonschema package (pip install jsonschema). Which files each schema governs comes from schema/data-model.json;
schema/check-data-model.mjs makes sure no JSON file is left without a record type.
"""
import glob, json, sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    sys.exit("validate.py needs jsonschema: pip install jsonschema")

root = Path(__file__).resolve().parent.parent
# The data model names every record type, its schema and where its records live (EE-018).
# Only JSON records with a schema under schema/ are validated here; the methodology catalog's
# Markdown records are validated by ee.mjs.
model = json.loads((root / "schema/data-model.json").read_text())
RULES = [(r["id"], r["schema"], r.get("form") == "json-list", r["paths"]) for r in model["records"]
         if r["schema"] and r["schema"].startswith("schema/") and r.get("form", "json") in ("json", "json-list")]
from referencing import Registry, Resource

# Every schema is registered by its $id, so one may $ref another (or itself) by file name.
schemas = {p.name: json.loads(p.read_text()) for p in (root / "schema").glob("*.schema.json")}
registry = Registry().with_resources((s.get("$id", n), Resource.from_contents(s)) for n, s in schemas.items())
failed = checked = 0
for name, schema, is_list, globs in RULES:
    v = jsonschema.Draft202012Validator(schemas[Path(schema).name], registry=registry, format_checker=jsonschema.FormatChecker())
    for g in globs:
        for f in sorted(glob.glob(str(root / g), recursive=True)):
            data = json.loads(Path(f).read_text())
            docs = data if is_list else [data]
            for d in docs:
                checked += 1
                for e in v.iter_errors(d):
                    failed += 1
                    print(f"{Path(f).relative_to(root)}: {'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message}")
print(f"{checked} records checked against their schemas: {'all valid' if not failed else f'{failed} error(s)'}.")
sys.exit(1 if failed else 0)
