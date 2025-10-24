import React, { useMemo } from 'react';

declare global {
    interface Window {
        marked: any;
        DOMPurify: any;
    }
}

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const sanitizedHtml = useMemo(() => {
        if (typeof window.marked?.parse === 'function' && typeof window.DOMPurify?.sanitize === 'function') {
            const rawHtml = window.marked.parse(content);
            return window.DOMPurify.sanitize(rawHtml);
        }
        // Fallback with basic escaping if scripts fail to load
        return `<pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    }, [content]);

    return (
        <div 
            className="prose prose-slate dark:prose-invert max-w-none prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
        />
    );
};
