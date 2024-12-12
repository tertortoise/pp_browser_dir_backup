import { TableRow, TableCell, IconButton, Box } from "@mui/material";

import { LEFT, RIGHT, SYNC_STATUS_AGGR_CHANGE, SYNC_STATUS_CHANGE, NOOP, SYNC_ACTION_EQUAL, SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_OVERWRITE, ACTION_STATUS_INIT, ACTION_STATUS_ERROR, ActionStatus, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, ACTION_STATUS_MIXED, isTypeFile, ACTION_NOT_REQUIRED, SyncStatusEntityInfo, SyncTransactionErrorInfo } from "../types/servicesTypes";
import { DialogContentInfo, SyncTableRow } from "../types/viewTypes";
import { Dispatch, memo, ReactNode, SetStateAction, useMemo, useSyncExternalStore } from "react";
import { useSyncManagerRef } from "../state/SyncDirContextProvider";
import CopyLeftIcon from "../icons/CopyLeftIcon";
import DeleteIcon from "../icons/DeleteIcon";
import OverwriteIcon from "../icons/OverwriteIcon";
import StartIcon from "../icons/StartIcon";
import ErrorIcon from "../icons/ErrorIcon";
import SuccessIcon from "../icons/SuccessIcon";
import ProgressCircular from "../icons/ProgressCircular";
import { getHslaString, STROKE_COLORS } from "./utils";
import SyncDirTableRowContent from "../components/SyncDirTableRowContent";
import FileIcon from "../icons/FileIcon";
import FolderIcon from "../icons/FolderIcon";
import FolderOpenIcon from "../icons/FolderOpenIcon";
import FolderEmptyIcon from "../icons/FolderEmptyIcon";
import EqualsIcon from "../icons/EqualsIcon";

interface SyncDirTableRowProps {
    syncRow: SyncTableRow;
    isSizeVisible: boolean;
    isMtimeVisible: boolean;
    handleCollapseSingleDir: (arg: string) => void;
    isCollapsed: boolean;
    setDialogContent: Dispatch<SetStateAction<DialogContentInfo | null>>;
};

export const sxFlexCenterVert = {
    display: 'flex',
    alignItems: 'center',
};

const syncActionLabels = {
    [SYNC_ACTION_COPYLEFT]: 'Copy from left to right directory',
    [SYNC_ACTION_DELETERIGHT]: 'Delete from right directory',
    [SYNC_ACTION_OVERWRITE]: 'Overwrite from left to right directory',
    [SYNC_ACTION_EQUAL]: 'Left and right sides are equal'
};

function convertToDialogContentInfo(syncRow: SyncTableRow, input: SyncTransactionErrorInfo | undefined): DialogContentInfo {

    const transaction = syncRow.syncCfg.syncAction 

    return {
        id: syncRow.entityId,
        color: 'error',
        label: `${syncActionLabels[transaction]} failed`,
        description: input ? `Error details` : `Further details are unavailable`,
        infoBlocks: !input ? [] : [[
            `Path: ${syncRow.path}`,
            `Name: ${syncRow.entityName}`,
            `Type: ${syncRow.entityType}`,
            ...(input.transactionErrorMsg ? [typeof input.transactionErrorMsg === 'string' ? input.transactionErrorMsg : (input.transactionErrorMsg as Error)?.toString?.()] : []),
            ...(input.cleanUpMsg ? [typeof input.cleanUpMsg === 'string' ? input.cleanUpMsg : (input.cleanUpMsg as Error)?.toString?.()] : []),
        ]],
    }
}

