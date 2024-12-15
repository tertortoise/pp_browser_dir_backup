import { ACTION_STATUS_INIT, ACTION_STATUS_WIP, LEFT, RIGHT, SYNC_STEP_SCAN, SyncSide } from "../types/servicesTypes";
import { useCallback, useMemo } from "react";
import { SyncFlowState } from "../types/viewTypes";

export default function useRootDirNames(syncStateScan: SyncFlowState[typeof SYNC_STEP_SCAN]) {

    const getDirName = useCallback((syncSide: SyncSide, scanFlow: SyncFlowState[typeof SYNC_STEP_SCAN]) => {
        const currentSubstepValue = scanFlow[syncSide].status;
    
        if (currentSubstepValue === ACTION_STATUS_INIT) {
            return `Directory for ${syncSide} backup side is not selected...`;
    
        } else {
    
            const dirName = scanFlow[syncSide].rootDirName;
    
            if (currentSubstepValue === ACTION_STATUS_WIP) {
                return `Directory '${dirName}' is being scanned...`;
            } else {
                return `${dirName}`;
            }
        };
    }, []);
    

    const { rootDirNames } = useMemo(() => {

        const rootDirNames = {
            [LEFT]: getDirName(LEFT, syncStateScan),
            [RIGHT]: getDirName(RIGHT, syncStateScan),
        };

        return { rootDirNames };

    }, [syncStateScan, getDirName]);

    return rootDirNames;
};