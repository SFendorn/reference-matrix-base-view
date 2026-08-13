import { TFile } from 'obsidian';
import { MatchLine } from '../types';

/**
 * Lines of `content` that reference `targetFile`, kept as source markdown so
 * Obsidian can render them. Trimmed only so an indented line is not mistaken
 * for a code block.
 */
export function findMatches(content: string, targetFile: TFile): MatchLine[] {
  const matches: MatchLine[] = [];

  content.split('\n').forEach((line, lineNumber) => {
    if (referencesTarget(line, targetFile)) {
      matches.push({ line: lineNumber, markdown: line.trim() });
    }
  });

  return matches;
}

function referencesTarget(line: string, targetFile: TFile): boolean {
  const fileBaseName = targetFile.basename;
  const filePath = targetFile.path;
  let match;

  // Check for wikilink format [[filename]]
  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
  while ((match = wikiLinkPattern.exec(line)) !== null) {
    const linkedName = match[1]?.split('|')[0]?.trim();
    if (
      linkedName === fileBaseName ||
      linkedName === filePath ||
      linkedName?.endsWith(fileBaseName)
    ) {
      return true;
    }
  }

  // Check for markdown link format [text](path)
  const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = mdLinkPattern.exec(line)) !== null) {
    const linkedPath = match[2];
    if (linkedPath?.includes(fileBaseName) || linkedPath === filePath) {
      return true;
    }
  }

  return false;
}
