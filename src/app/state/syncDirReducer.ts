import { ACTION_STATUS_INIT, ACTION_STATUS_SUCC, SYNC_STEP_SYNC, LEFT, RIGHT, ACTION_NOT_REQUIRED, ACTION_STATUS_ERROR } from "../types/servicesTypes";
import { ACT_CHANGE_VIEW_OPTS, ACT_DIFF, ACT_SCAN_SCAN_DONE, ACT_SYNC_STATUS_CHANGE_ROOT, Action, SyncFlowState, isActionScanType, ACT_SWAP_DIRS, ACT_BACK_TO_SCAN, ACT_CHANGE_SYNC_SETT, MsgChip, ACT_DELETE_MSG, ACT_ADD_MSG } from "../types/viewTypes";
import { SYNC_STEP_DIFF } from "../types/servicesTypes";
import { SYNC_STEP_SCAN } from "../types/servicesTypes";
import { resolveCurrentStateStep } from "../containers/utils";

export function reducer(prevState: SyncFlowState, action: Action) {

    const newState = getNewStateWithoutMsgs(prevState, action);

    if (newState) {
        
        newState.messages = getMsgsForNewState(prevState, newState, action);
        return newState;
    }

    return prevState;
};

function getNewStateWithoutMsgs(prevState: SyncFlowState, action: Action): SyncFlowState | null {
    const newState = { ...prevState };
    const newScanStepState = newState[SYNC_STEP_SCAN] = { ...prevState[SYNC_STEP_SCAN] };
    const newDiffStepState = newState[SYNC_STEP_DIFF] = { ...prevState[SYNC_STEP_DIFF] };

    if (isActionScanType(action)) {

        newScanStepState[action.syncSide] = action.sideState;

        const otherSyncSide = action.syncSide === LEFT ? RIGHT : LEFT;

        if (
            action.type === ACT_SCAN_SCAN_DONE
            && action.sideState.status === ACTION_STATUS_SUCC
            && prevState[SYNC_STEP_SCAN][otherSyncSide].status === ACTION_STATUS_SUCC
        ) {

            newDiffStepState.status = ACTION_STATUS_INIT;

            return newState;
        }

        if (prevState[SYNC_STEP_SYNC] >= ACTION_STATUS_ERROR && otherSyncSide === RIGHT) {
             // if sync has been done - any first action on left - right should be discarded automatically
             newScanStepState[otherSyncSide] = {status: ACTION_STATUS_INIT};
        }

        newState[SYNC_STEP_DIFF] = { status: ACTION_NOT_REQUIRED };
        newState[SYNC_STEP_SYNC] = ACTION_NOT_REQUIRED;

        return newState;
    }
    if (action.type === ACT_SWAP_DIRS) {

        newScanStepState[LEFT] = {
            ...prevState[SYNC_STEP_SCAN][RIGHT],
        };
        newScanStepState[RIGHT] = {
            ...prevState[SYNC_STEP_SCAN][LEFT],
        };

        newState[SYNC_STEP_DIFF] = { status: ACTION_NOT_REQUIRED };
        newState[SYNC_STEP_SYNC] = ACTION_NOT_REQUIRED;

        return newState;
    }
    if (action.type === ACT_BACK_TO_SCAN) {

        newScanStepState[LEFT] = {status: ACTION_STATUS_INIT};
        newScanStepState[RIGHT] = {status: ACTION_STATUS_INIT};
        newState[SYNC_STEP_DIFF] = { status: ACTION_NOT_REQUIRED };
        newState[SYNC_STEP_SYNC] = ACTION_NOT_REQUIRED;

        return newState;
    }
    if (action.type === ACT_CHANGE_VIEW_OPTS) {

        newState.viewOptions = { ...prevState.viewOptions, ...action.newViewOptions };

        return newState;
    }

    if (action.type === ACT_CHANGE_SYNC_SETT) {

        newState.syncOptions = { ...prevState.syncOptions, ...action.newSyncSetting };

        return newState;
    }

    if (action.type === ACT_DIFF) {

        newDiffStepState.status = action.status;

        if (newDiffStepState.status === ACTION_STATUS_SUCC && action.status === ACTION_STATUS_SUCC) {
            
            newDiffStepState.data = action.data;
            newDiffStepState.diffStatsTotals = action.diffStatsTotals;
            newDiffStepState.rootTransactionId = action.rootTransactionId;

            if (action.isReadyToInitSync) {
                newState[SYNC_STEP_SYNC] = ACTION_STATUS_INIT;
            }
        }
        return newState;
    }

    if (action.type === ACT_SYNC_STATUS_CHANGE_ROOT) {

        newState[SYNC_STEP_SYNC] = action.status;
        return newState;
    }

    if (action.type === ACT_DELETE_MSG || action.type === ACT_ADD_MSG) {
        return newState;
    }

    return null;
}

function getMsgsForNewState(prevState: SyncFlowState, newState: SyncFlowState, action: Action) {

    if (action.type === ACT_DELETE_MSG) {

        return prevState.messages.filter(prevMsg => prevMsg.id !== action.msgId);

    }

    const newMsg = action.msg;

    const newMsgsPart: MsgChip[] = newMsg ? [newMsg] : [];
    
    const oldRelevantMsgsPart: MsgChip[] = prevState.messages.filter(currPrevMsg => checkMsgRelevancy(prevState, newState, currPrevMsg, action.msg));

    return [...newMsgsPart, ...oldRelevantMsgsPart].sort((a, b) => b.timestamp - a.timestamp);
}

function checkMsgRelevancy(prevState: SyncFlowState, newState: SyncFlowState, currPrevMsg: MsgChip, newMsg?: MsgChip): boolean {
    if (!currPrevMsg.step) {
        return true;
    }
    
    const newStateStep = resolveCurrentStateStep(newState);
    
    if (newStateStep !== currPrevMsg.step) {
        return false;
    }

    if (newStateStep !== SYNC_STEP_SCAN || !currPrevMsg.syncSide) {
        return true;
    }

    if (currPrevMsg.syncSide === newMsg?.syncSide) {
        return false;
    }

    const isMsgSyncSideStatusChanged = prevState[SYNC_STEP_SCAN][currPrevMsg.syncSide].status !== newState[SYNC_STEP_SCAN][currPrevMsg.syncSide].status;

    const msgOppositeSide = currPrevMsg.syncSide === LEFT ? RIGHT : LEFT;

    const isMsgOppositeSideStatusChanged = prevState[SYNC_STEP_SCAN][msgOppositeSide].status !== newState[SYNC_STEP_SCAN][msgOppositeSide].status;

    return !(isMsgSyncSideStatusChanged || (currPrevMsg.isBoundToOppositeSide && isMsgOppositeSideStatusChanged));

}