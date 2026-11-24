// Docs pages that correspond to a catalog record. The loader drops a link
// when the MDX file is not in site/content/docs.

export const docsLinks = {
  byCategory: {
    "Venture type": [
      { href: "/docs/get-started/venture-types-and-roles", title: "Venture types and roles" },
      { href: "/docs/get-started/install", title: "Installation" },
    ],
    Package: [
      { href: "/docs/concepts/layers-and-kits", title: "Layers, packages and kits" },
    ],
    "Decision docket": [
      { href: "/docs/get-started/decisions", title: "Decisions" },
      { href: "/docs/get-started/venture-types-and-roles", title: "Venture types and roles" },
    ],
    Frame: [
      { href: "/docs/get-started/decision-library", title: "Decision library" },
    ],
    Kit: [
      { href: "/docs/concepts/layers-and-kits", title: "Layers, packages and kits" },
    ],
  },
  bySlug: {
    "type-software-startup": [
      { href: "/docs/get-started/install", title: "Installation" },
    ],
    "skill-naive-setup": [
      { href: "/docs/get-started/setup", title: "Set up your venture" },
    ],
    "skill-install-mentura": [
      { href: "/docs/guides/mcp", title: "Connect an agent" },
      { href: "/docs/get-started/install", title: "Installation" },
    ],
    "kit-validation-kickoff": [
      { href: "/docs/get-started/bringing-a-project-in", title: "Bringing a project in" },
    ],
    "guide-cli": [
      { href: "/docs/guides/cli", title: "Use the command line" },
      { href: "/docs/reference/cli", title: "Command reference" },
    ],
    "guide-mcp": [
      { href: "/docs/guides/mcp", title: "Connect an agent" },
      { href: "/docs/reference/mcp", title: "MCP reference" },
    ],
    "guide-api": [
      { href: "/docs/guides/api", title: "Call the local API" },
      { href: "/docs/reference/api", title: "HTTP reference" },
    ],
  },
};
