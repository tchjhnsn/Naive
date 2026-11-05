"""Validates every record in the repository against its JSON Schema (EE-017).

    python3 schema/validate.py
    python3 schema/validate.py --schema <name>.schema.json --file <path>   one file (used by the interfaces before a write)
    python3 schema/validate.py --schema <name>.schema.json --def <name> --file <path>   one file against one $defs entry

Needs the jsonschema package (pip install jsonschema). Which files each schema governs comes from schema/data-model.json;
schema/check-data-model.mjs makes sure no JSON file is left without a record type.
"""
import glob, json, os, sys, traceback
from pathlib import Path

# Exit 1 means the record failed validation. Exit 2 means the checker itself failed, and the
# membership gate must not record that as a reject. SystemExit keeps the code it was given.
def tool_crash(kind, value, tb):
    traceback.print_exception(kind, value, tb)
    os._exit(2)

sys.excepthook = tool_crash

# NAIVE_VALIDATE_NO_JSONSCHEMA=1 simulates a missing dependency. NAIVE_VALIDATE_CRASH=1 raises,
# so the test runs this hook instead of a special exit.
if os.environ.get("NAIVE_VALIDATE_NO_JSONSCHEMA") == "1":
    sys.stderr.write("validate.py needs jsonschema: pip install jsonschema\n")
    sys.exit(2)
if os.environ.get("NAIVE_VALIDATE_CRASH") == "1":
    raise RuntimeError("schema checker crashed")
try:
    import jsonschema
    from referencing import Registry, Resource
except ImportError as error:
    sys.stderr.write(f"validate.py needs jsonschema: pip install jsonschema ({error})\n")
    sys.exit(2)

root = Path(__file__).resolve().parent.parent
# The data model names every record type, its schema and where its records live (EE-018).
# Only JSON records with a schema under schema/ are validated here; the methodology catalog's
# Markdown records are validated by ee.mjs.
model = json.loads((root / "schema/data-model.json").read_text())
RULES = [(r["id"], r["schema"], r.get("form", "json"), r["paths"]) for r in model["records"]
         if r["schema"] and r["schema"].startswith("schema/") and r.get("form", "json") in ("json", "json-list", "json-lines")]
# Every schema is registered by its $id, so one may $ref another (or itself) by file name.
schemas = {p.name: json.loads(p.read_text()) for p in (root / "schema").glob("*.schema.json")}
registry = Registry().with_resources((s.get("$id", n), Resource.from_contents(s)) for n, s in schemas.items())
failed = checked = 0
if "--file" in sys.argv:
    try:
        one = json.loads(Path(sys.argv[sys.argv.index("--file") + 1]).read_text())
    except ValueError as error:
        print(f"(root): {error}")
        sys.exit(1)
    name = sys.argv[sys.argv.index("--schema") + 1]
    schema = schemas[name]
    # --def checks against one $defs entry, such as the metamodel's change_line, through a $ref so its own refs resolve.
    if "--def" in sys.argv:
        entry = sys.argv[sys.argv.index("--def") + 1]
        if entry not in schema.get("$defs", {}):
            sys.stderr.write(f"{name} has no $defs entry {entry}\n")
            sys.exit(2)
        schema = {"$ref": f"{schema.get('$id', name)}#/$defs/{entry}"}
    v = jsonschema.Draft202012Validator(schema, registry=registry, format_checker=jsonschema.FormatChecker())
    errs = [f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message}" for e in v.iter_errors(one)]
    print("\n".join(errs) if errs else "valid")
    sys.exit(1 if errs else 0)
# A file matched by two record types' globs is validated once, by the more specific glob (the one with
# more literal characters): .../departments/products/department.json is a department, not a product.
best = {}
for name, schema, form, globs in RULES:
    for g in globs:
        weight = len(g.replace("**/", "").replace("*", ""))
        for f in glob.glob(str(root / g), recursive=True):
            if f not in best or weight > best[f][0]:
                best[f] = (weight, schema, form)
validators = {}
for f in sorted(best):
    _, schema, form = best[f]
    v = validators.setdefault(schema, jsonschema.Draft202012Validator(schemas[Path(schema).name], registry=registry, format_checker=jsonschema.FormatChecker()))
    try:
        text = Path(f).read_text()
        docs = [json.loads(l) for l in text.splitlines() if l.strip()] if form == "json-lines" else json.loads(text)
    except ValueError as error:
        failed += 1
        print(f"{Path(f).relative_to(root)}: (root): {error}")
        continue
    docs = docs if form != "json" else [docs]
    for d in docs:
        checked += 1
        for e in v.iter_errors(d):
            failed += 1
            print(f"{Path(f).relative_to(root)}: {'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message}")
print(f"{checked} records checked against their schemas: {'all valid' if not failed else f'{failed} error(s)'}.")
sys.exit(1 if failed else 0)
