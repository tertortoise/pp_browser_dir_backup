import { DirEntityDir } from "../services/DirManager";
import { ACTION_STATUS_ERROR, ACTION_STATUS_INIT, ACTION_STATUS_MIXED, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, LEFT, RIGHT, SyncSide, TYPE_FILE, ActionStatusDescrete, BaseEntityDir, BaseEntityFile, SYNC_STEP_DIFF, SYNC_STEP_SCAN, SYNC_STEP_SYNC, SyncCfg, ActionStatus, SyncOptions, ScanDirChildrenStats, DiffStats, ACTION_NOT_REQUIRED, DiffStatsTotals } from "./servicesTypes";


export const SORT_ASC = 'asc';
export const SORT_DESC = 'desc';
export type SortType = typeof SORT_ASC | typeof SORT_DESC;

export interface SyncButtonState {
    name: string;
    handler: () => void;
    disabled: boolean;
};

export type ScanFlowSideStateInit = {
    status: typeof ACTION_STATUS_INIT;
};

export type ScanFlowSideStateWip = {
    status: typeof ACTION_STATUS_WIP | typeof ACTION_STATUS_ERROR;
    rootDirId: string;
    rootDirName: string;
};

export type ScanFlowSideStateError = {
    status: typeof ACTION_STATUS_ERROR;
    rootDirId: string;
    rootDirName: string;
    additionalInfo: string[];
};

export type ScanFlowSideStateOk = {
    status: typeof ACTION_STATUS_MIXED | typeof ACTION_STATUS_SUCC;
    rootDirId: string;
    rootDirName: string;
    rootDirTree: ScnaDirChildrenTreeSnapshot;
    rootDirStats: ScanDirChildrenStats;
};

export type ScanFlowSideState = ScanFlowSideStateInit | ScanFlowSideStateWip | ScanFlowSideStateError | ScanFlowSideStateOk;

export function isScanFlowSideStateOk(scanFlowSideState: ScanFlowSideState): scanFlowSideState is ScanFlowSideStateOk {
    return scanFlowSideState.status > ACTION_STATUS_ERROR;
};

export interface ViewOptions {
    sortedByName: SortType;
    isFileSizeVisible: boolean;
    isFileMtimeVisible: boolean;
    rowsPerPage: number;
};

export type SyncFlowState =
    {
        [SYNC_STEP_SCAN]: {
            [LEFT]: ScanFlowSideState;
            [RIGHT]: ScanFlowSideState;
        },
        [SYNC_STEP_DIFF]:
        | {
            status: typeof ACTION_NOT_REQUIRED | typeof ACTION_STATUS_INIT,
        }
        | {
            status: typeof ACTION_STATUS_ERROR;
            rootTransactionId: string;
        }
        | {
            status: typeof ACTION_STATUS_SUCC;
            data: SyncTreeSnapshot;
            diffStatsTotals: DiffStatsTotals;
            rootTransactionId: string;
        };
        [SYNC_STEP_SYNC]: ActionStatus;
        messages: MsgChip[];
        viewOptions: ViewOptions;
        syncOptions: SyncOptions;
    };

export type RootDirHandleRefs = Record<SyncSide, {
    rootDirId: string;
    handle: FileSystemDirectoryHandle;
    rootDir: DirEntityDir;
    scanAbortController: AbortController | null;
} | null>;

const actionScanPrefix = 'actionScan';
export const ACT_SCAN_SELECT_DIR = `${actionScanPrefix}SelectDir`;
export const ACT_SCAN_SCAN_TO_INIT = `${actionScanPrefix}ScanToInit`;
export const ACT_SCAN_RESCAN_DIR = `${actionScanPrefix}RescanDir`;
export const ACT_SCAN_SCAN_DONE = `${actionScanPrefix}ScanDone`;
export interface ActionSingleRootDir {
    type: typeof ACT_SCAN_SELECT_DIR | typeof ACT_SCAN_SCAN_DONE | typeof ACT_SCAN_SCAN_TO_INIT | typeof ACT_SCAN_RESCAN_DIR;
    syncSide: SyncSide;
    sideState: ScanFlowSideState;
};

export function isActionScanType(action: Action): action is ActionSingleRootDir {
    return action.type.startsWith(actionScanPrefix);
}

export const ACT_SWAP_DIRS = 'swapRootDirs';
export interface ActionSwapRootDirs {
    type: typeof ACT_SWAP_DIRS;
}

export const ACT_BACK_TO_SCAN = 'backToScanInit';
export interface ActionBackToScanInit {
    type: typeof ACT_BACK_TO_SCAN;
}


export const ACT_DIFF = 'diffTable';
export type ActionDiff =
    & {
        type: typeof ACT_DIFF;
    }
    & ({
        status: typeof ACTION_STATUS_ERROR;
        rootTransactionId: string;
    }
        | {
            status: typeof ACTION_STATUS_SUCC;
            data: SyncTreeSnapshot;
            rootTransactionId: string;
            diffStatsTotals: DiffStatsTotals;
            isReadyToInitSync: boolean;
        });

