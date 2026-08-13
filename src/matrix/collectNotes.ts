import { TFile, TFolder, Vault } from 'obsidian';

/** Every markdown note in the folder and its subfolders, sorted by name. */
export function notesInFolder(vault: Vault, folderPath: string): TFile[] {
  if (!folderPath) return [];

  const folder = vault.getAbstractFileByPath(folderPath);
  if (!folder || !(folder instanceof TFolder)) return [];

  const notes: TFile[] = [];
  const traverse = (f: TFolder) => {
    f.children.forEach((file) => {
      if (file instanceof TFile && file.extension === 'md') {
        notes.push(file);
      } else if (file instanceof TFolder) {
        traverse(file);
      }
    });
  };

  traverse(folder);
  return notes.sort((a, b) => a.name.localeCompare(b.name));
}
