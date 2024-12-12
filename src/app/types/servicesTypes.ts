import { DirEntityDir, DirEntityFile } from "../services/DirManager";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const NOOP = () => { };

export const LEFT = 'left';
export const RIGHT = 'right';
export type SyncSide = typeof LEFT | typeof RIGHT;

export const TYPE_FILE = 'file';
export const TYPE_DIR = 'directory';
export type EntityType = typeof TYPE_DIR | typeof TYPE_FILE;

export const ACTION_NOT_REQUIRED = 0;
export const ACTION_STATUS_INIT = 1;
export const ACTION_STATUS_WIP = 2;
export const ACTION_STATUS_RETRYING = 3;
export const ACTION_STATUS_ERROR = 4;
export const ACTION_STATUS_MIXED = 5;
export const ACTION_STATUS_SUCC = 6;
export type ActionStatusDescrete =
    | typeof ACTION_NOT_REQUIRED
    | typeof ACTION_STATUS_INIT
    | typeof ACTION_STATUS_WIP
    | typeof ACTION_STATUS_ERROR
    | typeof ACTION_STATUS_SUCC;
export type ActionStatusDone = typeof ACTION_STATUS_ERROR | typeof ACTION_STATUS_SUCC | typeof ACTION_STATUS_MIXED;
export type ActionStatus = ActionStatusDescrete | typeof ACTION_STATUS_MIXED;

export type ActionStatusInfo = { statusValue: ActionStatus, actionTime?: number, actionResultMsg?: string };

export interface SyncTransactionErrorInfo {
    transactionErrorMsg: string;
    cleanUpMsg: string;
}

export type SyncStatusEntityInfo = {
    syncStatus: typeof ACTION_STATUS_ERROR;
    syncStatusTimestamp: number;
    syncTransactionErrorInfo: SyncTransactionErrorInfo;
} | {
    syncStatus: Exclude<ActionStatus, typeof ACTION_STATUS_ERROR>;
    syncStatusTimestamp: number;
    syncTransactionErrorInfo: undefined;
};

export interface TransactionGeneratorReturnType {
    timestamp: number;
    transactionErrorMsg?: string;
    cleanUpMsg?: string;
}
export type TransactionGeneratorYield = () => Promise<unknown>;
export type TransactionGenerator = Generator<TransactionGeneratorYield, TransactionGeneratorReturnType, unknown>;

export const SCAN_ACTION_ENTITY = 'scanEntityStatus';
export const SCAN_ACTION_CHILD_DIRECT = 'scanDirectChildrenStatus';
export const SCAN_ACTION_CHILD_NESTED = 'scanNestedChildrenStatus';

export interface ScanDirChildrenStats {
    filesCount: number;
    dirsCount: number;
    size: number;
};

export const SYNC_ACTION_EQUAL = 'equal'; // dirs and files
export const SYNC_ACTION_OVERWRITE = 'overwrite'; // both entities are present, left is created on the right, right is deleted
export const SYNC_ACTION_COPYLEFT = 'copyLeft'; // only left is present, left is created on the right
export const SYNC_ACTION_DELETERIGHT = 'deleteRight'; // only right is present, right is deleted
export const SYNC_ACTION_TUPLE = [SYNC_ACTION_EQUAL, SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_OVERWRITE] as const;

export type SyncActionDir = typeof SYNC_ACTION_EQUAL | typeof SYNC_ACTION_COPYLEFT | typeof SYNC_ACTION_DELETERIGHT;
export type SyncAction = SyncActionDir | typeof SYNC_ACTION_OVERWRITE;


export const SYNC_STATUS_CHANGE = 'syncStatusChange';
export const SYNC_STATUS_AGGR_CHANGE = 'childrenSyncAggrStatusChange';
export interface ActionStatusChangeDetail<T extends ActionStatus> {
    eventType: typeof SYNC_STATUS_CHANGE | typeof SYNC_STATUS_AGGR_CHANGE;
    entityId: string;
    statusValue: T;
    msg: string[];
    timestamp: number;
};

export type ActionStatusResolution = 
    & { entityId: string; statusValue: typeof ACTION_STATUS_SUCC; }
    & (
        | { actionType: typeof SCAN_ACTION_ENTITY; entityType: typeof TYPE_FILE }
        | { actionType: typeof SCAN_ACTION_CHILD_NESTED; entityType: typeof TYPE_DIR }
    )

export type ActionStatusResolver = (arg: ActionStatusResolution) => void;

export type ActionStatusResolutionCfg = {
    resolver: ActionStatusResolver;
    scanAbortController: AbortController;
}

export interface BaseEntityFile { entityType: typeof TYPE_FILE };
export interface BaseEntityDir { entityType: typeof TYPE_DIR };
export type BaseEntityDirWithChildren = BaseEntityDir & { children: Map<string, BaseEntity> };
export type BaseEntity = BaseEntityFile | BaseEntityDir;

export type InferEntityType<T> = T extends { entityType: infer ET } ? ET extends typeof TYPE_FILE ? typeof TYPE_FILE : typeof TYPE_DIR : never;

export function isTypeFile(entity: BaseEntity): entity is BaseEntityFile {
    return entity.entityType === TYPE_FILE;
};

export type DirChildrenTree = Map<string, DirEntityDir | DirEntityFile>;

export type RequireAtLeastOne<T> = {
    [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type RequireLeftOrRight<T> = RequireAtLeastOne<{ left: T; right: T; }>;


export const SYNC_STEP_SCAN = 'scan';
export const SYNC_STEP_DIFF = 'diff';
export const SYNC_STEP_SYNC = 'sync';
export type SyncFlowStepNames = typeof SYNC_STEP_SCAN | typeof SYNC_STEP_DIFF | typeof SYNC_STEP_SYNC;
export type SyncFlowStepStatus = typeof ACTION_STATUS_INIT | ActionStatusDescrete;
export type SyncFlowStepStatusMix = SyncFlowStepStatus | typeof ACTION_STATUS_MIXED;

export type SyncCfgDeleteRight<T extends BaseEntity> = {
    syncAction: typeof SYNC_ACTION_DELETERIGHT;
    [RIGHT]: T;
};

export type SyncCfgCopyLeft<T extends BaseEntity> = {
    syncAction: typeof SYNC_ACTION_COPYLEFT;
    [LEFT]: T;
};

export type SyncCfgEqual<T extends BaseEntity> = {
    syncAction: typeof SYNC_ACTION_EQUAL | typeof SYNC_ACTION_OVERWRITE;
    [LEFT]: T;
    [RIGHT]: T;
};

export type SyncCfg<T extends BaseEntity> = SyncCfgEqual<T> | SyncCfgDeleteRight<T> | SyncCfgCopyLeft<T>;

export type SyncOptions = {
    isCaseSensitive: boolean;
    bufferCopyMaxSize: number;
    numberTransactionsMax: number;
};

export interface DiffTransactionStats {
    sizeLeft: number;
    sizeRight: number;
    dirsCount: number;
    filesCount: number;
};

export type DiffStats = Record<SyncAction, DiffTransactionStats>;

export type DiffStatsAcc = Record<SyncAction, {
    [key in keyof DiffTransactionStats]: DiffTransactionStats[key][];
}>;

export type DiffStatsTotals = Record<'copy' | 'delete' | 'equal', { size: number, dirsCount: number, filesCount: number }>;


