import { ScnaDirChildrenTreeSnapshot, ScanDirEntrySnapshot, TableRowBase, SORT_ASC, SortType, DirChildrenSnapshot, DirEntryDirSnapshot, ScanTableRowFile, SyncTreeSnapshot, SyncTransactionDirSnapshot, SyncTableRowFile, TableRowBaseWithParents, DirEntryTableRow, DirEntryTableRowFile, ScanTableRowDir, SyncFlowState } from "../types/viewTypes";
import { SyncCfg, TYPE_DIR, TYPE_FILE, DirChildrenTree, SYNC_ACTION_COPYLEFT, SYNC_ACTION_EQUAL, SYNC_ACTION_OVERWRITE, LEFT, RIGHT, isTypeFile, ACTION_STATUS_INIT, ACTION_STATUS_ERROR, ACTION_STATUS_MIXED, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, ACTION_NOT_REQUIRED, SyncSide, SYNC_STEP_DIFF, SYNC_STEP_SCAN, SYNC_STEP_SYNC } from "../types/servicesTypes";
import { DirEntityDir, DirEntityFile } from "../services/DirManager";
import { normalizeNameByCase } from "../services/SyncManager";
import { SyncTransaction, SyncTransactionFile } from "../services/SyncTransaction";


export function findRecordsAreEqual<T extends (Record<string, unknown> | null)>(obj1: T, obj2: T) {
    if (!obj1 || !obj2) {
        return obj1 === obj2;
    }
    if ((typeof obj1 === 'object') && (typeof obj2 === 'object')) {
        return Object.entries(obj1).every(([key, value]) => obj2[key] === value);
    }
}

/* Simplified version for chrome desktop essentially with userAgentData */
export function detectOs() {

    if (typeof window === 'undefined') {
        return 'unknown';
    }

    let data: typeof window.navigator.userAgentData | string = window.navigator?.userAgentData;
    if (data) {
        return data.platform;
    }

    const regex: Record<string, RegExp> = {
        windows: /win/i,
        linux: /(linux|x11)/i,
        macOs: /mac/i,
    };

    data = window.navigator?.userAgent;

    if (!data) {
        return 'unknown';
    }

    const desktopOS = Object.keys(regex).find(os => regex[os].test(data));

    return desktopOS ?? 'unknown';
}

export function getDefaultCaseSensitivity() {

    const os = detectOs();

    if (os.toLowerCase().includes('lin')) {
        return true;
    }
    return false;
}

export function resolveCurrentStateStep(state: SyncFlowState): typeof SYNC_STEP_SCAN | typeof SYNC_STEP_DIFF | typeof SYNC_STEP_SYNC {

    if (state[SYNC_STEP_SYNC] > ACTION_STATUS_INIT) {

        return SYNC_STEP_SYNC;
    }
    if (state[SYNC_STEP_DIFF].status > ACTION_STATUS_INIT) {

        return SYNC_STEP_DIFF;
    }
    return SYNC_STEP_SCAN;
}

// gets table rows dirs first, file second, sorted asc or desc by name
export const getSortedTableRows = (function () {

    const cache: WeakMap<DirChildrenSnapshot, Record<string, DirEntryTableRow[] | null>> = new WeakMap();

    return function <M extends DirChildrenSnapshot, R extends DirEntryTableRow>(treeSnapshot: M, sortType: SortType, isCaseSensitive = false): R[] {

        const cacheKey = `${sortType}::${Number(isCaseSensitive)}`;

        const cachedRows = cache.get(treeSnapshot)?.[cacheKey];
        if (cachedRows) {
            return cachedRows as R[];
        };

        function transformDirTreeToSortedArr(dirChildrenTree: M, parentIds: Set<string>, path: string): R[] {

            const { files, dirs } = Array.from(dirChildrenTree.entries()).reduce<{ files: DirEntryTableRowFile[], dirs: DirEntryDirSnapshot[] }>((acc, [, nextEntity]) => {

                if (isTypeFile(nextEntity)) {
                    acc.files.push(nextEntity);
                } else {
                    acc.dirs.push(nextEntity);
                }
                return acc;
            }, { files: [], dirs: [] });

            const sortedDirFileArray = [...sortDirEntityByName(dirs, sortType, isCaseSensitive), ...sortDirEntityByName(files, sortType, isCaseSensitive)];

            const tableRows = sortedDirFileArray.flatMap<DirEntryTableRow>((dirEntity) => {

                if (isTypeFile(dirEntity)) {
                    return [dirEntity];
                } else if (dirEntity.entityType === TYPE_DIR) {
                    const { children, ...tableRowDir } = dirEntity;
                    if (!tableRowDir.isEmpty) {
                        return [tableRowDir, ...transformDirTreeToSortedArr(children as M, parentIds.add(dirEntity.entityId), `${path}/${dirEntity.entityName}/`)];
                    } else {
                        return [tableRowDir];
                    }
                } else {
                    return [];
                }
            });

            return tableRows as R[];
        };

        const finalTableRows = transformDirTreeToSortedArr(treeSnapshot, new Set(), '');

        if (!cache.get(treeSnapshot)) {
            cache.set(treeSnapshot, ({ [cacheKey]: finalTableRows }));
        } else {
            // @ts-expect-error if condition guards against get returning undefined
            cache.get(treeSnapshot)[cacheKey] = finalTableRows;
        }
        return finalTableRows;
    }
}());

