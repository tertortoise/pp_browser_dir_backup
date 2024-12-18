import { useCallback } from "react";

import { RIGHT, LEFT, ACTION_STATUS_SUCC, ActionStatusChangeDetail, SYNC_STATUS_AGGR_CHANGE, ActionStatus, ACTION_NOT_REQUIRED, SYNC_STEP_SYNC } from "../types/servicesTypes";
import { ACT_ADD_MSG, ACT_CHANGE_VIEW_OPTS, ACT_DIFF, ACT_SYNC_STATUS_CHANGE_ROOT, ViewOptions } from "../types/viewTypes";
import { getSnapshotOfSyncTree,  } from "../containers/utils";
import { SyncManager } from "../services/SyncManager";
import { useDireRefs, useSyncManagerRef, useSyncState, useSyncStateDispatch } from "../state/SyncDirContextProvider";

export default function useSyncControls(setMenuAnchorEl?: React.Dispatch<React.SetStateAction<HTMLElement | null>>) {

    const rootDirRefs = useDireRefs();
    const syncManagerRef = useSyncManagerRef();
    const syncStateDispatch = useSyncStateDispatch();
    const {syncOptions} = useSyncState();

    const handleDiff = useCallback(() => {

        if (!rootDirRefs.current[LEFT] || !rootDirRefs.current[RIGHT]) {
            console.error('failed invariant: left/right dir absent by the time to diff');
            return;
        };

        const newSyncManager = new SyncManager(rootDirRefs.current[LEFT].rootDir, rootDirRefs.current[RIGHT].rootDir, syncOptions);

        if (!newSyncManager.syncTree || !newSyncManager.rootTransaction) {
            console.error('failed invariant: could not get syncTree or rootTransaction after SyncManager init');
            return;
        };

        syncManagerRef.current = newSyncManager;

        const rootTransactionId = newSyncManager.rootTransaction.entityId;

        function statusListener(this: SyncManager, changeEvent: CustomEvent<ActionStatusChangeDetail<ActionStatus>>) {
            
            const { entityId, statusValue } = changeEvent.detail;
            
            if (entityId !== rootTransactionId) { return };
            syncStateDispatch({
                type: ACT_SYNC_STATUS_CHANGE_ROOT,
                status: statusValue,
            });
        };

        newSyncManager.rootEventBus?.addEventListener(SYNC_STATUS_AGGR_CHANGE, statusListener as EventListener);

        const syncTreeSnapshot = getSnapshotOfSyncTree(newSyncManager.syncTree, '', new Set());

        syncStateDispatch({
            type: ACT_DIFF,
            status: ACTION_STATUS_SUCC,
            data: syncTreeSnapshot,
            diffStatsTotals: newSyncManager.rootTransaction.diffStatsTotals,
            rootTransactionId,
            isReadyToInitSync: newSyncManager.rootTransaction?.childrenSyncAggrStatus !== ACTION_NOT_REQUIRED,
        });

    }, [syncStateDispatch, rootDirRefs, syncManagerRef, syncOptions]);

    const handleSync = useCallback(() => {
        const syncManager = syncManagerRef.current;
        if (!syncManager) {
            console.error('SyncManager is absent when trying to sync');
            return;
        }
        syncManager.startSync();
    }, [syncManagerRef]);

    const handleCancelSync = useCallback(() => {
        const syncManager = syncManagerRef.current;
        if (!syncManager) {
            console.error('SyncManager is absent when trying to sync');
            return;
        }

        syncManager.rootEventBus.dispatchEvent(new CustomEvent('cancel'));
        syncStateDispatch({
            type: ACT_ADD_MSG,
            msg: {
                label: `Backup cancelled`,
                id: crypto.randomUUID(),
                color: 'error',
                step: SYNC_STEP_SYNC,
                timestamp: Date.now(),
                description: 'Backup was stopped, it may take some time depending on the volume of processes under way',
                infoBlocks: [],
            },
        });

    }, [syncManagerRef, syncStateDispatch]);

    const handleViewOptionsChange = useCallback(<K extends keyof ViewOptions>(viewOptionName: K, newViewOptionValue: ViewOptions[K]) => {
        setMenuAnchorEl?.(null);
        syncStateDispatch({
            type: ACT_CHANGE_VIEW_OPTS,
            newViewOptions: {
                [viewOptionName]: newViewOptionValue,
            },
        });
    }, [syncStateDispatch, setMenuAnchorEl]);


    return { handleDiff, handleSync, handleViewOptionsChange, handleCancelSync };

}