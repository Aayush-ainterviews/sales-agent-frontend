'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, Table } from 'lucide-react'

// Inline code that looks like a file (has a dir separator + an extension, no spaces,
// and isn't a bare directory) becomes a download link. Directories (trailing /) and
// plain words are left as normal code.
const isDownloadablePath = (s: string) => /^[^\s`]+\/[^\s`]*\.[A-Za-z0-9]{1,6}$/.test(s)

// Renders assistant markdown (GFM: tables, lists, links, code) with the app's
// design tokens, so streamed agent output reads like prose instead of raw ** and ###.
// `onDownload` turns file-path inline code into a download action; `onTable` adds a
// "Show in table" action for tabular (json/csv/tsv) paths.
export function Markdown({
  children,
  onDownload,
  onTable,
}: {
  children: string
  onDownload?: (path: string) => void
  onTable?: (path: string) => void
}) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...p }) => <h1 className="font-serif text-lg font-bold mt-3 mb-1.5 first:mt-0" {...p} />,
          h2: ({ node, ...p }) => <h2 className="font-serif text-base font-bold mt-3 mb-1.5 first:mt-0" {...p} />,
          h3: ({ node, ...p }) => <h3 className="font-semibold text-sm mt-2 mb-1 first:mt-0" {...p} />,
          p: ({ node, ...p }) => <p className="my-1.5 first:mt-0 last:mb-0" {...p} />,
          ul: ({ node, ...p }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...p} />,
          ol: ({ node, ...p }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...p} />,
          li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
          a: ({ node, ...p }) => (
            <a
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-70 break-words"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          strong: ({ node, ...p }) => <strong className="font-semibold" {...p} />,
          em: ({ node, ...p }) => <em className="italic" {...p} />,
          hr: () => <hr className="my-3 border-border" />,
          blockquote: ({ node, ...p }) => (
            <blockquote className="border-l-2 border-border pl-3 my-2 text-muted-foreground" {...p} />
          ),
          code: ({ node, className, children, ...rest }) => {
            const text = String(children)
            const isInline = !className && !text.includes('\n')
            if (isInline && onDownload && isDownloadablePath(text)) {
              const tabular = /\.(json|csv|tsv)$/i.test(text)
              return (
                <span className="inline-flex items-center gap-1 align-baseline">
                  <button
                    type="button"
                    onClick={() => onDownload(text)}
                    title={`Download ${text}`}
                    className="inline-flex items-center gap-1 px-1 py-0.5 rounded bg-background/70 border border-border text-[0.85em] font-mono text-blue-600 dark:text-blue-400 hover:opacity-70 break-words"
                  >
                    {text}
                    <Download className="w-3 h-3 shrink-0" />
                  </button>
                  {onTable && tabular && (
                    <button
                      type="button"
                      onClick={() => onTable(text)}
                      title="Show in table"
                      className="inline-flex items-center px-1 py-0.5 rounded border border-border text-foreground hover:bg-secondary"
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              )
            }
            return isInline ? (
              <code className="px-1 py-0.5 rounded bg-background/70 border border-border text-[0.85em] font-mono break-words" {...rest}>
                {children}
              </code>
            ) : (
              <code className={`${className ?? ''} font-mono text-xs`} {...rest}>{children}</code>
            )
          },
          pre: ({ node, ...p }) => (
            <pre className="my-2 p-3 rounded-lg bg-background/70 border border-border overflow-x-auto text-xs" {...p} />
          ),
          table: ({ node, ...p }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse" {...p} />
            </div>
          ),
          th: ({ node, ...p }) => <th className="border border-border px-2 py-1 text-left font-medium" {...p} />,
          td: ({ node, ...p }) => <td className="border border-border px-2 py-1 align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