function sortDirEntityByName<T extends { entityName: string }>(entityArray: T[], sortType: SortType, isCaseSensitive = false): T[] {

    return entityArray.sort((a, b) => {

        const entityNameA = isCaseSensitive ? a.entityName : normalizeNameByCase(a.entityName);
        const entityNameB = isCaseSensitive ? b.entityName : normalizeNameByCase(b.entityName);

        if (sortType === SORT_ASC) {
            return entityNameA.localeCompare(entityNameB);
        } else {
            return entityNameB.localeCompare(entityNameA);
        }
    });
};

export function getSnapshotOfDirTree(rootDirChildrenTree: DirChildrenTree, path: string, parentIds: Set<string> = new Set()): ScnaDirChildrenTreeSnapshot {

    const snapshotTree = new Map();

    for (const [entityId, entity] of rootDirChildrenTree.entries()) {

        if (entity instanceof DirEntityFile) {

            const tableRowFile: ScanTableRowFile = { ...getScanTableRowFile(entity, path), parentIds };

            snapshotTree.set(entityId, tableRowFile);
        } else {

            const isEmpty = !entity.children.size;
            const tableRowDir: ScanDirEntrySnapshot = {
                ...getTableRowBase(entity, path),
                parentIds,
                entityType: TYPE_DIR,
                isEmpty,
                scanDirChildrenStats: entity.scanDirChildrenStats,
                children: !isEmpty ? getSnapshotOfDirTree(entity.children, `${path}${entity.entityName}/`, new Set(parentIds).add(entityId)) : new Map(),
                scanStatus: entity.scanNestedChildrenStatus.statusValue
            };
            snapshotTree.set(entityId, tableRowDir);
        }
    }
    return snapshotTree;
}

export function getSnapshotOfSyncTree(syncTree: Map<string, SyncTransaction>, path: string, parentIds: Set<string> = new Set()): SyncTreeSnapshot {

    const snapshotTree: SyncTreeSnapshot = new Map();

    for (const [entityId, entity] of syncTree.entries()) {

        if (entity instanceof SyncTransactionFile) {

            const fileRow: SyncTableRowFile = {
                ...getTableRowBase(entity, path),
                parentIds,
                entityType: TYPE_FILE,
                syncCfg: getScanTableRowFileFromSyncCfg(entity.syncCfg, path),
                status: entity.syncStatus,
            };
            snapshotTree.set(entityId, fileRow);
        } else {
            const isEmpty = !entity.children?.size;
            const dirRow: SyncTransactionDirSnapshot = {
                ...getTableRowBase(entity, path),
                parentIds,
                entityType: TYPE_DIR,
                syncCfg: getScanTableRowDirFromSyncCfg(entity.syncCfg, path),
                status: entity.syncStatus,
                childrenToSyncStatus: entity.childrenSyncAggrStatus,
                isEmpty,
                // @ts-expect-error entity.children is not undefined on non empty dirs
                children: !isEmpty ? getSnapshotOfSyncTree(entity.children, `${path}${entity.entityName}/`, new Set(parentIds).add(entityId)) : new Map(),
                diffStats: entity.diffStats,
            };
            snapshotTree.set(entityId, dirRow);
        }
    }
    return snapshotTree;
};

function getScanTableRowFileFromSyncCfg(syncCfg: SyncCfg<DirEntityFile>, path: string): SyncCfg<Omit<ScanTableRowFile, 'parentIds'>> {

    if (syncCfg.syncAction === SYNC_ACTION_EQUAL || syncCfg.syncAction === SYNC_ACTION_OVERWRITE) {
        return {
            syncAction: syncCfg.syncAction,
            [LEFT]: getScanTableRowFile(syncCfg[LEFT], path),
            [RIGHT]: getScanTableRowFile(syncCfg[RIGHT], path),
        };
    } else if (syncCfg.syncAction === SYNC_ACTION_COPYLEFT) {
        return {
            syncAction: syncCfg.syncAction,
            [LEFT]: getScanTableRowFile(syncCfg[LEFT], path),
        };
    } else {
        return {
            syncAction: syncCfg.syncAction,
            [RIGHT]: getScanTableRowFile(syncCfg[RIGHT], path),
        };
    }
};

