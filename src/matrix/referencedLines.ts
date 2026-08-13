import { MetadataCache, TFile, getLinkpath } from 'obsidian';

/**
 * Line numbers in `sourceFile` that reference each of `targetPaths`.
 *
 * Both the parse and the resolution are Obsidian's own, so a match means what
 * following the link would mean: heading and block fragments, relative paths,
 * shortest-path ambiguity and code blocks all behave as they do in the note.
 * Frontmatter links are left out — the cache gives them no position, so there
 * is no line to show.
 */
export function referencedLines(
  metadataCache: MetadataCache,
  sourceFile: TFile,
  targetPaths: ReadonlySet<string>
): Map<string, number[]> {
  const cache = metadataCache.getFileCache(sourceFile);
  if (!cache) return new Map();

  // A set per target, so several links to the same note on one line stay one match.
  const byTarget = new Map<string, Set<number>>();

  for (const ref of [...(cache.links ?? []), ...(cache.embeds ?? [])]) {
    // getLinkpath drops any #heading or ^block, which would not resolve. It
    // leaves nothing at all for a same-note link like [[#Heading]].
    const linkpath = getLinkpath(ref.link);
    if (!linkpath) continue;

    const dest = metadataCache.getFirstLinkpathDest(linkpath, sourceFile.path);
    if (!dest || !targetPaths.has(dest.path)) continue;

    const lines = byTarget.get(dest.path) ?? new Set<number>();
    lines.add(ref.position.start.line);
    byTarget.set(dest.path, lines);
  }

  // Embeds are appended after links, so document order has to be restored.
  const inOrder = new Map<string, number[]>();
  for (const [path, lines] of byTarget) {
    inOrder.set(path, [...lines].sort((a, b) => a - b));
  }

  return inOrder;
}