export const ACT_SYNC_STATUS_CHANGE_ROOT = 'syncStatusChangeRoot';
export type ActionSyncStatusChangeRoot = {
    type: typeof ACT_SYNC_STATUS_CHANGE_ROOT;
    status: ActionStatus;
};

export const ACT_CHANGE_VIEW_OPTS = 'changeViewOptions';
export type ActionChangeViewOptions = {
    type: typeof ACT_CHANGE_VIEW_OPTS;
    newViewOptions: Partial<ViewOptions>;
};

export const ACT_CHANGE_SYNC_SETT = 'changeSyncSettings';
export type ActionChangeSyncSettings = {
    type: typeof ACT_CHANGE_SYNC_SETT;
    newSyncSetting: Partial<SyncOptions>;
};

export const ACT_DELETE_MSG = 'deleteMsg';
export type ActionDeleteMsg = {
    type: typeof ACT_DELETE_MSG;
    msgId: string;
};

export const ACT_ADD_MSG = 'addMsg';
export type ActionAddMsg = {
    type: typeof ACT_ADD_MSG;
};


export type Action =
    {
        msg?: MsgChip;
    } &
    (
        | ActionSingleRootDir
        | ActionSwapRootDirs
        | ActionBackToScanInit
        | ActionDiff
        | ActionSyncStatusChangeRoot
        | ActionChangeViewOptions
        | ActionChangeSyncSettings
        | ActionDeleteMsg
        | ActionAddMsg
    );

export interface DialogContentInfo {
    id: string;
    label: string;
    color: 'error' | 'info';
    description: string;
    infoBlocks: string[][];
}

export interface MsgChip extends DialogContentInfo {
    step?: typeof SYNC_STEP_SCAN | typeof SYNC_STEP_DIFF | typeof SYNC_STEP_SYNC | null;
    syncSide?: SyncSide | null;
    isBoundToOppositeSide?: boolean;
    timestamp: number;
};


export interface TableRowBase {
    entityName: string;
    entityId: string;
    path: string;
};

export interface TableRowDirPart extends BaseEntityDir {
    isEmpty: boolean;
}
export interface TableRowFilePart extends BaseEntityFile {
    size: number | null;
    mtime: number | null;
}

export type TableRowBaseWithParents = { parentIds: Set<string> } & TableRowBase;

export type DirEntryTableRowDir = TableRowBaseWithParents & TableRowDirPart;
export type DirEntryTableRowFile = TableRowBaseWithParents & BaseEntityFile;
export type DirEntryTableRow = DirEntryTableRowDir | DirEntryTableRowFile;

export type ScanTableRowDir = DirEntryTableRowDir & { scanDirChildrenStats: ScanDirChildrenStats } & { scanStatus: ActionStatus };
export type ScanTableRowFile = TableRowBaseWithParents & TableRowFilePart & { scanStatus: ActionStatus };
export type ScanTableRow = ScanTableRowDir | ScanTableRowFile;

export type DirChildrenSnapshot = Map<string, DirEntryDirSnapshot | TableRowBaseWithParents & BaseEntityFile>;
export type DirEntryDirSnapshot = TableRowBaseWithParents & TableRowDirPart & { children: DirChildrenSnapshot };


export type ScnaDirChildrenTreeSnapshot = Map<string, DirEntryDirSnapshot | ScanTableRowFile>;

export type ScanDirEntrySnapshot = ScanTableRowDir & { children: ScnaDirChildrenTreeSnapshot };

export type ScanTableColumnNames = 'entityName';

export interface ScanColumn {
    id: ScanTableColumnNames;
    label: string;
    minWidth?: number;
    align?: 'left'
};

export interface SyncTableRowFile extends TableRowBaseWithParents {
    entityType: typeof TYPE_FILE;
    syncCfg: SyncCfg<Omit<ScanTableRowFile, 'parentIds'>>;
    status: ActionStatusDescrete;
};

export interface SyncTableRowDir extends TableRowBaseWithParents, TableRowDirPart {
    syncCfg: SyncCfg<Omit<ScanTableRowDir, 'parentIds'>>;
    status: ActionStatusDescrete;
    childrenToSyncStatus: ActionStatus;
    diffStats: DiffStats;
};

export type SyncTableRow = SyncTableRowFile | SyncTableRowDir;

export type SyncTreeSnapshot = Map<string, SyncTransactionDirSnapshot | SyncTableRowFile>;

export type SyncTransactionDirSnapshot = SyncTableRowDir & { children: SyncTreeSnapshot };



export type SyncTableColumnNames = 'rowType' | 'leftEntityName' | 'rightEntityName' | 'rowStatus' | 'leftEntitySize' | 'leftEntityMtime' | 'rightEntitySize' | 'rightEntityMtime';

export interface SyncTableColumn {
    id: SyncTableColumnNames;
    label: string;
    minWidth?: string | number;
    width?: string | number;
    align?: 'center' | 'left';
    rootDirName?: string;
    borderInline?: true;
};