function getScanTableRowDirFromSyncCfg(syncCfg: SyncCfg<DirEntityDir>, path: string): SyncCfg<Omit<ScanTableRowDir, 'parentIds'>> {

    if (syncCfg.syncAction === SYNC_ACTION_EQUAL || syncCfg.syncAction === SYNC_ACTION_OVERWRITE) {
        return {
            syncAction: syncCfg.syncAction,
            [LEFT]: getScanTableRowDir(syncCfg[LEFT], path),
            [RIGHT]: getScanTableRowDir(syncCfg[RIGHT], path),
        };
    } else if (syncCfg.syncAction === SYNC_ACTION_COPYLEFT) {
        return {
            syncAction: syncCfg.syncAction,
            [LEFT]: getScanTableRowDir(syncCfg[LEFT], path),
        };
    } else {
        return {
            syncAction: syncCfg.syncAction,
            [RIGHT]: getScanTableRowDir(syncCfg[RIGHT], path),
        };
    }
};


function getScanTableRowDir(entity: DirEntityDir, path: string): Omit<ScanTableRowDir, 'parentIds'> {
    return {
        ...getTableRowBase(entity, path),
        entityType: TYPE_DIR,
        scanDirChildrenStats: entity.scanDirChildrenStats,
        isEmpty: !entity.children.size,
        scanStatus: entity.scanNestedChildrenStatus.statusValue,
    };
};

function getScanTableRowFile(entity: DirEntityFile, path: string): Omit<ScanTableRowFile, 'parentIds'> {
    return {
        ...getTableRowBase(entity, path),
        entityType: TYPE_FILE,
        size: entity.size,
        mtime: entity.mtime,
        scanStatus: entity.scanEntityStatus.statusValue,
    };
};

function getTableRowBase(entity: { entityName: string, entityId: string }, path: string): TableRowBase {
    return {
        entityName: entity.entityName,
        entityId: entity.entityId,
        path: path,
    };
};

export function getMtimeHuman(mtime: number | null): string {
    if (!mtime) {
        return '';
    }
    const date = new Date(mtime);
    const dateString = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    const dateTimeString = `${dateString} ${timeString}`;
    return dateTimeString;
};

const numFormatter = Intl.NumberFormat();

export function getSizeHuman(size: number | null): string {
    if (size === null) {
        return '';
    }
    return numFormatter.format(size);
};

export const STROKE_COLORS = {
    [ACTION_NOT_REQUIRED]: [0, 0, 0, 0],
    [ACTION_STATUS_INIT]: [230, 80, 35, 1],
    [ACTION_STATUS_WIP]: [230, 80, 55, 1],
    progressBarRunner1: [230, 70, 85, 0.7],
    [ACTION_STATUS_ERROR]: [0, 70, 70, 1],
    [ACTION_STATUS_MIXED]: [55, 70, 70, 1],
    [ACTION_STATUS_SUCC]: [90, 90, 35, 1],
    delete: [10, 60, 60, 1],
    copy: [130, 90, 35, 1],
    noContentRight: [20, 80, 90, 0.5],
    noContentLeft: [110, 80, 90, 0.5],
} as const;

export function getHslaString([h, s, l, a]: typeof STROKE_COLORS[keyof typeof STROKE_COLORS]) {
    return `hsla(${h} ${s}% ${l}% / ${a})`;
};

export function filterTableRowsByCollapsed<T extends TableRowBaseWithParents>(tableRowsToFilter: T[], collapsedDirsSet: Set<string>): T[] {

    const result: T[] = tableRowsToFilter.filter(row => collapsedDirsSet.intersection(row.parentIds));
    return result;
};

export async function checkSelectDirVal(dirHandleCurr: FileSystemDirectoryHandle, dirHandleNew: FileSystemDirectoryHandle, counterSide: SyncSide): Promise<string> {

    const otherDirIsSame = await dirHandleNew.isSameEntry(dirHandleCurr);

    if (otherDirIsSame) {

        return `It is the same as the ${counterSide} directory`;
    }

    const isDirHandleCurrParent = await dirHandleCurr.resolve(dirHandleNew);

    const isDirHandleNewParent = await dirHandleNew.resolve(dirHandleCurr);

    if (!isDirHandleCurrParent && !isDirHandleNewParent) {
        return '';
    }

    return `It is ${isDirHandleCurrParent ? 'child' : 'parent'} of the ${counterSide} directory`;

}
