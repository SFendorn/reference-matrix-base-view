import { Plugin } from 'obsidian';
import { App, BasesView, QueryController, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MatrixBaseReactView from './ui/MatrixBaseReactView';
import { MatrixCell, PluginSettings, MatrixData } from './types';
import { hookUpLinks } from './util/PatchLinks';

const DEFAULT_SETTINGS: PluginSettings = {
  timeAxisFolder: ''
};

const VIEW_TYPE_REFERENCE_MATRIX = 'reference-matrix-view';

export default class ReferenceMatrixBasePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ReferenceMatrixSettingTab(this.app, this));

    this.registerBasesView(VIEW_TYPE_REFERENCE_MATRIX, {
      name: "Reference Matrix",
      icon: "kanban",
      factory: (controller, containerEl) => {
        return new MatrixBaseView(controller, containerEl, this.settings)
      },
      options: (config) => {
        return [
          {
            type: 'toggle',
            displayName: 'Compact view',
            key: 'compact',
            default: false
          }
        ];
      }
    });
  }

  async loadSettings() {
    // loadData() is untyped, so narrow it before merging over the defaults.
    const saved = (await this.loadData()) as Partial<PluginSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ReferenceMatrixSettingTab extends PluginSettingTab {
  plugin: ReferenceMatrixBasePlugin;

  constructor(app: App, plugin: ReferenceMatrixBasePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // No heading: Obsidian already titles the tab with the plugin name, and
    // there is only one section here.
    new Setting(containerEl)
      .setName('Time axis folder')
      .setDesc('Select the folder whose notes will appear on the vertical axis')
      .addText((text) => {
        text
          .setPlaceholder('E.g., daily notes')
          .setValue(this.plugin.settings.timeAxisFolder)
          .onChange(async (value) => {
            this.plugin.settings.timeAxisFolder = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

class MatrixBaseView extends BasesView {
  readonly type = VIEW_TYPE_REFERENCE_MATRIX;
  parentEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | undefined = undefined;
  settings: PluginSettings;

  constructor(controller: QueryController, parentEl: HTMLElement, settings: PluginSettings) {
    super(controller);
    this.parentEl = parentEl;
    this.containerEl = parentEl.createDiv('refernce-matrix-view-container');
    this.settings = settings;
  }

  public onload(): void {
    this.root = createRoot(this.containerEl);
    // Once only: registerDomEvent stacks listeners, and these delegate from parentEl.
    hookUpLinks(this.app, this, this.parentEl, this.app.vault.getRoot().path);
  }

  public onunload(): void {
    this.root?.unmount();
  }

  // onDataUpdated is called by Obsidian whenever there is a configuration
  // or data change in the vault which may affect your view. It is declared to
  // return void, so the async work is kicked off rather than awaited here.
  public onDataUpdated(): void {
    void this.rebuild();
  }

  private async rebuild(): Promise<void> {
    const matrixData: MatrixData = [];
    const timeAxisFiles = await this.getNotesFromFolder(
      this.settings.timeAxisFolder
    );

    const baseFiles: TFile[] = [];
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (!timeAxisFiles.includes(entry.file)) {
          baseFiles.push(entry.file);
        }
      }
    }

    // Build matrix
    for (const timeAxisFile of timeAxisFiles) {
      const content = await this.app.vault.read(timeAxisFile);
      const cells: MatrixCell[] = [];

      for (const baseFile of baseFiles) {
        const matches = this.getReferencesInContent(content, baseFile);

        if (matches.length > 0) {
          cells.push({ baseFile, matches });
        }
      }
      matrixData.push({ timeAxisFile, cells });
    }

    this.root?.render(createElement(MatrixBaseReactView, { matrixData: matrixData, compact: Boolean(this.config.get('compact')) }));
  }


  private async getNotesFromFolder(folderPath: string): Promise<TFile[]> {
    if (!folderPath) return [];

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
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

  private getReferencesInContent(content: string, targetFile: TFile): string[] {
    const matches: string[] = [];
    const lines = content.split('\n');
    const fileBaseName = targetFile.basename;
    const filePath = targetFile.path;

    lines.forEach((line, lineNumber) => {
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
          matches.push(this.SanitizeWikiLine(line.trim()));
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

  private SanitizeWikiLine(line: string): string {
    const wikiLinkPattern = /\[\[([^|\]]+)\]\]/g;
    const wikiLinkPatternAlias = /\[\[[^|\]]+\|([^|\]]+)\]\]/g;
    return line.replaceAll(wikiLinkPattern, '$1').replaceAll(wikiLinkPatternAlias, '$1').replace(/^-\s*/, "");
  }
}
