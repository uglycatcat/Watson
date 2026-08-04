import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const remarkPlugins = [remarkGfm];

const components: Components = {
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  ),
};

interface MarkdownBodyProps {
  children: string;
  className?: string;
}

/** Safe Markdown preview: CommonMark + GFM, no raw HTML. */
export function MarkdownBody({ children, className }: MarkdownBodyProps) {
  return (
    <div className={className ? `md-body ${className}` : "md-body"}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
