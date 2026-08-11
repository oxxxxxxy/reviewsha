function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!,
  );
}

/** Small dependency-free Markdown renderer for trusted AI/report text. */
export function Markdown({ children }: { children: string }) {
  const blocks = children.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="markdown-content">
      {blocks.map((block, index) => {
        const lines = block.split('\n');
        const heading = lines.length === 1 ? lines[0]!.match(/^(#{1,4})\s+(.+)$/) : null;
        if (heading) {
          const level = heading[1]!.length;
          const content = formatInline(heading[2]!);
          return level === 1 ? (
            <h2 key={index} dangerouslySetInnerHTML={{ __html: content }} />
          ) : level === 2 ? (
            <h3 key={index} dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <h4 key={index} dangerouslySetInnerHTML={{ __html: content }} />
          );
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index}>
              {lines.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^[-*]\s+/, '')) }}
                />
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={index}>
              {lines.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s+/, '')) }}
                />
              ))}
            </ol>
          );
        }
        return <p key={index} dangerouslySetInnerHTML={{ __html: formatInline(block) }} />;
      })}
    </div>
  );
}

function formatInline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}
