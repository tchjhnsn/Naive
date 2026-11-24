// Drawn from the paths on each entry. Example entries are fixtures.
// Regenerate the record boards with: node site/lib/showcase/render-board.mjs

export const showcaseData = {
  "note": "Each entry is drawn from the paths on it. Example entries are fixtures in this repository. Do not add a venture, company, quote, logo or result that is not in those files.",
  "readOn": "2026-10-29",
  "entries": [
    {
      "id": "acme-labs",
      "name": "Acme Labs",
      "example": true,
      "featured": true,
      "phase": "discovery",
      "type": "software-startup",
      "industry": null,
      "parent": null,
      "description": "Naive's demo venture, a software startup in discovery. The profile describes an app that watches what an independent cafe sells and drafts the supplier reorder for the owner to approve. The same profile says the founder is fictional and the money records are a fixture.",
      "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/acme-labs",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/acme-labs"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/acme-labs/venture.json",
          "note": "Name, type and phase"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/acme-labs/profile.md",
          "note": "Demo description, fictional founder and money fixture"
        }
      ],
      "pieces": [
        {
          "kind": "package",
          "id": "foundation",
          "name": "Foundation",
          "detail": "The profile is on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/profile.md"
        },
        {
          "kind": "package",
          "id": "people",
          "name": "People",
          "detail": "people/people.json and one founder file are on file. The People package's required records (team plan, validation team) are not in this folder.",
          "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/people/people.json"
        },
        {
          "kind": "package",
          "id": "money",
          "name": "Money",
          "detail": "A summary and account files are on file. The profile marks them as a Rho sandbox fixture, not a live account.",
          "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/money/_summary.json"
        },
        {
          "kind": "package",
          "id": "operations",
          "name": "Operations",
          "detail": "Department records are on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/operations/departments/strategy/department.json"
        },
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "packages/naive/src/engine/docket.mjs, run on this venture, names the next decision as core-product, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/acme-labs/decisions"
        }
      ]
    },
    {
      "id": "tandem",
      "name": "Tandem",
      "example": true,
      "featured": true,
      "phase": "validation",
      "type": null,
      "industry": "Software Publishers",
      "parent": null,
      "description": "A worked example in validation. Promise on record: \"Two people can run a shop's bookings, stock and payroll from one phone.\" Promised to owners of two-to-ten-person service shops. Research notes in the folder are marked fictional.",
      "source": "packages/naive/src/records/examples/workspace/ventures/tandem/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/tandem",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Board",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/blob/main/schema/examples/workspace/ventures/tandem/governance/board.json"
        },
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/tandem"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/tandem/venture.json",
          "note": "Name, phase, industry, promise and who it is promised to"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/tandem/knowledge/research/problem-interviews-2026-09.md",
          "note": "The interview notes are marked fictional"
        }
      ],
      "pieces": [
        {
          "kind": "package",
          "id": "foundation",
          "name": "Foundation",
          "detail": "Problem, profile and telos are on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/purpose/telos.json"
        },
        {
          "kind": "package",
          "id": "validation",
          "name": "Validation",
          "detail": "Solution, pricing, go-to-market and product-market fit are on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/purpose/validation/solution.json"
        },
        {
          "kind": "package",
          "id": "product",
          "name": "Product",
          "detail": "The Tandem shop app card is on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/products/shop-app.json"
        },
        {
          "kind": "package",
          "id": "people",
          "name": "People",
          "detail": "A validation team record and a founder agreement are on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/purpose/validation/team.json"
        },
        {
          "kind": "package",
          "id": "legal",
          "name": "Legal and governance",
          "detail": "Board, ownership, exit and a publication policy are on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/governance/board.json"
        },
        {
          "kind": "package",
          "id": "operations",
          "name": "Operations",
          "detail": "Department records are on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/operations/departments/finance/department.json"
        },
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "No decision file is in this folder. schema/docket.mjs, run on this venture, names the next decision as foundation-alignment, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/tandem/venture.json"
        }
      ]
    },
    {
      "id": "polity",
      "name": "Polity",
      "example": true,
      "featured": true,
      "phase": "validation",
      "type": null,
      "industry": null,
      "parent": null,
      "description": "An example input for Product Anatomy, not a venture folder. Promise in the file: \"When you trust Polity, you can find the institutional geometry that governs you, rendered with primary-source evidence or an explicit incomplete grade.\" The file says Polity Social is in build and use, and that Polity OS has an observer-mode prototype that reads public records only.",
      "source": "packages/naive/src/functions/products/frameworks/product-anatomy/examples/polity.json",
      "directory": null,
      "frames": "No frame is recorded against this file.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/blob/main/purpose/frameworks/product-anatomy/examples/polity.json"
        },
        {
          "label": "Runner notes",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/blob/main/purpose/frameworks/product-anatomy/README.md"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/functions/products/frameworks/product-anatomy/examples/polity.json",
          "note": "Promise, phase and current state"
        }
      ],
      "pieces": [
        {
          "kind": "anatomy",
          "id": "product-anatomy",
          "name": "Product Anatomy",
          "detail": "This file is the example input. It names Polity Social, Docket, Polity OS, Polity Data and Nico. Docket here is a product in that file, not Naive's decision docket. No package record, decision docket or frame is in the file.",
          "source": "packages/naive/src/functions/products/frameworks/product-anatomy/examples/polity.json"
        }
      ]
    },
    {
      "id": "northstar",
      "name": "Northstar Climate Fund",
      "example": true,
      "featured": false,
      "phase": "validation",
      "type": "vc-fund",
      "industry": null,
      "parent": null,
      "description": "An example venture of type vc-fund, in validation. The core promise fields are empty. Thesis on file: \"Seed checks into software that cuts industrial emissions, led by founders who have run plants.\"",
      "source": "packages/naive/src/records/examples/workspace/ventures/northstar/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/northstar",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/northstar"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/northstar/venture.json",
          "note": "Name, type, phase and empty core promise"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/northstar/fund/thesis.json",
          "note": "Thesis statement quoted above"
        }
      ],
      "pieces": [
        {
          "kind": "package",
          "id": "foundation",
          "name": "Foundation",
          "detail": "The profile is the template stub.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/profile.md"
        },
        {
          "kind": "package",
          "id": "fund",
          "name": "Fund",
          "detail": "Thesis and terms are on file. packages/fund is not in the fit catalog's core order.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/fund/thesis.json"
        },
        {
          "kind": "package",
          "id": "deals",
          "name": "Deals",
          "detail": "Deal records kilnworks and ductline are on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/deals/kilnworks.json"
        },
        {
          "kind": "package",
          "id": "people",
          "name": "People",
          "detail": "people/people.json and founder files are on file. The People package's required records (team plan, validation team) are not in this folder.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/people/people.json"
        },
        {
          "kind": "package",
          "id": "operations",
          "name": "Operations",
          "detail": "Department records are on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/operations/departments/strategy/department.json"
        },
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "packages/naive/src/engine/docket.mjs, run on this venture, names the next decision as fund-thesis, in Venture.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/fund/decisions/thesis.decision.json"
        }
      ]
    },
    {
      "id": "kilnworks",
      "name": "kilnworks",
      "example": true,
      "featured": false,
      "phase": "discovery",
      "type": "software-startup",
      "industry": null,
      "parent": "northstar",
      "description": "An example software startup in discovery, nested under Northstar Climate Fund. The profile is still the template stub. The parent deal record's fit line: \"Software that cuts kiln fuel use, from a former plant manager.\"",
      "source": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/northstar/portfolio/kilnworks"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/venture.json",
          "note": "Name, type, phase and parent"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/profile.md",
          "note": "Profile is the template stub"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/northstar/deals/kilnworks.json",
          "note": "Parent deal record, thesis fit line quoted above"
        }
      ],
      "pieces": [
        {
          "kind": "package",
          "id": "foundation",
          "name": "Foundation",
          "detail": "The profile is the template stub.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/profile.md"
        },
        {
          "kind": "package",
          "id": "operations",
          "name": "Operations",
          "detail": "Department records are on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/operations/departments/strategy/department.json"
        },
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "packages/naive/src/engine/docket.mjs, run on this venture, names the next decision as product-exists, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/northstar/portfolio/kilnworks/products/decisions/product.exists.decision.json"
        }
      ]
    },
    {
      "id": "studio",
      "name": "Alex Studio",
      "example": true,
      "featured": false,
      "phase": "beachhead",
      "type": null,
      "industry": "Graphic Design Services",
      "parent": null,
      "description": "An example studio in the beachhead phase. Promise on record: \"A brand that looks established on day one,\" for independent restaurant owners. Product cards on file: Brand Kit and Brand Care.",
      "source": "packages/naive/src/records/examples/workspace/ventures/studio/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/studio",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/studio"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/venture.json",
          "note": "Name, phase, industry, promise and who it is promised to"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/products/brand-kit.json",
          "note": "Brand Kit card"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/products/brand-care.json",
          "note": "Brand Care card"
        }
      ],
      "pieces": [
        {
          "kind": "package",
          "id": "product",
          "name": "Product",
          "detail": "Brand Kit and Brand Care are on file.",
          "source": "packages/naive/src/records/examples/workspace/ventures/studio/products/brand-kit.json"
        },
        {
          "kind": "package",
          "id": "relationships",
          "name": "Relationships",
          "detail": "One account record is on file. The catalog marks this package not modeled.",
          "source": "packages/naive/src/records/examples/workspace/ventures/studio/accounts/bakery/account.json"
        },
        {
          "kind": "anatomy",
          "id": "product-anatomy",
          "name": "Product Anatomy",
          "detail": "The Product Anatomy README uses this folder as an example request.",
          "source": "packages/naive/src/functions/products/frameworks/product-anatomy/README.md"
        },
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "No decision file is in this folder. schema/docket.mjs, run on this venture, names the next decision as foundation-alignment, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/studio/venture.json"
        }
      ]
    },
    {
      "id": "studio-print",
      "name": "Alex Studio print line",
      "example": true,
      "featured": false,
      "phase": "validation",
      "type": null,
      "industry": null,
      "parent": "studio",
      "description": "An example child of Alex Studio, in validation. Promise on record: \"Restaurant print that matches the brand, delivered in two days.\" Besides the venture record, the folder holds empty purpose and knowledge directories.",
      "source": "packages/naive/src/records/examples/workspace/ventures/studio/print/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/studio/print",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/studio/print"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/print/venture.json",
          "note": "Name, phase, parent and promise"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/print/purpose",
          "note": "Empty purpose directory"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/studio/print/knowledge",
          "note": "Empty knowledge directory"
        }
      ],
      "pieces": [
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "No decision file is in this folder. schema/docket.mjs, run on this venture, names the next decision as foundation-alignment, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/studio/print/venture.json"
        }
      ]
    },
    {
      "id": "woodworking",
      "name": "Woodworking",
      "example": true,
      "featured": false,
      "phase": "discovery",
      "type": null,
      "industry": null,
      "parent": null,
      "description": "An example venture in discovery. Ambition on record is hobby, and the legal form is none. The folder holds the venture record and an empty knowledge directory. No package record is written yet.",
      "source": "packages/naive/src/records/examples/workspace/ventures/woodworking/venture.json",
      "directory": "packages/naive/src/records/examples/workspace/ventures/woodworking",
      "frames": "No frame is recorded against this venture.",
      "links": [
        {
          "label": "Records",
          "href": "https://github.com/tchjhnsn/everything-ecosystem/tree/main/schema/examples/workspace/ventures/woodworking"
        }
      ],
      "citations": [
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/woodworking/venture.json",
          "note": "Name, phase, ambition and legal form"
        },
        {
          "path": "packages/naive/src/records/examples/workspace/ventures/woodworking/knowledge",
          "note": "Empty knowledge directory"
        }
      ],
      "pieces": [
        {
          "kind": "docket",
          "id": "docket",
          "name": "Decision docket",
          "detail": "No decision file is in this folder. schema/docket.mjs, run on this venture, names the next decision as foundation-alignment, in Foundation.",
          "source": "packages/naive/src/records/examples/workspace/ventures/woodworking/venture.json"
        }
      ]
    }
  ]
};
