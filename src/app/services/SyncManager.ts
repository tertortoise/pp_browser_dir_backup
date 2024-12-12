import { ACTION_NOT_REQUIRED, ACTION_STATUS_INIT, isTypeFile, LEFT, RequireLeftOrRight, RIGHT, SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_EQUAL, SYNC_ACTION_OVERWRITE, SyncCfg, SyncOptions, TYPE_DIR, DirChildrenTree, TYPE_FILE, ActionStatus, ActionStatusChangeDetail, SYNC_STATUS_CHANGE, SYNC_STATUS_AGGR_CHANGE, SyncStatusEntityInfo } from "../types/servicesTypes";
import { DirEntity, DirEntityDir, DirEntityFile } from "./DirManager";
import { SyncTransaction, SyncTransactionFile, SyncTransactionDir } from "./SyncTransaction";
import { ItemsQueue } from "./ItemsQueue";

export class SyncManager {
    [LEFT]: DirEntityDir | null;
    [RIGHT]: DirEntityDir | null;
    #syncId: string = crypto.randomUUID();
    #rootTransaction: SyncTransactionDir | null = null;
    #syncTransactionsFlatMap: Map<string, SyncTransaction> = new Map();
    #syncTransactionsMemoMap: Map<string, SyncStatusEntityInfo> = new Map();
    #syncOptions: SyncOptions;
    #currTransactionBufferSize = 0;
    #currentTransactionBufferCount = 0;
    #rootEventBus: EventTarget = new EventTarget();
    #syncTransactionsQueue: ItemsQueue<SyncTransaction> | null = null;

    constructor(left: DirEntityDir, right: DirEntityDir, syncOptions?: Partial<SyncOptions>) {
        this[LEFT] = left;
        this[RIGHT] = right;
        this.#syncOptions = { isCaseSensitive: false, bufferCopyMaxSize: 100_000_000, numberTransactionsMax: 5, ...syncOptions };
        this.createRootTransaction();
    }

