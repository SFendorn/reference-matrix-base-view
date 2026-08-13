import { BasesView, QueryController, debounce } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MatrixBaseReactView from './MatrixBaseReactView';
import { VIEW_TYPE_REFERENCE_MATRIX } from '../types';
import { buildMatrix } from '../matrix/buildMatrix';
import { registerLinks } from '../util/registerLinks';

export class MatrixBaseView extends BasesView {
  readonly type = VIEW_TYPE_REFERENCE_MATRIX;
  parentEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | undefined = undefined;

  // Rebuilds are async and have two triggers, so only the newest may render.
  private generation = 0;

  constructor(controller: QueryController, parentEl: HTMLElement) {
    super(controller);
    this.parentEl = parentEl;
    this.containerEl = parentEl.createDiv('refernce-matrix-view-container');
  }

  public onload(): void {
    this.root = createRoot(this.containerEl);
    // Once only: registerDomEvent stacks listeners, and these delegate from parentEl.
    registerLinks(this.app, this, this.parentEl, this.app.vault.getRoot().path);

    // The matrix is derived from the metadata cache, which Obsidian fills in
    // after a note is indexed. Bases does not re-query for that, so an edited
    // note would otherwise keep showing the cells it had at query time.
    this.registerEvent(this.app.metadataCache.on('resolved', this.rebuildSoon));
  }

  public onunload(): void {
    this.rebuildSoon.cancel();
    // Retires anything in flight, so it cannot render into an unmounted root.
    this.generation++;
    this.root?.unmount();
    this.root = undefined;
  }

  // onDataUpdated is called by Obsidian whenever there is a configuration
  // or data change in the vault which may affect your view. It is declared to
  // return void, so the async work is kicked off rather than awaited here.
  public onDataUpdated(): void {
    void this.rebuild();
  }

  // A save resolves the cache a beat later and once per keystroke while typing.
  private rebuildSoon = debounce(() => void this.rebuild(), 200, true);

  private async rebuild(): Promise<void> {
    const generation = ++this.generation;

    const entryFiles = this.data.groupedData.flatMap((group) =>
      group.entries.map((entry) => entry.file)
    );

    try {
      const matrixData = await buildMatrix(
        this.app,
        String(this.config.get('timeAxisFolder')),
        entryFiles
      );

      // Superseded by a newer rebuild, or the view is gone.
      if (generation !== this.generation) return;

      this.root?.render(createElement(MatrixBaseReactView, {
        matrixData,
        compact: Boolean(this.config.get('compact')),
        app: this.app,
        component: this,
      }));
    } catch (error) {
      console.error('Reference Matrix: could not build the matrix', error);
    }
  }
}
