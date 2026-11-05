---
type: template
tags: [everything-ecosystem, operations, marketing, assets, template]
ai-model: claude-opus-5.5
created: 2026-10-29T06:04:07Z
source: hybrid
---

# Template: public assets

Fills `<venture>/public/assets.json` (`schema/public-assets.schema.json`), the register of what the venture ships as it is. Do not write it by hand: `mentura assets add` registers a file and code fills its facts; `mentura assets fill` refreshes them. Check it with `mentura public/assets check`.

```json
{
  "version": "0.1.0",
  "remote_hosts": ["images.example.com"],
  "assets": [
    {
      "path": "public/logo.svg",
      "source": "Acme design",
      "license": "owned",
      "credit": "Acme",
      "alt": { "text": "Acme wordmark", "by": "agent" },
      "facts": { "type": "svg", "width": 200, "height": 60, "bytes": 812, "sha256": "<filled by code>" }
    }
  ],
  "remote": [
    { "id": "images-example-com-clinic", "url": "https://images.example.com/clinic.jpg", "license": "all-rights-reserved", "credit": "Ana Photo" }
  ]
}
```

## The rules the check holds

- Every file in `public/` has an entry with a source, a license and a credit.
- Facts are read from the file by code. An entry whose facts differ from the file fails.
- An image needs alt text unless it is marked decorative. Alt text an agent wrote is pending until a person confirms it with `mentura assets confirm`.
- A remote image is a link with a note in `raw/sources/<id>/`. A full copy in `public/` needs a license that allows one.
- `remote_hosts` lists the hosts an agent may fetch from.
