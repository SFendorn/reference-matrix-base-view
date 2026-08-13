import { TFile } from 'obsidian';

/** Lines of `content` that reference `targetFile`, with link markup stripped. */
export function findMatches(content: string, targetFile: TFile): string[] {
  const matches: string[] = [];
  const lines = content.split('\n');
  const fileBaseName = targetFile.basename;
  const filePath = targetFile.path;

  lines.forEach((line) => {
    // Check for wikilink format [[filename]]
    const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = wikiLinkPattern.exec(line)) !== null) {
      const linkedName = match[1]?.split('|')[0]?.trim();
      if (
        linkedName === fileBaseName ||
        linkedName === filePath ||
        linkedName?.endsWith(fileBaseName)
      ) {
        matches.push(sanitizeWikiLine(line.trim()));
      }
    }

    // Check for markdown link format [text](path)
    const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = mdLinkPattern.exec(line)) !== null) {
      const linkedPath = match[2];
      if (linkedPath?.includes(fileBaseName) || linkedPath === filePath) {
        matches.push(line.trim());
      }
    }
  });

  return [...new Set(matches)];
}

function sanitizeWikiLine(line: string): string {
  const wikiLinkPattern = /\[\[([^|\]]+)\]\]/g;
  const wikiLinkPatternAlias = /\[\[[^|\]]+\|([^|\]]+)\]\]/g;
  return line.replaceAll(wikiLinkPattern, '$1').replaceAll(wikiLinkPatternAlias, '$1').replace(/^-\s*/, "");
}
