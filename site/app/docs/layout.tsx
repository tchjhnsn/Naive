import { Layout } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import { githubUrl } from "@/components/shell/nav";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      pageMap={await getPageMap("/docs")}
      docsRepositoryBase={`${githubUrl}/tree/main/site`}
      editLink="Edit this page"
      feedback={{ content: null }}
      sidebar={{ defaultMenuCollapseLevel: 6 }}
      toc={{ title: "On this page", backToTop: "Back to top" }}
      nextThemes={{ attribute: "class", defaultTheme: "system", disableTransitionOnChange: true, storageKey: "theme" }}
    >
      <p className="docs-draft">Draft developer docs. Not published, and not indexed.</p>
      {children}
    </Layout>
  );
}
