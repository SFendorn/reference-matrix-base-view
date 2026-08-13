import React from 'react';
import type { TFile } from 'obsidian';
import { MatrixCell, MatrixData } from '../types';

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

const Cell: React.FC<{ cell: MatrixCell, timeAxisFile?: TFile }> = ({ cell, timeAxisFile }) => (
    <div className="reference-matrix-cell" title={cell.baseFile.basename}>
        {timeAxisFile && <FileLink file={timeAxisFile} className="reference-matrix-cell-title" />}
        {cell.matches.map((match) => (
            <div className="reference-matrix-match" key={match}>{match}</div>
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
                            {entry && <Cell cell={entry.cell} />}
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
                            <Cell cell={entry.cell} timeAxisFile={entry.timeAxisFile} />
                        </React.Fragment>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData, compact: boolean }> = ({ matrixData, compact }) => {
    // Rows without any cell have nothing to show, so they never reach the DOM.
    const rows = matrixData.filter((row) => row.cells.length > 0);
    const columns = buildColumns(rows);

    // No data at all: render nothing rather than an empty frame.
    if (columns.length === 0) return null;

    return compact
        ? <CompactMatrix columns={columns} />
        : <SparseMatrix rows={rows} columns={columns} />;
};

export default MatrixBaseReactView;
