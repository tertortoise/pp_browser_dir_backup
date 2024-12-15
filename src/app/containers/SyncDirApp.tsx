import React, { useLayoutEffect, useRef } from 'react';


import { ACTION_STATUS_SUCC, LEFT, RIGHT, SYNC_STEP_DIFF, SYNC_STEP_SCAN } from "../types/servicesTypes";
import SyncDirBlock from './SyncDirBlock';
import { useSyncState, useSyncStateDispatch } from '../state/SyncDirContextProvider';
import { Box, Theme } from '@mui/material';
import { ScanDirBlock } from './ScanDirBlock';
import useRootDirNames from '../hooks/useRootDirNames';
import SyncDirControls from './SyncDirControls';
import { ACT_CHANGE_VIEW_OPTS } from '../types/viewTypes';

export const HEADER_HEIGHT = 1.9;
export const FOOTER_HEIGHT = 2.5;
export const TABLE_ROW_HEIGHT = 1.7;
export const SIZE_WIDTH = 6.2;
export const MTIME_WIDTH = 7.2;
export const TBODY_CONTENT_FS = 0.9;

export const oneLineContentSxMixin = {
    overflow: 'hidden',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
    flexGrow: 1,
    minWidth: 0,
};

export function getSizeMtimeMixin(theme: Theme, type: 'size' | 'mtime', place: 'tbody' | 'thead') {
    const width = type === 'size' ? SIZE_WIDTH : MTIME_WIDTH;

    return {
        ...oneLineContentSxMixin,
        flex: `0 0 ${width}rem`,
        minWidth: `${width}rem`,
        maxWidth: `${width}rem`,
        textAlign: place === 'tbody' ? 'end' : 'center',
        fontSize: place === 'tbody' ? '0.7rem' : '1rem',
        paddingInline: theme.spacing(1),
        borderInlineStart: `solid 1px ${theme.palette.TableCell.border}`
    };
};


export default function SyncDirApp() {

    const syncState = useSyncState();
    const syncStateScan = syncState[SYNC_STEP_SCAN];
    const syncStateDispatch = useSyncStateDispatch();

    const rootDirNames = useRootDirNames(syncStateScan);
    const tableBlockWrapperRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!tableBlockWrapperRef.current) {
            return;
        }
        const resizeObs = new ResizeObserver(entries => {

            const remValue = parseFloat(getComputedStyle(document.documentElement).fontSize);
            const containerHeight = entries[0]?.contentBoxSize?.[0]?.blockSize ?? 0;

            if (!containerHeight) return;

            const tableBodyHeight = containerHeight - (FOOTER_HEIGHT + TABLE_ROW_HEIGHT) * remValue;

            const rowsPerPage = Math.floor(tableBodyHeight / (TABLE_ROW_HEIGHT * remValue));

            syncStateDispatch({
                type: ACT_CHANGE_VIEW_OPTS,
                newViewOptions: { rowsPerPage },
            });
        });
        resizeObs.observe(tableBlockWrapperRef.current);

        return () => resizeObs.disconnect();

    }, [syncStateDispatch]);

    return (
        <Box
            id="syncAppWrapper"
            sx={(theme) => {
                return {
                    height: '100vh',
                    width: '100%',
                    minWidth: '1200px',
                    minHeight: '400px',
                    padding: theme.spacing(4),
                    display: 'grid',
                    columnGap: theme.spacing(4),
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: `${HEADER_HEIGHT}rem 1fr ${FOOTER_HEIGHT}rem`,
                }
            }}

        >
            <SyncDirControls />
            <Box
                id="tableBlockWrapper"
                ref={tableBlockWrapperRef}
                sx={theme => ({
                    gridRow: 'span 2',
                    gridColumn: 'span 2',
                    display: 'grid',
                    gridTemplateColumns: 'subgrid',
                    gridTemplateRows: 'subgrid',
                    '& .MuiTable-root': {
                        tableLayout: 'fixed',
                    },
                    '& .MuiTableRow-root': {
                        padding: 0,
                        height: `${TABLE_ROW_HEIGHT}rem`,
                    },
                    '& .MuiTableCell-root': {
                        padding: 0,
                        paddingInlineStart: 2,
                    },
                    '& tbody .MuiIconButton-root': {
                        padding: 0,
                        color: 'inherit'
                    },
                    '& thead svg': {
                        width: '1.3rem',
                        height: '1.3rem',
                    },
                    '& thead button': {
                        padding: 0,
                    },
                    '& thead span': {
                        fontSize: '0.9rem',
                        fontWeight: 500,
                    },
                    '& tbody svg': {
                        width: '1.1rem',
                        height: '1.1rem',
                    },
                    '& td.statusCell svg:first-of-type': {
                        width: '1.2rem',
                        height: '1.2rem',
                    },
                    '& .MuiTablePagination-toolbar': {
                        minHeight: `${FOOTER_HEIGHT}rem`
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-input, & .MuiTablePagination-spacer': {
                        display: 'none',
                    },
                })}

            >
                {syncState[SYNC_STEP_DIFF].status !== ACTION_STATUS_SUCC
                    ? <>
                        <ScanDirBlock
                            syncSide={LEFT}
                            rootDirName={rootDirNames[LEFT]}
                        />
                        <ScanDirBlock
                            syncSide={RIGHT}
                            rootDirName={rootDirNames[RIGHT]}
                        />
                    </>
                    : <SyncDirBlock rootDirNames={rootDirNames} />
                }
            </Box>

        </Box>
    );
};
