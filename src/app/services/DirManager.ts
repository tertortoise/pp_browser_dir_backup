import { ActionStatusInfo, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, ACTION_STATUS_ERROR, SCAN_ACTION_ENTITY, TYPE_FILE, ActionStatusResolution, ActionStatusResolver, SCAN_ACTION_CHILD_NESTED, TYPE_DIR, DirChildrenTree, ScanDirChildrenStats, isTypeFile, SyncSide, LEFT, ActionStatusResolutionCfg, ActionStatus } from "../types/servicesTypes";
import { causifyCaughtErr, ERR_CASE_SENSITIVITY, ERR_DIR_ENTRIES_FAIL, ERR_GET_FILE_FROM_HANDLE, ERR_UNTYPED, ErrorType, ScanError } from "./errors";

export async function pickDir(syncSide: SyncSide): Promise<FileSystemDirectoryHandle> {
    try {
        const mode = syncSide === LEFT ? 'read' : 'readwrite';
        const dirHandle = await window.showDirectoryPicker({ id: `syncDir_${syncSide}`, mode });
        return dirHandle;
    } catch (e) {
        throw causifyCaughtErr(e);
    }
}

export abstract class DirEntityBase {
    #entityId: string;
    #path: string;
    #parents: DirEntityDir[];
    #actionStatusResolutionCfg: ActionStatusResolutionCfg;

