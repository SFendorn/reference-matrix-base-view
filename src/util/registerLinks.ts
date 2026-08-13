import { App, Component, Keymap, Menu, TFile, Workspace, WorkspaceLeaf, getLinkpath } from "obsidian";

/* The handlers below reach for a few Obsidian internals that the public API does
   not declare. Describing them as optional members keeps every call site
   type-checked — and optional-chained — instead of casting through `any`. */

interface WorkspaceInternals {
	// The internal-link counterpart, Workspace.handleLinkContextMenu, is public.
	handleExternalLinkContextMenu?(menu: Menu, url: string, leaf?: WorkspaceLeaf): void;
}

interface DragManager {
	dragFile?(evt: DragEvent, file: TFile): unknown;
	onDragStart?(evt: DragEvent, dragData: unknown): void;
}

interface AppInternals {
	dragManager?: DragManager;
}

/**
 * Links rendered inside a cell belong to the note that cell's lines came from,
 * so resolve against the nearest data-source-path and fall back to the default.
 */
function sourcePathOf(anchor: HTMLAnchorElement, fallback: string): string {
	return anchor.closest("[data-source-path]")?.getAttribute("data-source-path") ?? fallback;
}

// adapted from https://forum.obsidian.md/t/markdownrenderer-render-wikilinks-arent-clickable-in-live-preview/111255
export function registerLinks(
	app: App,
	component: Component,
	containerEl: HTMLElement,
	defaultSourcePath: string
) {
    /*
	component.registerDomEvent(containerEl, "mouseover", (evt: MouseEvent) => {
		const data = getAnchorAndLinkText(evt);
		if (!data)
			return;

		app.workspace.trigger("hover-link", {
			event: evt,
			source: "preview",
			hoverParent: { hoverPopover: null },
			targetEl: data.anchor,
			linktext: data.linkText,
			sourcePath: sourcePathOf(data.anchor, defaultSourcePath),
		});
	});
    */

	component.registerDomEvent(containerEl, "click", (evt: MouseEvent) => {
		const data = getAnchorAndLinkText(evt);
		if (!data)
			return;
		if (evt.button !== 0)
			return;

		evt.preventDefault();
		void app.workspace.openLinkText(data.linkText, sourcePathOf(data.anchor, defaultSourcePath), Keymap.isModEvent(evt));
	});

	component.registerDomEvent(containerEl, "auxclick", (evt: MouseEvent) => {
		const data = getAnchorAndLinkText(evt);
		if (!data)
			return;
		if (evt.button !== 1)
			return;

		evt.preventDefault();
		void app.workspace.openLinkText(data.linkText, sourcePathOf(data.anchor, defaultSourcePath), "tab");
	});

	component.registerDomEvent(containerEl, "contextmenu", (evt: MouseEvent) => {
		const anchor = getClosestAnchor(evt.target);
		if (!anchor)
			return;

		const workspace: Workspace & WorkspaceInternals = app.workspace;

		if (isInternalLink(anchor)) {
			const linkText = getLinkText(anchor);
			if (!linkText)
				return;

			evt.preventDefault();
			evt.stopPropagation();

			const menu = new Menu();
			workspace.handleLinkContextMenu(
				menu,
				linkText,
				sourcePathOf(anchor, defaultSourcePath),
				workspace.getMostRecentLeaf() ?? undefined
			);

			menu.showAtMouseEvent(evt);
			return;
		}

		if (!isExternalLink(anchor))
			return;

		const url = getLinkText(anchor);
		if (!url)
			return;

		evt.preventDefault();
		evt.stopPropagation();

		const menu = new Menu();
		workspace.handleExternalLinkContextMenu?.(menu, url, workspace.getMostRecentLeaf() ?? undefined);
		menu.showAtMouseEvent(evt);
	});

	component.registerDomEvent(containerEl, "dragstart", (evt: DragEvent) => {
		const data = getAnchorAndLinkText(evt);
		if (!data)
			return;

		// getLinkpath drops any #heading or ^block, which would not resolve.
		const file = app.metadataCache.getFirstLinkpathDest(
			getLinkpath(data.linkText),
			sourcePathOf(data.anchor, defaultSourcePath)
		);
		if (!file)
			return;

		const { dragManager }: App & AppInternals = app;
		if (!dragManager?.dragFile || !dragManager.onDragStart)
			return;

		dragManager.onDragStart(evt, dragManager.dragFile(evt, file));
	});
}

function getAnchorAndLinkText(evt: Event): { anchor: HTMLAnchorElement; linkText: string } | null {
	const anchor = getClosestAnchor(evt.target);
	if (!anchor)
		return null;

	if (!isInternalLink(anchor))
		return null;

	const linkText = getLinkText(anchor);
	if (!linkText)
		return null;

	return { anchor, linkText };
}

function getClosestAnchor(target: EventTarget | null): HTMLAnchorElement | null {
	if (!(target instanceof HTMLElement))
		return null;
	return  target.closest("a");
}

function isInternalLink(anchor: HTMLAnchorElement): boolean {
	return anchor.classList.contains("internal-link");
}

function isExternalLink(anchor: HTMLAnchorElement): boolean {
	return anchor.classList.contains("external-link");
}

function getLinkText(anchor: HTMLAnchorElement): string | null {
	// Rendered links keep the raw linktext in data-href; href is a fallback.
	return anchor.getAttribute("data-href") ?? anchor.getAttribute("href");
}