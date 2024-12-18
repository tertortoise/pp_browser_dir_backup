import { useCallback, useMemo } from "react";

import { pickDir, DirEntityDir } from "../services/DirManager";
import { RIGHT, LEFT, SyncSide, ActionStatusResolver, ActionStatusResolution, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, ACTION_STATUS_INIT, ActionStatusResolutionCfg, SYNC_STEP_SCAN, TYPE_DIR } from "../types/servicesTypes";
import { ACT_BACK_TO_SCAN, ACT_SCAN_SCAN_TO_INIT, ACT_SCAN_RESCAN_DIR, ACT_SCAN_SELECT_DIR, ACT_SCAN_SCAN_DONE, ACT_SWAP_DIRS, RootDirHandleRefs, Action, ACT_ADD_MSG } from "../types/viewTypes";
import { checkSelectDirVal, getSnapshotOfDirTree } from "../containers/utils";
import { useDireRefs, useSyncManagerRef, useSyncStateDispatch } from "../state/SyncDirContextProvider";
import { causifyCaughtErr, convertScanErrorToInfoBlock, ERR_PERMISSION_ERROR, ScanError } from "../services/errors";

const resolveCurrSyncSide = (rootDirRefsCurrent: RootDirHandleRefs, entityId: string) => {

    let currSyncSide: SyncSide | null = null;

    if (entityId === rootDirRefsCurrent[LEFT]?.rootDirId) {
        currSyncSide = LEFT;
    } else if (entityId === rootDirRefsCurrent[RIGHT]?.rootDirId) {
        currSyncSide = RIGHT;
    }

    const rootDir: DirEntityDir | null = currSyncSide ? rootDirRefsCurrent[currSyncSide]?.rootDir ?? null : null;

    return { currSyncSide, rootDir };
};

