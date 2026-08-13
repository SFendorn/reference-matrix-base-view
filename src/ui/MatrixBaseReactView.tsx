import React from 'react';
import { MatrixCell, MatrixData, MatrixRow } from '../types';

interface ColumnEntry {
    cell: MatrixCell;
    timeAxisFile: MatrixRow['timeAxisFile'];
}

interface Column {
    baseFile: MatrixCell['baseFile'];
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

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData, compact: boolean }> = (props) => {
    // Rows without any cell have nothing to show, so they never reach the DOM.
    const rows = props.matrixData.filter((row) => row.cells.length > 0);
    const columns = buildColumns(rows);

    // No data at all: render nothing rather than an empty frame.
    if (columns.length === 0) {
        return null;
    }

    // Compact mode has no row header, so a cell names its own time axis note.
    const renderCell = (cell: MatrixCell, timeAxisFile?: MatrixRow['timeAxisFile']) => (
        <div className="reference-matrix-cell" title={cell.baseFile.basename}>
            {timeAxisFile && (
                <a href={timeAxisFile.path} data-href={timeAxisFile.path} className="reference-matrix-cell-title internal-link" rel="noopener" target="_blank">{timeAxisFile.basename}</a>
            )}
            {cell.matches.map((match) => (
                <div className="reference-matrix-match" key={match}>{match}</div>
            ))}
        </div>
    );

    const header = (
        <div className="reference-matrix-header">
            {!props.compact && <div className="reference-matrix-corner" />}
            {columns.map((column) => (
                <div className="reference-matrix-column" key={column.baseFile.path}>
                    <a href={column.baseFile.path} data-href={column.baseFile.path} className="reference-matrix-column-title internal-link" rel="noopener" target="_blank">{column.baseFile.basename}</a>
                </div>
            ))}
        </div>
    );

    // ── Compact: no row axis. Each column is one stack of its filled cells, in
    // time axis order, with no empty slots to align against.
    if (props.compact) {
        return (
            <div className="reference-matrix is-compact">
                {header}
                <div className="reference-matrix-row">
                    {columns.map((column) => (
                        <div className="reference-matrix-slot" key={column.baseFile.path}>
                            {/* A lead before every cell draws the line from under the
                                column header and through each gap; the stack simply
                                ends after the last cell. */}
                            {[...column.entryByRow.values()].map((entry) => (
                                <React.Fragment key={entry.timeAxisFile.path}>
                                    <div className="reference-matrix-lead is-linked" />
                                    {renderCell(entry.cell, entry.timeAxisFile)}
                                </React.Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Sparse: one row per time axis note. Every row emits a slot for every
    // column — that is what keeps the flex rows aligned, and it gives the
    // connector lines somewhere to live.
    return (
        <div className="reference-matrix">
            {header}
            {rows.map((row, rowIndex) => (
                <div className="reference-matrix-row" key={row.timeAxisFile.path}>
                    <a href={row.timeAxisFile.path} data-href={row.timeAxisFile.path} className="reference-matrix-row-title internal-link" rel="noopener" target="_blank">{row.timeAxisFile.basename}</a>
                    {columns.map((column) => {
                        const entry = column.entryByRow.get(rowIndex);

                        // The line runs from under the column header down to the
                        // column's last reference, so it shows wherever the cell is
                        // not: above it, below it, or straight through an empty slot.
                        const above = rowIndex <= column.lastRow;
                        const below = rowIndex < column.lastRow;

                        return (
                            <div className="reference-matrix-slot" key={column.baseFile.path}>
                                <div className={above ? 'reference-matrix-lead is-linked' : 'reference-matrix-lead'} />
                                {entry && renderCell(entry.cell)}
                                <div className={below ? 'reference-matrix-trail is-linked' : 'reference-matrix-trail'} />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default MatrixBaseReactView;
