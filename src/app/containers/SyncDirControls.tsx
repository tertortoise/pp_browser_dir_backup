import React, { useEffect } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { useSyncState } from '../state/SyncDirContextProvider';
import { SYNC_STEP_SCAN, SYNC_STEP_DIFF, LEFT, RIGHT, ACTION_STATUS_WIP, ACTION_STATUS_SUCC, SYNC_STEP_SYNC, ACTION_STATUS_ERROR, ACTION_STATUS_INIT, ACTION_NOT_REQUIRED } from '../types/servicesTypes';
import { isScanFlowSideStateOk } from '../types/viewTypes';
import useSyncControls from '../hooks/useSyncControls';
import { SwapHorizOutlined, ArrowBackOutlined } from '@mui/icons-material';
import useScanControls from '../hooks/useScanControls';
import { oneLineContentSxMixin } from './SyncDirApp';
import SyncOptionsMenu from './SyncOptionsMenu';
import MsgLine from './MsgLine';


export default function SyncDirControls() {

    const syncState = useSyncState();
    const {syncOptions: {isCaseSensitive}} = useSyncState();
    const { handleSwapDirs, handleBackToScan } = useScanControls(isCaseSensitive);
    const { handleDiff, handleSync, handleCancelSync } = useSyncControls();

    const syncStateScan = syncState[SYNC_STEP_SCAN];
    const syncStateDiff = syncState[SYNC_STEP_DIFF];
    const syncStateSync = syncState[SYNC_STEP_SYNC];


    const leftTreeSnapshot = isScanFlowSideStateOk(syncStateScan[LEFT]) ? syncStateScan[LEFT].rootDirTree : null;
    const rightTreeSnapshot = isScanFlowSideStateOk(syncStateScan[RIGHT]) ? syncStateScan[RIGHT].rootDirTree : null;

    const isScanInInit = syncStateScan[RIGHT].status === ACTION_STATUS_INIT && syncStateScan[LEFT].status === ACTION_STATUS_INIT;
    const isLeftScanning = syncStateScan[LEFT].status === ACTION_STATUS_WIP;
    const isRightScanning = syncStateScan[RIGHT].status === ACTION_STATUS_WIP;
    const isScanning = isLeftScanning || isRightScanning;

    const isReadyToDiff = Boolean(leftTreeSnapshot && rightTreeSnapshot);
    const isDiffComplete = Boolean(syncStateDiff.status > ACTION_STATUS_ERROR);

    const isReadyToSync = syncStateDiff.status === ACTION_STATUS_SUCC;
    const isSyncing = syncStateSync === ACTION_STATUS_WIP;
    const isSyncNotRequired = isDiffComplete && syncStateSync === ACTION_NOT_REQUIRED;
    const isSyncComplete = syncStateSync >= ACTION_STATUS_ERROR;

    const isSyncBtnDisabled = isScanning
        || isSyncComplete
        || (!isReadyToDiff && !isReadyToSync)
        || isSyncNotRequired;

    let SwapBackBtnIcon = SwapHorizOutlined;
    let swapBackBtnCb = handleSwapDirs;
    let swapBackBtnDisabled = false;
    let swapBackBtnTooltip = 'swap left and right directories';

    if (isScanInInit) {

        swapBackBtnDisabled = true;

    } else if (isDiffComplete) {

        SwapBackBtnIcon = ArrowBackOutlined;
        swapBackBtnCb = handleBackToScan;
        swapBackBtnTooltip = 'back to scan directories step';
    }


    let syncBtnName = 'Diff';
    let syncBtnHandler = handleDiff;
    let syncBtnTooltip = 'compare left and right directory, left to right'

    if (isSyncComplete) {
        syncBtnName = 'Done';

    } else if (isSyncing) {
        syncBtnName = 'Stop';
        syncBtnHandler = handleCancelSync;
        syncBtnTooltip = 'cancel syncing operation'
    } else if (isReadyToSync) {
        syncBtnName = 'Backup';
        syncBtnHandler = handleSync;
        syncBtnTooltip = 'backup left to right'
    }

    useEffect(()=> {
        const beforeUnloadHandler = (e: Event) => {
            
            e.preventDefault();
            e.returnValue = true;
          };

          if (isSyncing) {
            window.addEventListener('beforeunload', beforeUnloadHandler);
          }

          return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
    }, [isSyncing]);

    return (
        <Box
            component="header"
            sx={theme => ({
                gridColumn: 'span 2',
                paddingInline: theme.spacing(3),
                display: 'flex',
                alignItems: 'center',
            })}
        >
            <Box
                sx={{
                    width: '14rem',
                    flex: '0 0 14rem',
                }}
            >
                <Tooltip title={swapBackBtnTooltip} placement='right'>
                    <span>
                        <Button
                            variant="text"
                            size="small"
                            disabled={swapBackBtnDisabled}
                            onClick={swapBackBtnCb}
                        >
                            <SwapBackBtnIcon />
                        </Button>
                    </span>

                </Tooltip>
                <Tooltip title={syncBtnTooltip} placement='right'>
                    <span>
                        <Button
                            variant="text"
                            size="small"
                            disabled={isSyncBtnDisabled}
                            onClick={syncBtnHandler}
                        >
                            {syncBtnName}
                        </Button>
                    </span>

                </Tooltip>

                <SyncOptionsMenu />
            </Box>


            <Box
                sx={theme => ({
                    paddingInlineStart: theme.spacing(3),
                    ...oneLineContentSxMixin,
                    fontSize: '1rem',
                })}
            >
                <MsgLine />
            </Box>
        </Box>

    );
}
