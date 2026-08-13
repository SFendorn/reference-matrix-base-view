import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { App, Component, MarkdownRenderChild, MarkdownRenderer, getLinkpath } from 'obsidian';
import type { TFile } from 'obsidian';
import { MatchLine, MatrixCell, MatrixData } from '../types';

interface RenderHost {
    app: App;
    /** Owns the lifecycle of everything the rendered markdown creates. */
    component: Component;
}

const RenderHostContext = createContext<RenderHost | null>(null);

interface ColumnEntry {
    cell: MatrixCell;
    timeAxisFile: TFile;
}

interface Column {
    baseFile: TFile;
    entryByRow: Map<number, ColumnEntry>;
    lastRow: number;
}

/**
 * One column per base file referenced anywhere, in first-appearance order.
 * Map insertion order is row order, which compact mode relies on.
 */
function buildColumns(rows: MatrixData): Column[] {
    const byPath = new Map<string, Column>();
    const columns: Column[] = [];

    rows.forEach((row, rowIndex) => {
        for (const cell of row.cells) {
            let column = byPath.get(cell.baseFile.path);
            if (!column) {
                column = { baseFile: cell.baseFile, entryByRow: new Map(), lastRow: rowIndex };
                byPath.set(cell.baseFile.path, column);
                columns.push(column);
            }
            column.entryByRow.set(rowIndex, { cell, timeAxisFile: row.timeAxisFile });
            column.lastRow = rowIndex;
        }
    });

    return columns;
}

/**
 * MarkdownRenderer emits plain internal links; the is-unresolved marking comes
 * from the reading view, which does not run for a plugin container. Without
 * this, a link to a missing file is indistinguishable from a working one.
 */
function markUnresolvedLinks(app: App, el: HTMLElement, sourcePath: string): void {
    el.querySelectorAll('a.internal-link').forEach((anchor) => {
        const linkText = anchor.getAttribute('data-href') ?? anchor.getAttribute('href');
        if (!linkText) return;

        const dest = app.metadataCache.getFirstLinkpathDest(getLinkpath(linkText), sourcePath);
        anchor.classList.toggle('is-unresolved', dest === null);
    });
}

/**
 * Hands one source line to Obsidian to render, so links, formatting and
 * embeds behave exactly as they do in the note it came from. React owns the
 * element; Obsidian owns its contents, so nothing is rendered as children.
 *
 * Callers must key this by content — a changed line has to remount rather than
 * re-render, otherwise a superseded async render could append into the reused
 * element.
 */
const MarkdownLine: React.FC<{ markdown: string, sourcePath: string }> = ({ markdown, sourcePath }) => {
    const host = useContext(RenderHostContext);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !host) return;

        const child = new MarkdownRenderChild(el);
        host.component.addChild(child);

        let cancelled = false;
        void MarkdownRenderer.render(host.app, markdown, el, sourcePath, child).then(() => {
            if (!cancelled) markUnresolvedLinks(host.app, el, sourcePath);
        });

        return () => {
            cancelled = true;
            host.component.removeChild(child);
        };
    }, [host, markdown, sourcePath]);

    return <div className="reference-matrix-match" ref={ref} />;
};

const FileLink: React.FC<{ file: TFile, className: string }> = ({ file, className }) => (
    <a
        href={file.path}
        data-href={file.path}
        className={`${className} internal-link`}
        rel="noopener"
        target="_blank"
    >
        {file.basename}
    </a>
);

// Invisible unless linked, in which case it *is* the connector line.
const Line: React.FC<{ kind: 'lead' | 'trail', linked: boolean }> = ({ kind, linked }) => (
    <div className={linked ? `reference-matrix-${kind} is-linked` : `reference-matrix-${kind}`} />
);

const matchKey = (match: MatchLine) => `${match.line}:${match.markdown}`;

/**
 * data-source-path lets link handling resolve against the note the lines came
 * from, the same way the note itself would.
 */
const Cell: React.FC<{ cell: MatrixCell, timeAxisFile: TFile, withTitle: boolean }> = ({ cell, timeAxisFile, withTitle }) => (
    <div
        className="reference-matrix-cell"
        title={cell.baseFile.basename}
        data-source-path={timeAxisFile.path}
    >
        {withTitle && <FileLink file={timeAxisFile} className="reference-matrix-cell-title" />}
        {cell.matches.map((match) => (
            <MarkdownLine key={matchKey(match)} markdown={match.markdown} sourcePath={timeAxisFile.path} />
        ))}
    </div>
);

const Header: React.FC<{ columns: Column[], withCorner: boolean }> = ({ columns, withCorner }) => (
    <div className="reference-matrix-header">
        {withCorner && <div className="reference-matrix-corner" />}
        {columns.map((column) => (
            <div className="reference-matrix-column" key={column.baseFile.path}>
                <FileLink file={column.baseFile} className="reference-matrix-column-title" />
            </div>
        ))}
    </div>
);

/** One row per time axis note, every row emitting a slot per column. */
const SparseMatrix: React.FC<{ rows: MatrixData, columns: Column[] }> = ({ rows, columns }) => (
    <div className="reference-matrix">
        <Header columns={columns} withCorner />
        {rows.map((row, rowIndex) => (
            <div className="reference-matrix-row" key={row.timeAxisFile.path}>
                <FileLink file={row.timeAxisFile} className="reference-matrix-row-title" />
                {columns.map((column) => {
                    const entry = column.entryByRow.get(rowIndex);

                    return (
                        <div className="reference-matrix-slot" key={column.baseFile.path}>
                            <Line kind="lead" linked={rowIndex <= column.lastRow} />
                            {entry && <Cell cell={entry.cell} timeAxisFile={entry.timeAxisFile} withTitle={false} />}
                            <Line kind="trail" linked={rowIndex < column.lastRow} />
                        </div>
                    );
                })}
            </div>
        ))}
    </div>
);

/** No row axis: each column is one stack, every cell naming its own note. */
const CompactMatrix: React.FC<{ columns: Column[] }> = ({ columns }) => (
    <div className="reference-matrix is-compact">
        <Header columns={columns} withCorner={false} />
        <div className="reference-matrix-row">
            {columns.map((column) => (
                <div className="reference-matrix-slot" key={column.baseFile.path}>
                    {[...column.entryByRow.values()].map((entry) => (
                        <React.Fragment key={entry.timeAxisFile.path}>
                            <Line kind="lead" linked />
                            <Cell cell={entry.cell} timeAxisFile={entry.timeAxisFile} withTitle />
                        </React.Fragment>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

interface MatrixBaseReactViewProps {
    matrixData: MatrixData;
    compact: boolean;
    app: App;
    component: Component;
}

const MatrixBaseReactView: React.FC<MatrixBaseReactViewProps> = ({ matrixData, compact, app, component }) => {
    // app and component are the same instances for the life of the view, so this
    // reference stays stable and does not re-run any markdown render.
    const host = useMemo<RenderHost>(() => ({ app, component }), [app, component]);

    // Rows without any cell have nothing to show, so they never reach the DOM.
    const rows = matrixData.filter((row) => row.cells.length > 0);
    const columns = buildColumns(rows);

    // No data at all: render nothing rather than an empty frame.
    if (columns.length === 0) return null;

    return (
        <RenderHostContext.Provider value={host}>
            {compact
                ? <CompactMatrix columns={columns} />
                : <SparseMatrix rows={rows} columns={columns} />}
        </RenderHostContext.Provider>
    );
};

export default MatrixBaseReactView;
