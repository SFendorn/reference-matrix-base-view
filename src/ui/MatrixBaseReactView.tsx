import React from 'react';
import { MatrixData } from '../types';

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData }> = (props) => {

    return (
        <ul>
            {props.matrixData.map((row) => (
                <li key={row.first()?.timeAxisFile.name}>
                    <a href={row.first()?.timeAxisFile.path} data-href={row.first()?.timeAxisFile.path} class="internal-link" rel="noopener" target="_blank">{row.first()?.timeAxisFile.basename}</a>
                    <ul>
                        {row.map((item) => (
                            <li key={item.timeAxisFile.name + item.baseFile.name}>
                                <a href={item.baseFile.path} data-href={item.baseFile.path} class="internal-link" rel="noopener" target="_blank">{item.baseFile.basename}</a>
                                <ul>
                                    {item.matches.map((match) => (
                                        <div>{match}</div>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
};

export default MatrixBaseReactView;