    constructor(actionStatusResolutionCfg: ActionStatusResolutionCfg, parents: DirEntityDir[]) {
        this.#entityId = crypto.randomUUID();
        this.#actionStatusResolutionCfg = actionStatusResolutionCfg;
        this.#parents = parents;
        this.#path = this.parents.reduce<string>((acc, entity) => {
            return acc += `${entity.entityName}/`;
        }, '/');
    }

    abstract get entityHandle(): FileSystemHandle
    abstract get entityName(): string
    get entityId() { return this.#entityId }
    get actionStatusResolutionCfg() { return this.#actionStatusResolutionCfg }
    get parents() { return this.#parents }
    get path() { return this.#path }


    throwScanError(type: ErrorType, message: string, cause: Error | string) {

        const cancelCause = new ScanError(message, {
            type,
            entityName: this.entityName,
            entityType: this.entityHandle.kind,
            path: this.path,
            timestamp: Date.now(),
            cause,
        });
        this.actionStatusResolutionCfg.scanAbortController.abort(cancelCause);
    }
}

export class DirEntityDir extends DirEntityBase {

    #entityHandle: FileSystemDirectoryHandle;
    #children: DirChildrenTree = new Map();

    #scanDirChildrenStats: ScanDirChildrenStats = { filesCount: 0, dirsCount: 0, size: 0 };
    [SCAN_ACTION_ENTITY]: ActionStatusInfo;
    [SCAN_ACTION_CHILD_NESTED]: ActionStatusInfo;
    #isCaseSensitive: boolean;


    constructor(entityHandle: FileSystemDirectoryHandle, actionStatusResolutionCfg: ActionStatusResolutionCfg, parents: DirEntityDir[], isCaseSensitive: boolean) {
        super(actionStatusResolutionCfg, parents);
        this.#entityHandle = entityHandle;
        this[SCAN_ACTION_ENTITY] = { statusValue: ACTION_STATUS_SUCC, actionTime: Date.now(), actionResultMsg: 'Ok' };
        this[SCAN_ACTION_CHILD_NESTED] = { statusValue: ACTION_STATUS_WIP, actionTime: Date.now(), actionResultMsg: 'initial scan upon creation' };
        this.#isCaseSensitive = isCaseSensitive;
        this.scanDir();
    }

    get entityType(): typeof TYPE_DIR { return TYPE_DIR }
    get entityHandle() { return this.#entityHandle }
    get entityName() { return this.#entityHandle.name }
    get children() { return this.#children }
    get scanDirChildrenStats() { return this.#scanDirChildrenStats }
    get isCaseSensitive() { return this.#isCaseSensitive }

    async scanDir() {
        let dirIterator: AsyncIterableIterator<[string, FileSystemHandle], [string, FileSystemHandle]> | undefined = undefined;

        try {
            dirIterator = this.entityHandle.entries();

            if (!dirIterator) {
                throw 'DirIterator var is not defined after calling entries()';
            }
        } catch (e) {

            this.throwScanError(ERR_DIR_ENTRIES_FAIL, 'Failed to call entries', causifyCaughtErr(e));
            return;
        }

        const childrenPromises: Promise<ActionStatusResolution>[] = [];


        let done: boolean | undefined = undefined;
        let value: [string, FileSystemHandle] | undefined = undefined;

        const checkCaseSensitivity = this.#checkSensitivityFn();

        do {
            if (this.actionStatusResolutionCfg.scanAbortController.signal.aborted) {
                this.#children.clear();
                return;
            }
            try {

                ({ done, value } = await dirIterator.next());

                const handle = value?.[1];
                if (handle) {
                    checkCaseSensitivity(handle.name);
                }

                if (handle?.kind === TYPE_FILE) {

                    let fileScanActionResolver: ActionStatusResolver;

                    childrenPromises.push(new Promise<ActionStatusResolution>(resolve => fileScanActionResolver = resolve));

                    const actionStatusResolutionCfgFile: ActionStatusResolutionCfg = { 
                        // @ts-expect-error typescript does not see resolver assignment in Promise
                        resolver: fileScanActionResolver,
                        scanAbortController: this.actionStatusResolutionCfg.scanAbortController 
                    };

                    const file = new DirEntityFile(handle as FileSystemFileHandle, actionStatusResolutionCfgFile, [...this.parents, this]);
                    this.#children.set(file.entityId, file);

                } else if (handle?.kind === TYPE_DIR) {

                    let nestedChildrenResolver: ActionStatusResolver;
                    childrenPromises.push(new Promise<ActionStatusResolution>(resolve => nestedChildrenResolver = resolve));

                    const actionStatusResolutionCfg: ActionStatusResolutionCfg = {
                         // @ts-expect-error typescript does not see resolver assignment in Promise
                        resolver: nestedChildrenResolver,
                        scanAbortController: this.actionStatusResolutionCfg.scanAbortController 
                    };

                    const dir = new DirEntityDir(handle as FileSystemDirectoryHandle, actionStatusResolutionCfg, [...this.parents, this], this.#isCaseSensitive);

                    this.#children.set(dir.entityId, dir);

                }
            } catch (e) {
                this.children.clear();
                this.throwScanError(ERR_UNTYPED, 'Error scanning directory', causifyCaughtErr(e));
                return;
            }

        } while (!done)

        this.#monitorDirScanStatus(childrenPromises);
    };

    #checkSensitivityFn() {

        const dirEntriesNameSet: Set<string> | null = !this.#isCaseSensitive ? new Set() : null;

        return (name: string) => {

            if (this.#isCaseSensitive) return;

            const normalizedName = name.toLocaleLowerCase();

            if (dirEntriesNameSet?.has(normalizedName)) {

                this.children.clear();
                this.throwScanError(ERR_CASE_SENSITIVITY, `Encountered child with the same name: '${name}'. Please review your case sensitivity sync setting`, causifyCaughtErr(null));
            }
            dirEntriesNameSet?.add(normalizedName);
        };
    }

    async #monitorDirScanStatus(childrenPromises: Promise<ActionStatusResolution>[]) {

        const childrenResolutions = await Promise.allSettled(childrenPromises);

        const childrenResolutionsValue = childrenResolutions.reduce<ActionStatus>((acc, next) => {
            const nextStatusValue = next?.status === 'fulfilled' ? next.value.statusValue : ACTION_STATUS_ERROR;

            return Math.min(acc, nextStatusValue) as ActionStatus;

        }, ACTION_STATUS_SUCC);

        if (childrenResolutionsValue !== ACTION_STATUS_SUCC) {
            this.children.clear();
            this.throwScanError(ERR_UNTYPED, 'One of children reported error status on scan', causifyCaughtErr(null));
            return;
        }
        this.#computeScanDirStats();

        this[SCAN_ACTION_CHILD_NESTED].statusValue = childrenResolutionsValue;
        this[SCAN_ACTION_CHILD_NESTED].actionResultMsg = 'changing status of children in monitoring';
        this[SCAN_ACTION_CHILD_NESTED].actionTime = Date.now();
        this.actionStatusResolutionCfg.resolver({ entityId: this.entityId, actionType: SCAN_ACTION_CHILD_NESTED, entityType: TYPE_DIR, statusValue: childrenResolutionsValue });
    };

    #computeScanDirStats() {

        if (!this.#children.size) return;

        const dirStats = Array.from(this.#children.values()).reduce<ScanDirChildrenStats>((acc, child) => {

            if (isTypeFile(child)) {

                acc.filesCount++;
                acc.size += child.size ?? 0;

            } else {

                acc.dirsCount++;
                acc.dirsCount += child.scanDirChildrenStats.dirsCount;
                acc.filesCount += child.scanDirChildrenStats.filesCount;
                acc.size += child.scanDirChildrenStats.size;

            }
            return acc;

        }, { filesCount: 0, dirsCount: 0, size: 0 });

        this.#scanDirChildrenStats = dirStats;
    };
}

export class DirEntityFile extends DirEntityBase {

    #entityHandle: FileSystemFileHandle;
    #mtime: number | null = null;
    #size: number | null = null;
    #file: File | null = null;
    [SCAN_ACTION_ENTITY]: ActionStatusInfo;

    constructor(entityHandle: FileSystemFileHandle, actionStatusResolutionCfg: ActionStatusResolutionCfg, parents: DirEntityDir[]) {
        super(actionStatusResolutionCfg, parents);
        this.#entityHandle = entityHandle;
        this[SCAN_ACTION_ENTITY] = { statusValue: ACTION_STATUS_WIP };
        this.scanFile();
    }

    get entityType(): typeof TYPE_FILE { return TYPE_FILE };
    get entityHandle() { return this.#entityHandle }
    get entityName() { return this.#entityHandle.name }
    get size() { return this.#size }
    get file() { return this.#file; }
    get mtime() { return this.#mtime; }

    async scanFile() {
        try {
            if (this.actionStatusResolutionCfg.scanAbortController.signal.aborted) {
                throw new Error('scan cancelled by user');
            }
            const file = await this.#entityHandle.getFile();

            if (!file) {

                this.throwScanError(ERR_GET_FILE_FROM_HANDLE, 'Failed to get file from handle', causifyCaughtErr(null));
                return;
            }
            this.#file = file;
            this.#mtime = file.lastModified;
            this.#size = file.size;

            this[SCAN_ACTION_ENTITY].statusValue = ACTION_STATUS_SUCC;
            this[SCAN_ACTION_ENTITY].actionResultMsg = 'ok';
            this[SCAN_ACTION_ENTITY].actionTime = Date.now();
            this.actionStatusResolutionCfg.resolver({ entityId: this.entityId, actionType: SCAN_ACTION_ENTITY, entityType: TYPE_FILE, statusValue: ACTION_STATUS_SUCC });

        } catch (e: unknown) {
            this.throwScanError(ERR_UNTYPED, 'Error doing file scan', causifyCaughtErr(e));
        }
    }
}

export type DirEntity = DirEntityDir | DirEntityFile;