    get syncId() { return this.#syncId }
    get syncOptions() { return this.#syncOptions }
    get syncTree() { return this.#rootTransaction?.children }
    get syncTransactionsFlatMap() { return this.#syncTransactionsFlatMap }
    get rootEventBus() { return this.#rootEventBus }
    get rootTransaction() { return this.#rootTransaction }
    get syncTransactionsQueue() { return this.#syncTransactionsQueue }


    makeSubscriberToTransactionStatus(entityId: string, eventName: typeof SYNC_STATUS_CHANGE | typeof SYNC_STATUS_AGGR_CHANGE) {

        return (listener: () => void) => {
            const syncTransaction = this.syncTransactionsFlatMap?.get?.(entityId);

            if (!syncTransaction) {
                console.error('Failed to find syncTransaction for table row');
                return () => { return; };
            }
            const statusListener = ({ detail }: CustomEvent<ActionStatusChangeDetail<ActionStatus>>) => {
                if (detail.entityId !== entityId) return;
                listener();
            }
            syncTransaction.selfEventBus.addEventListener(eventName, statusListener as EventListener);

            return () => {
                syncTransaction.selfEventBus.removeEventListener(eventName, statusListener as EventListener);
            };
        };
    }

    makeGetTransactionSyncStatusSnapshot<
        T extends (typeof SYNC_STATUS_CHANGE | typeof SYNC_STATUS_AGGR_CHANGE),
        R = T extends typeof SYNC_STATUS_AGGR_CHANGE ? ActionStatus : SyncStatusEntityInfo
    >(entityId: string, eventName: T) {

        return (): R | undefined => {
            const syncTransaction = this.syncTransactionsFlatMap?.get?.(entityId);

            if (!syncTransaction) {
                console.error('Failed to find syncTransaction for table row');
                return;
            }

            if (eventName === SYNC_STATUS_CHANGE) {

                const resultMemo = this.#syncTransactionsMemoMap.get(entityId);

                if (resultMemo &&
                    resultMemo.syncStatus === syncTransaction.syncStatus &&
                    resultMemo.syncStatusTimestamp === syncTransaction.syncStatusTimestamp
                ) {
                    return resultMemo as R;
                }

                const result = {
                    syncStatus: syncTransaction.syncStatus,
                    syncStatusTimestamp: syncTransaction.syncStatusTimestamp,
                    syncTransactionErrorInfo: syncTransaction.syncTransactionErrorInfo,
                };

                this.#syncTransactionsMemoMap.set(entityId, result as SyncStatusEntityInfo);

                return result as R;

            }

            return syncTransaction.childrenSyncAggrStatus as R;
        };
    };

    createRootTransaction() {
        if (!this[LEFT] || !this[RIGHT]) {
            return;
        }

        const syncCfg: SyncCfg<DirEntityDir> = {
            syncAction: SYNC_ACTION_EQUAL,
            [LEFT]: this[LEFT],
            [RIGHT]: this[RIGHT]
        };

        const tempMap: Map<string, SyncTransaction> = new Map();

        this.#createDirTransaction(syncCfg, tempMap, this.#rootEventBus, this[RIGHT].entityHandle);

        this.#rootTransaction = [...tempMap][0][1] as SyncTransactionDir;
    };

    #createTransaction(
        syncCfg: SyncCfg<DirEntity>,
        syncMap: Map<string, SyncTransaction>,
        isFile: boolean, parentEventBus: EventTarget,
        rightParentDirHandle?: FileSystemDirectoryHandle
    ) {

        if (isFile) {
            return this.#createFileTransaction(syncCfg as SyncCfg<DirEntityFile>, syncMap, parentEventBus, rightParentDirHandle);
        } else {
            return this.#createDirTransaction(syncCfg as SyncCfg<DirEntityDir>, syncMap, parentEventBus, rightParentDirHandle);
        }

    }

    #createFileTransaction(
        syncCfg: SyncCfg<DirEntityFile>,
        syncMap: Map<string, SyncTransaction>,
        parentEventBus: EventTarget,
        rightParentDirHandle?: FileSystemDirectoryHandle
    ) {

        const newFileTransaction = new SyncTransactionFile(syncCfg, parentEventBus, rightParentDirHandle);
        newFileTransaction.setSyncStatus(syncCfg.syncAction === SYNC_ACTION_EQUAL ? ACTION_NOT_REQUIRED : ACTION_STATUS_INIT, ['initial status'], Date.now());

        syncMap.set(newFileTransaction.entityId, newFileTransaction);
        this.#syncTransactionsFlatMap.set(newFileTransaction.entityId, newFileTransaction);

        return newFileTransaction;
    }

    #createDirTransaction(
        syncCfg: SyncCfg<DirEntityDir>,
        syncMap: Map<string, SyncTransaction>,
        parentEventBus: EventTarget,
        rightParentDirHandle?: FileSystemDirectoryHandle
    ) {

        const rightDiffSideChildren = syncCfg.syncAction !== SYNC_ACTION_COPYLEFT && syncCfg[RIGHT].children.size ? { [RIGHT]: syncCfg[RIGHT].children } : null;

        const leftDiffSideChildren = syncCfg.syncAction !== SYNC_ACTION_DELETERIGHT && syncCfg[LEFT].children.size ? { [LEFT]: syncCfg[LEFT].children } : null;

        const rightParentDirHandleForChildren = syncCfg.syncAction !== SYNC_ACTION_COPYLEFT ? syncCfg[RIGHT].entityHandle : undefined;

        let children: Map<string, SyncTransaction> | undefined = undefined;
        let childrenToSyncMap: Map<string, ActionStatus> | undefined = undefined;

        const newDirTransaction = new SyncTransactionDir(syncCfg, parentEventBus, rightParentDirHandle);
        newDirTransaction.setSyncStatus(syncCfg.syncAction === SYNC_ACTION_EQUAL ? ACTION_NOT_REQUIRED : ACTION_STATUS_INIT, ['initial status'], Date.now());

        if (rightDiffSideChildren || leftDiffSideChildren) {

            const diffSides = { ...rightDiffSideChildren, ...leftDiffSideChildren } as RequireLeftOrRight<DirChildrenTree>;
            children = this.#diffDirs(diffSides, newDirTransaction.selfEventBus, rightParentDirHandleForChildren);
            childrenToSyncMap = this.#filterChildrenToSync(children);
        }

        newDirTransaction.children = children ?? new Map();
        newDirTransaction.childrenToSyncMap = childrenToSyncMap ?? new Map();

        newDirTransaction.aggregateChildrenDiffStats();

        syncMap.set(newDirTransaction.entityId, newDirTransaction);
        this.#syncTransactionsFlatMap.set(newDirTransaction.entityId, newDirTransaction);

        return newDirTransaction;
    };

    #filterChildrenToSync(syncMap: Map<string, SyncTransaction>) {

        const childrenToSyncMap = new Map<string, ActionStatus>();

        syncMap.forEach(childTransaction => {
            if (this.#checkTransactionInNeedOfSync(childTransaction)) {
                childrenToSyncMap.set(childTransaction.entityId, ACTION_STATUS_INIT);
            }
        });

        return childrenToSyncMap;
    };

    #diffDirs(diffSides: RequireLeftOrRight<DirChildrenTree>, parentEventBus: EventTarget, rightParentDirHandle?: FileSystemDirectoryHandle) {

        const syncMap: Map<string, SyncTransaction> = new Map();

        if (diffSides[LEFT] && !diffSides[RIGHT]) { // COPYLEFT

            diffSides[LEFT].forEach(dirEntity => this.#createTransaction(
                { syncAction: SYNC_ACTION_COPYLEFT, [LEFT]: dirEntity },
                syncMap,
                isTypeFile(dirEntity),
                parentEventBus,
                rightParentDirHandle
            ));

        } else if (!diffSides[LEFT] && diffSides[RIGHT]) { // DELETERIGHT

            diffSides[RIGHT].forEach(dirEntity => this.#createTransaction(
                { syncAction: SYNC_ACTION_DELETERIGHT, [RIGHT]: dirEntity },
                syncMap,
                isTypeFile(dirEntity),
                parentEventBus,
                rightParentDirHandle
            ));

        } else if (diffSides[LEFT] && diffSides[RIGHT]) { // EQUAL -> EQUAL, OVERWRITE, COPYLEFT, DELETERIGHT

            const { rightNameMap } = Array.from(diffSides[RIGHT].values()).reduce<{ rightNameMap: DirChildrenTree }>((acc, nextEntity) => {

                const normalizedName = this.#syncOptions.isCaseSensitive ? nextEntity.entityName : normalizeNameByCase(nextEntity.entityName);

                acc.rightNameMap.set(normalizedName, nextEntity);

                return acc;
            }, { rightNameMap: new Map() });

            if (diffSides[RIGHT].size !== rightNameMap.size) {
                console.warn('potential error normalizing based on current case sesitivity setting', this.#syncOptions.isCaseSensitive);
            }

            const { rightDoneNameSet } = Array.from(diffSides[LEFT].values()).reduce<{ rightDoneNameSet: Set<string> }>((acc, nextEntity) => {

                const normalizedName = this.#syncOptions.isCaseSensitive ? nextEntity.entityName : normalizeNameByCase(nextEntity.entityName);

                const equalFromRightByName = rightNameMap.get(normalizedName);
                if (equalFromRightByName) {
                    acc.rightDoneNameSet.add(normalizedName);
                }

                const dirsAreEqual = equalFromRightByName && equalFromRightByName.entityType === TYPE_DIR && nextEntity.entityType === TYPE_DIR;

                const filesAreEqualByName = (
                    equalFromRightByName
                    && isTypeFile(equalFromRightByName)
                    && isTypeFile(nextEntity)
                );

                const filesAreFullEqual = (
                    filesAreEqualByName
                    && equalFromRightByName.size === nextEntity.size
                    && equalFromRightByName.mtime
                    && nextEntity.mtime
                    && equalFromRightByName.mtime >= nextEntity.mtime
                );


                if (dirsAreEqual) {

                    this.#createDirTransaction(
                        { syncAction: SYNC_ACTION_EQUAL, [LEFT]: nextEntity, [RIGHT]: equalFromRightByName },
                        syncMap,
                        parentEventBus,
                        rightParentDirHandle

                    );

                } else if (filesAreFullEqual) {

                    this.#createFileTransaction(
                        { syncAction: SYNC_ACTION_EQUAL, [LEFT]: nextEntity, [RIGHT]: equalFromRightByName },
                        syncMap,
                        parentEventBus,
                        rightParentDirHandle

                    );

                } else if (filesAreEqualByName) {

                    this.#createFileTransaction(
                        { syncAction: SYNC_ACTION_OVERWRITE, [LEFT]: nextEntity, [RIGHT]: equalFromRightByName },
                        syncMap,
                        parentEventBus,
                        rightParentDirHandle

                    );

                } else {
                    /* 
                    option 1: left is present but right is not
                    option 2: two entities on left and right are present AND equal by name AND different by type, e.g. dir 'a' on left and file 'a' on right
                    */

                    const dependant = this.#createTransaction(
                        { syncAction: SYNC_ACTION_COPYLEFT, [LEFT]: nextEntity },
                        syncMap,
                        isTypeFile(nextEntity),
                        parentEventBus,
                        rightParentDirHandle
                    );

                    if (equalFromRightByName) { // option 2, prev copyleft transaction will be dependnt on this one

                        const dependency = this.#createTransaction(
                            { syncAction: SYNC_ACTION_DELETERIGHT, [RIGHT]: equalFromRightByName },
                            syncMap,
                            isTypeFile(equalFromRightByName),
                            parentEventBus,
                            rightParentDirHandle
                        );

                        dependant.dependency = dependency;
                        
                        if (!dependency.dependants) {
                            dependency.dependants = new Map();  
                        }
                        
                        dependency.dependants.set(dependant.entityId, dependant);
                    }
                }
                return acc;
            }, { rightDoneNameSet: new Set() });

            rightNameMap.forEach((rightEntity, rightEntityNameNormalized) => {
                if (rightDoneNameSet.has(rightEntityNameNormalized)) {
                    return;
                }
                this.#createTransaction(
                    { syncAction: SYNC_ACTION_DELETERIGHT, [RIGHT]: rightEntity },
                    syncMap,
                    isTypeFile(rightEntity),
                    parentEventBus,
                    rightParentDirHandle
                );
            });
        }
        return syncMap;
    };

    startSync() {
        if (
            !this.#rootTransaction?.children ||
            (this.#rootTransaction.syncCfg.syncAction === SYNC_ACTION_EQUAL && !this.#rootTransaction.childrenToSyncMap?.size)
        ) {
            console.error('Root dirs do not need sync. Unexpected call to sync.');
            return;
        }

        this.#syncTransactionsQueue = new ItemsQueue();

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this.#rootTransaction.startTransaction(() => { }); // special cb for root transaction?
        this.#addTransactionsToQueue(this.#rootTransaction.children);
        this.#fillTransactionBuffer();
    };

    #addTransactionsToQueue(syncArg: Map<string, SyncTransaction>): void;
    #addTransactionsToQueue(syncArg: SyncTransaction): void;
    #addTransactionsToQueue(syncArg: Map<string, SyncTransaction> | SyncTransaction): void {

        if (syncArg instanceof Map) {

            for (const syncTransaction of syncArg.values()) {
                this.#addTransactionToQueue(syncTransaction);
            }
        } else {
            this.#addTransactionToQueue(syncArg);
        }
    }

    #addTransactionToQueue(syncTransaction: SyncTransaction) {

        if (this.#checkTransactionInNeedOfSync(syncTransaction) && !syncTransaction.dependency) {
            this.#syncTransactionsQueue?.enqueue(syncTransaction);
        }
    }

    #fillTransactionBuffer() {

        let nextTransactionInQueue: SyncTransaction | undefined = this.#syncTransactionsQueue?.head;
        if (!nextTransactionInQueue) return;
        do {
            const bufferSizeIncr = this.#computeCurrentBufferSize(nextTransactionInQueue);
            if (
                (!this.#currentTransactionBufferCount) ||
                ((this.#currTransactionBufferSize + bufferSizeIncr) <= this.#syncOptions.bufferCopyMaxSize
                    && this.#currentTransactionBufferCount < this.#syncOptions.numberTransactionsMax)
            ) {
                this.#currTransactionBufferSize += bufferSizeIncr;
                this.#syncOptions.numberTransactionsMax && this.#currentTransactionBufferCount++;
                this.#syncTransactionsQueue?.dequeue();
                const currTransaction = nextTransactionInQueue;
                nextTransactionInQueue.startTransaction(() => this.#removeTransactionFromBuffer(currTransaction));
            } else {
                return;
            }

            nextTransactionInQueue = this.#syncTransactionsQueue?.head;

        } while (nextTransactionInQueue)
    }

    #removeTransactionFromBuffer(syncTransaction: SyncTransaction) {

        this.#currTransactionBufferSize -= this.#computeCurrentBufferSize(syncTransaction);
        this.#syncOptions.numberTransactionsMax && this.#currentTransactionBufferCount--;

        syncTransaction.dependants?.forEach(dependant => {
            dependant.dependency = null;
            this.#addTransactionsToQueue(dependant);
        });
    
        if (
            !isTypeFile(syncTransaction) &&
            syncTransaction.syncCfg.syncAction !== SYNC_ACTION_DELETERIGHT &&
            syncTransaction.children?.size
        ) {
            this.#addTransactionsToQueue(syncTransaction.children);
        }
        this.#fillTransactionBuffer();
    }

    #checkTransactionInNeedOfSync(syncTransaction: SyncTransaction) {
        return (
            syncTransaction.syncCfg.syncAction !== SYNC_ACTION_EQUAL
            || (!isTypeFile(syncTransaction) && syncTransaction.childrenToSyncMap?.size)
        );
    }

    #computeCurrentBufferSize(syncTransaction: SyncTransaction): number {

        const bufferLimitIsApplicable = this.#syncOptions.bufferCopyMaxSize &&
            (syncTransaction.syncCfg.syncAction === SYNC_ACTION_OVERWRITE
                || syncTransaction.syncCfg.syncAction === SYNC_ACTION_COPYLEFT);

        if (bufferLimitIsApplicable && syncTransaction.syncCfg[LEFT]?.entityType === TYPE_FILE) {
            return syncTransaction.syncCfg[LEFT].size ?? 0;
        }
        return 0;
    }
}

export function normalizeNameByCase(name: string): string {
    return name.toLocaleLowerCase();
}