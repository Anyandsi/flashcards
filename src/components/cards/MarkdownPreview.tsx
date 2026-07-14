import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

type MarkdownPreviewProps = {
  markdown: string;
};

function transformMarkdownUrl(url: string, key: string) {
  if (key === 'src' && url.startsWith('flashcards-attachment://')) {
    return url;
  }

  return defaultUrlTransform(url);
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview text-sm leading-6 text-card-foreground">
      <ReactMarkdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        urlTransform={transformMarkdownUrl}
      >
        {markdown || 'Nothing to preview yet.'}
      </ReactMarkdown>
    </div>
  );
}
