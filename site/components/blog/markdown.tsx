import { parseMarkdown } from "@/lib/blog/markdown";
import { Inlines } from "./inlines";

export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          const Tag = `h${block.level}` as "h2" | "h3" | "h4";
          return (
            <Tag key={key} id={block.id}>
              <a className="anchor" href={`#${block.id}`}>
                #
              </a>
              <Inlines nodes={block.inlines} />
            </Tag>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={key}>
              <Inlines nodes={block.inlines} />
            </p>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote key={key}>
              <Inlines nodes={block.inlines} />
            </blockquote>
          );
        }
        if (block.type === "code") {
          return (
            <pre key={key}>
              <code className={block.lang ? `language-${block.lang}` : undefined}>{block.code}</code>
            </pre>
          );
        }
        const List = block.ordered ? "ol" : "ul";
        return (
          <List key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inlines nodes={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