export default function useScanControls(isCaseSensitive: boolean) {

    const rootDirRefs = useDireRefs();
    const syncManagerRef = useSyncManagerRef();
    const syncStateDispatch = useSyncStateDispatch();

    const scanDir = useCallback(
        (
            syncSide: SyncSide,
            dirHandle: FileSystemDirectoryHandle,
            actionType: typeof ACT_SCAN_SELECT_DIR | typeof ACT_SCAN_RESCAN_DIR
        ) => {

            rootDirRefs.current[syncSide] = null;

            if (syncSide === LEFT && (syncManagerRef.current?.rootTransaction?.childrenSyncAggrStatus ?? 0) >= ACTION_STATUS_SUCC) {
                rootDirRefs.current[RIGHT] = null;
            }

            syncManagerRef.current = null;

            const nestedChildrenResolver: ActionStatusResolver = (arg: ActionStatusResolution) => {

                const { currSyncSide, rootDir } = resolveCurrSyncSide(rootDirRefs.current, arg.entityId);

                if (
                    !currSyncSide ||
                    !rootDir ||
                    !rootDirRefs.current[currSyncSide] ||
                    rootDirRefs.current[currSyncSide].scanAbortController?.signal.aborted
                ) {
                    return;
                }

                rootDirRefs.current[currSyncSide].scanAbortController = null;

                syncStateDispatch({
                    type: ACT_SCAN_SCAN_DONE,
                    syncSide: currSyncSide,
                    sideState: {
                        status: arg.statusValue,
                        rootDirId: arg.entityId,
                        rootDirName: rootDir.entityName,
                        rootDirTree: getSnapshotOfDirTree(rootDir.children, `${rootDir.entityName}/`),
                        rootDirStats: rootDir.scanDirChildrenStats,
                    },
                });
            };

            const scanAbortController = new AbortController();

            scanAbortController.signal.addEventListener('abort', (event) => {

                const reason = scanAbortController.signal.reason;
                if (reason instanceof ScanError) { // do nothing on user initiated abort

                    let currSyncSide: SyncSide | null = null;
                    let dirName: string | null = null;

                    if (event.target === rootDirRefs.current[LEFT]?.scanAbortController?.signal) {
                        currSyncSide = LEFT;
                        dirName = rootDirRefs.current[LEFT].rootDir.entityName;
                    } else if (event.target === rootDirRefs.current[RIGHT]?.scanAbortController?.signal) {
                        currSyncSide = RIGHT;
                        dirName = rootDirRefs.current[RIGHT].rootDir.entityName;
                    }

                    if (!currSyncSide || !dirName) {
                        return;
                    }

                    rootDirRefs.current[currSyncSide] = null;

                    syncStateDispatch({
                        type: ACT_SCAN_SCAN_TO_INIT,
                        syncSide: currSyncSide,
                        sideState: {
                            status: ACTION_STATUS_INIT,
                        },
                        msg: {
                            id: crypto.randomUUID(),
                            color: 'error',
                            step: SYNC_STEP_SCAN,
                            syncSide: currSyncSide,
                            timestamp: Date.now(),
                            label: `Failed scanning ${currSyncSide} directory`,
                            description: `Scanning '${dirName}' failed due to error below`,
                            infoBlocks: [convertScanErrorToInfoBlock(reason)],
                        }
                    });
                }

            });

            const cfgDir: ActionStatusResolutionCfg = { resolver: nestedChildrenResolver, scanAbortController: scanAbortController };

            const dir = new DirEntityDir(dirHandle, cfgDir, [], isCaseSensitive);

            rootDirRefs.current[syncSide] = { rootDirId: dir.entityId, rootDir: dir, handle: dir.entityHandle, scanAbortController };

            syncStateDispatch({
                type: actionType,
                syncSide,
                sideState: {
                    status: ACTION_STATUS_WIP,
                    rootDirId: dir.entityId,
                    rootDirName: dir.entityName,
                },
            });

        }, [syncStateDispatch, rootDirRefs, syncManagerRef, isCaseSensitive]);


    const { handleDirPick, handleDirRescan } = useMemo(() => {

        const handleDirPick = {
            [LEFT]: () => _handleDirPick(LEFT),
            [RIGHT]: () => _handleDirPick(RIGHT),
        };

        const handleDirRescan = {
            [LEFT]: () => { _handleDirRescan(LEFT) },
            [RIGHT]: () => { _handleDirRescan(RIGHT) },
        };

        const _handleDirPick = async (syncSide: SyncSide) => {

            let dirHandleNew: FileSystemDirectoryHandle | undefined = undefined;
            let conflictWithOpposite = '';

            try {
                dirHandleNew = await pickDir(syncSide);

                const counterSide = syncSide === LEFT ? RIGHT : LEFT;
                const dirHandleCurr = rootDirRefs.current[counterSide]?.handle;

                if (dirHandleCurr) {

                    conflictWithOpposite = await checkSelectDirVal(dirHandleCurr, dirHandleNew, counterSide);

                    if (conflictWithOpposite) {
                        throw conflictWithOpposite;
                    }
                }

            } catch (e) {
                const timestamp = Date.now();
                const scanError = new ScanError(`Failed to pick ${syncSide} directory`, {
                    type: ERR_PERMISSION_ERROR,
                    entityType: TYPE_DIR,
                    entityName: dirHandleNew ? dirHandleNew.name : '-',
                    path: '/',
                    timestamp,
                    cause: causifyCaughtErr(e),
                });

                syncStateDispatch({
                    type: ACT_ADD_MSG,
                    msg: {
                        label: `Directory on the ${syncSide} was not selected`,
                        id: crypto.randomUUID(),
                        color: 'error',
                        step: SYNC_STEP_SCAN,
                        syncSide,
                        isBoundToOppositeSide: !!conflictWithOpposite,
                        timestamp,
                        description: 'Details on the error are below',
                        infoBlocks: [convertScanErrorToInfoBlock(scanError)],
                    },
                });
                return;
            }

            scanDir(syncSide, dirHandleNew, ACT_SCAN_SELECT_DIR);
        };

        const _handleDirRescan = async (syncSide: SyncSide) => {

            const dirHandle = rootDirRefs.current[syncSide]?.handle;

            if (!dirHandle) {

                console.error('No handle for dir to rescan, probably rescan button should have been disabled');

                return;
            }

            rootDirRefs.current[syncSide] = null;
            syncManagerRef.current = null;

            scanDir(syncSide, dirHandle, ACT_SCAN_RESCAN_DIR);

        };

        return { handleDirPick, handleDirRescan };

    }, [syncStateDispatch, rootDirRefs, syncManagerRef, scanDir]);

    const { handleDirClear, handleSwapDirs, handleBackToScan } = useMemo(() => {

        const handleDirClear = {
            [LEFT]: () => { _handleDirClear(LEFT) },
            [RIGHT]: () => { _handleDirClear(RIGHT) },
        };

        const _handleDirClear = async (syncSide: SyncSide) => {

            let isAbortedByUser = false;
            const dirName = rootDirRefs.current[syncSide]?.rootDir.entityName ?? '';

            if (rootDirRefs.current[syncSide]?.scanAbortController) {
                isAbortedByUser = true;
                rootDirRefs.current[syncSide].scanAbortController.abort();
            }
            rootDirRefs.current[syncSide] = null;

            if (syncSide === LEFT && (syncManagerRef.current?.rootTransaction?.childrenSyncAggrStatus ?? 0) >= ACTION_STATUS_SUCC) {
                rootDirRefs.current[RIGHT] = null;
            }
            syncManagerRef.current = null;

            const action: Action = {
                type: ACT_SCAN_SCAN_TO_INIT,
                syncSide,
                sideState: {
                    status: ACTION_STATUS_INIT,
                },
            };

            if (isAbortedByUser) {
                action.msg = {
                    id: crypto.randomUUID(),
                    color: 'error',
                    step: SYNC_STEP_SCAN,
                    syncSide,
                    timestamp: Date.now(),
                    label: `Scanning ${syncSide} directory cancelled`,
                    description: `Scanning '${dirName}' was cancelled by user`,
                    infoBlocks: [],
                }
            }

            syncStateDispatch(action);
        };

        const handleSwapDirs = () => {

            if ((syncManagerRef.current?.rootTransaction?.childrenSyncAggrStatus ?? 0) >= ACTION_STATUS_SUCC) {
                rootDirRefs.current[RIGHT] = null;
            }

            syncManagerRef.current = null;

            const temp = rootDirRefs.current[LEFT];
            rootDirRefs.current[LEFT] = rootDirRefs.current[RIGHT];
            rootDirRefs.current[RIGHT] = temp;

            syncStateDispatch({
                type: ACT_SWAP_DIRS,
            });
        };

        const handleBackToScan = () => {

            rootDirRefs.current[RIGHT] = null;
            rootDirRefs.current[LEFT] = null;
            syncManagerRef.current = null;

            syncStateDispatch({
                type: ACT_BACK_TO_SCAN,
            });
        };

        return { handleDirClear, handleSwapDirs, handleBackToScan };

    }, [syncStateDispatch, rootDirRefs, syncManagerRef]);

    return {
        handleDirPick,
        handleDirRescan,
        handleDirClear,
        handleSwapDirs,
        handleBackToScan,
    };
};