function SyncDirTableRow({ syncRow, isSizeVisible, isMtimeVisible, handleCollapseSingleDir, isCollapsed, setDialogContent }: SyncDirTableRowProps) {
    
    const syncManagerRef = useSyncManagerRef();

    const syncTransactionId = syncRow.entityId;

    const { getSnapshotSyncStatus,
         subscriberSyncStatus, getSnapshotSyncAggrStatus, subscriberSyncAggrStatus } = useMemo(() => {

        const subscriberSyncStatus = syncManagerRef.current?.makeSubscriberToTransactionStatus(syncTransactionId, SYNC_STATUS_CHANGE) ?? (() => NOOP);
        const getSnapshotSyncStatus = syncManagerRef.current?.makeGetTransactionSyncStatusSnapshot(syncTransactionId, SYNC_STATUS_CHANGE) ?? NOOP as () => undefined;

        const subscriberSyncAggrStatus = syncManagerRef.current?.makeSubscriberToTransactionStatus(syncTransactionId, SYNC_STATUS_AGGR_CHANGE) ?? (() => NOOP);
        const getSnapshotSyncAggrStatus = syncManagerRef.current?.makeGetTransactionSyncStatusSnapshot(syncTransactionId, SYNC_STATUS_AGGR_CHANGE) ?? NOOP as () => undefined;

        return { getSnapshotSyncStatus, subscriberSyncStatus, getSnapshotSyncAggrStatus, subscriberSyncAggrStatus };
    }, [syncTransactionId, syncManagerRef]);

    const syncStatusEntityInfo = useSyncExternalStore<SyncStatusEntityInfo | undefined>(subscriberSyncStatus, getSnapshotSyncStatus); // actionStatus::timestampNumber
    const childrenSyncAggrStatus = useSyncExternalStore<ActionStatus | undefined>(subscriberSyncAggrStatus, getSnapshotSyncAggrStatus);

    const syncStatus = syncStatusEntityInfo?.syncStatus ?? ACTION_NOT_REQUIRED;
    const syncStatusTimestamp = syncStatusEntityInfo?.syncStatusTimestamp ?? Date.now();
    const syncTransactionErrorInfo = syncStatusEntityInfo?.syncTransactionErrorInfo;
    const dialogContentInfo = convertToDialogContentInfo(syncRow, syncTransactionErrorInfo);
   
    const syncStatusColor = syncRow.syncCfg.syncAction === SYNC_ACTION_EQUAL || syncStatus === undefined ? 'currentColor' : getHslaString(STROKE_COLORS[syncStatus]);

    const typeCellContent = useMemo(() => {

        const isDir = !isTypeFile(syncRow);

        return <TableCell sx={{ color: syncStatusColor }}>
            <Box sx={{ ...sxFlexCenterVert, justifyContent: 'center' }}>
                {isDir && !syncRow.isEmpty
                    && <IconButton size="small" onClick={() => handleCollapseSingleDir(syncRow.entityId)} aria-label="expand" color="inherit">
                        {isCollapsed ? <FolderIcon /> : <FolderOpenIcon />}
                    </IconButton>}
                {isDir && syncRow.isEmpty && <FolderEmptyIcon />}
                {!isDir && <FileIcon />}
            </Box>
        </TableCell>;

    }, [syncRow, handleCollapseSingleDir, syncStatusColor, isCollapsed]);

    const transactionTypeCellContent = useMemo(() => {

        let Component: (() => ReactNode) | undefined = undefined;

        switch (syncRow.syncCfg.syncAction) {
            case SYNC_ACTION_COPYLEFT:
                Component = CopyLeftIcon;
                break;

            case SYNC_ACTION_DELETERIGHT:
                Component = DeleteIcon;
                break;

            case SYNC_ACTION_OVERWRITE:
                Component = OverwriteIcon;
                break;

            case SYNC_ACTION_EQUAL:
                Component = EqualsIcon;
                break;
        }

        return Component ? <Component /> : null;

    }, [syncRow]);

    const statusCellContent = useMemo(() => {

        let Component: (() => JSX.Element) | undefined = undefined;

        switch (syncStatus) {
            case ACTION_NOT_REQUIRED:
                Component = EqualsIcon;
                break;
            case ACTION_STATUS_INIT:
                Component = StartIcon;
                break;
            case ACTION_STATUS_WIP:
                Component = ProgressCircular;
                break;
            case ACTION_STATUS_ERROR:
                Component = function ErrorIconBtn() {

                    return <IconButton onClick={() => setDialogContent(dialogContentInfo)}><ErrorIcon /></IconButton>;

                };
                break;
            case ACTION_STATUS_MIXED:
            case ACTION_STATUS_SUCC:
                Component = SuccessIcon;
                break;
        }
        return Component ? <Component /> : null;

    }, [syncStatus, dialogContentInfo, setDialogContent]);

    return <TableRow hover role="checkbox" tabIndex={-1} key={syncRow.entityId}>
        {typeCellContent}
        <SyncDirTableRowContent
            syncSide={LEFT}
            syncRow={syncRow}
            syncStatus={syncStatus}
            childrenSyncAggrStatus={childrenSyncAggrStatus}
            syncStatusTimestamp={syncStatusTimestamp}
            isFileSizeVisible={isSizeVisible}
            isFileMtimeVisible={isMtimeVisible}
        />
        <TableCell className="statusCell">
            <Box
                sx={theme => ({
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    color: syncStatusColor,
                    borderInline: `solid 1px ${theme.palette.TableCell.border}`,
                })}
            >
                <Box sx={sxFlexCenterVert}>{statusCellContent}</Box>
                <Box sx={sxFlexCenterVert}>{transactionTypeCellContent}</Box>
            </Box>
        </TableCell>
        <SyncDirTableRowContent
            syncSide={RIGHT}
            syncRow={syncRow}
            syncStatus={syncStatus}
            childrenSyncAggrStatus={childrenSyncAggrStatus}
            syncStatusTimestamp={syncStatusTimestamp}
            isFileSizeVisible={isSizeVisible}
            isFileMtimeVisible={isMtimeVisible}
        />
    </TableRow>;
};

export default memo(SyncDirTableRow);