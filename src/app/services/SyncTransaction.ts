import { SyncCfg, LEFT, RIGHT, TYPE_FILE, TYPE_DIR, ActionStatus, SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_OVERWRITE, ActionStatusChangeDetail, ACTION_STATUS_SUCC, ACTION_STATUS_ERROR, SYNC_STATUS_CHANGE, ACTION_STATUS_WIP, ACTION_STATUS_RETRYING, ACTION_STATUS_MIXED, SYNC_STATUS_AGGR_CHANGE, ActionStatusDescrete, ACTION_NOT_REQUIRED, ACTION_STATUS_INIT, SYNC_ACTION_EQUAL, DiffStats, SYNC_ACTION_TUPLE, DiffStatsTotals, ScanDirChildrenStats, isTypeFile, DiffStatsAcc, TransactionGenerator, TransactionGeneratorReturnType, TransactionGeneratorYield, SyncTransactionErrorInfo } from "../types/servicesTypes";
import { DirEntity, DirEntityFile, DirEntityDir } from "./DirManager";

export abstract class SyncTransactionBase<D extends DirEntity> {

    #entityType: D['entityType'];
    #entityId = crypto.randomUUID();
    #entityName: string;
    #rightParentDirHandle?: FileSystemDirectoryHandle;
    #parentEventBus: EventTarget;
    #selfEventBus: EventTarget = new EventTarget();
    #syncStatus: ActionStatusDescrete = ACTION_NOT_REQUIRED;
    #syncStatusTimestamp: number = Date.now();
    #syncTransactionErrorInfo: SyncTransactionErrorInfo | undefined = undefined;
    #childrenSyncAggrStatus: ActionStatus = ACTION_NOT_REQUIRED;
    #childrenToSyncMap: Map<string, ActionStatus> | undefined;
    #aggrSyncStatus: ActionStatus = ACTION_NOT_REQUIRED;
    #syncCfg: SyncCfg<D>;
    #transactionAbortController: AbortController = new AbortController();
    #actionStatusLog: ActionStatusChangeDetail<ActionStatus>[] = [];
    #cancelCallback = () => {
        this.#transactionAbortController.abort('Backup was cancelled.');
        this.selfEventBus.dispatchEvent(new CustomEvent('cancel'));
    }
    dependants: Map<string, SyncTransaction> | null = null;
    dependency: SyncTransaction | null = null;

    get entityId() { return this.#entityId; }
    get entityName() { return this.#entityName; }
    get entityType() { return this.#entityType; }
    get syncCfg() { return this.#syncCfg; }
    get parentEventBus() { return this.#parentEventBus }
    get selfEventBus() { return this.#selfEventBus }
    get syncStatus() { return this.#syncStatus }
    get syncStatusTimestamp() { return this.#syncStatusTimestamp }
    get syncTransactionErrorInfo() { return this.#syncTransactionErrorInfo }
    get childrenSyncAggrStatus() { return this.#childrenSyncAggrStatus }

    get transactionAbortController() { return this.#transactionAbortController }
    get actionStatusLog() { return this.#actionStatusLog }

    get rightParentDirHandle() { return this.#rightParentDirHandle; }
    set rightParentDirHandle(rightHandle: FileSystemDirectoryHandle | undefined) {
        if (rightHandle && !this.#rightParentDirHandle) {
            this.#rightParentDirHandle = rightHandle;
        }
    }

    get childrenToSyncMap(): Map<string, ActionStatus> | undefined { return this.#childrenToSyncMap }
    set childrenToSyncMap(newChildrenToSyncMap: Map<string, ActionStatus>) {

        if (!this.#childrenToSyncMap) {

            this.#childrenToSyncMap = newChildrenToSyncMap;
        }
        if (this.#childrenToSyncMap.size) {
            const changeEvent = new CustomEvent<ActionStatusChangeDetail<ActionStatus>>(SYNC_STATUS_AGGR_CHANGE, {
                detail: {
                    eventType: SYNC_STATUS_AGGR_CHANGE,
                    entityId: this.entityId,
                    statusValue: ACTION_STATUS_INIT,
                    msg: ['initial value set on setting childrenToSyncMap'],
                    timestamp: Date.now(),
                },
            });
            this.#monitorAggrSyncStatus(changeEvent);
        }
    }


    constructor(
        entityType: D['entityType'],
        syncCfg: SyncCfg<D>,
        parentEventBus: EventTarget,
        rightParentDirHandle?: FileSystemDirectoryHandle
    ) {
        this.#entityType = entityType;
        this.#parentEventBus = parentEventBus;
        this.#entityName = LEFT in syncCfg ? syncCfg[LEFT].entityName : syncCfg[RIGHT].entityName;
        this.#rightParentDirHandle = rightParentDirHandle;
        this.#syncCfg = syncCfg;
        this.#parentEventBus.addEventListener('cancel', this.#cancelCallback);
        this.#selfEventBus?.addEventListener(SYNC_STATUS_CHANGE, this.#monitorAggrSyncStatus);
        this.#selfEventBus?.addEventListener(SYNC_STATUS_AGGR_CHANGE, this.#monitorAggrSyncStatus);
    }

   

    abstract executeTransaction(): TransactionGenerator;

    setSyncStatus(status: ActionStatusDescrete, msg: string[] = [], timestamp: number = Date.now(), syncTransactionErrorInfo?: SyncTransactionErrorInfo) {

        this.#syncStatus = status;
        this.#syncStatusTimestamp = timestamp;
        if (status === ACTION_STATUS_ERROR && syncTransactionErrorInfo) {

            this.#syncTransactionErrorInfo = syncTransactionErrorInfo;
        } else if (status === ACTION_STATUS_ERROR) {

            console.error('Error status of transaction, but not errorInfo is present');
            this.#syncTransactionErrorInfo = {
                transactionErrorMsg: 'uncaught error',
                cleanUpMsg: 'unknown cleanup status',
            };
        }

        const changeEvent = new CustomEvent<ActionStatusChangeDetail<ActionStatusDescrete>>(SYNC_STATUS_CHANGE, {
            detail: {
                eventType: SYNC_STATUS_CHANGE,
                entityId: this.#entityId,
                statusValue: status,
                msg,
                timestamp: timestamp
            },
        });
        this.#selfEventBus.dispatchEvent(changeEvent);
    }

    startTransaction(removeTransactionFromBufferCb: () => void) {
        if (this.#syncStatus !== ACTION_NOT_REQUIRED) {
            this.setSyncStatus(ACTION_STATUS_WIP);
        }

        const transactionPromise = this.#transactionAbortController.signal.aborted ?
            Promise.reject({ cleanUpMsg: 'Cleanup is not required', cleanUpTimestamp: Date.now(), transactionErrorMsg: 'Backup was cancelled, transaction was not started' }) :
            this.#iterateOverTransactionGenerator(this.executeTransaction());

        transactionPromise
            .then(({ transactionTimestamp = Date.now() }) => {

                if (this.#syncStatus !== ACTION_NOT_REQUIRED) {
                    this.setSyncStatus(ACTION_STATUS_SUCC, ['ok'], transactionTimestamp);
                }
            })
            .catch(({ cleanUpMsg = '', cleanUpTimestamp = Date.now(), transactionErrorMsg = '' }: { cleanUpMsg?: string; cleanUpTimestamp?: number, transactionErrorMsg?: string }) => {

                this.setSyncStatus(ACTION_STATUS_ERROR, [cleanUpMsg], cleanUpTimestamp, { cleanUpMsg, transactionErrorMsg });
            })
            .finally(() => {
                removeTransactionFromBufferCb();
            });
    }

    async #iterateOverTransactionGenerator(generator: TransactionGenerator) {
        interface TransactionResultAcc {
            transactionStatusIsSuccess: boolean;
            transactionErrorMsg?: string,
            transactionTimestamp?: number,
            cleanUpStatusIsOk?: boolean,
            cleanUpMsg?: string,
            cleanUpTimestamp?: number,
        }
        const transactionResultAcc: TransactionResultAcc = {
            transactionStatusIsSuccess: true,
            transactionErrorMsg: undefined,
            transactionTimestamp: undefined,
            cleanUpStatusIsOk: undefined,
            cleanUpMsg: undefined,
            cleanUpTimestamp: undefined,
        };

        let done: boolean | undefined = undefined;
        let value: TransactionGeneratorYield | TransactionGeneratorReturnType | Awaited<Promise<unknown>> | undefined = undefined;
        let iterationResult: TransactionGeneratorYield | TransactionGeneratorReturnType | undefined = undefined;
        let skipNext = false;


        do {
            if (!skipNext) {

                ({ value, done } = generator.next(iterationResult));

            } else {
                skipNext = false;
            }

            if (!done && this.#transactionAbortController.signal.aborted && transactionResultAcc.transactionStatusIsSuccess) {

                transactionResultAcc.transactionStatusIsSuccess = false;
                transactionResultAcc.transactionErrorMsg = this.#transactionAbortController.signal.reason;

                ({ value, done } = generator.throw(transactionResultAcc.transactionErrorMsg));
            }

            try {
                iterationResult = typeof value === 'function' ? await value() : value;
                if (done) {
                    if (transactionResultAcc.transactionStatusIsSuccess) {
                        transactionResultAcc.transactionTimestamp = (iterationResult as TransactionGeneratorReturnType)?.timestamp ?? Date.now();
                    } else {
                        transactionResultAcc.cleanUpStatusIsOk = true;
                        transactionResultAcc.cleanUpMsg = (iterationResult as TransactionGeneratorReturnType)?.cleanUpMsg ?? 'ok';
                        transactionResultAcc.cleanUpTimestamp = (iterationResult as TransactionGeneratorReturnType)?.timestamp ?? Date.now();
                    }
                }
            } catch (e) {
                if (transactionResultAcc.transactionStatusIsSuccess) {

                    transactionResultAcc.transactionStatusIsSuccess = false;
                    transactionResultAcc.transactionErrorMsg = e?.toString();
                    transactionResultAcc.transactionTimestamp = Date.now();

                    ({ done, value } = generator.throw(e));

                    skipNext = true;
                    if (done) {

                        transactionResultAcc.cleanUpStatusIsOk = true;
                        transactionResultAcc.cleanUpMsg = (value as TransactionGeneratorReturnType).cleanUpMsg;
                        transactionResultAcc.cleanUpTimestamp = (value as TransactionGeneratorReturnType).timestamp;
                    }
                } else {

                    transactionResultAcc.cleanUpStatusIsOk = false;
                    transactionResultAcc.cleanUpMsg = e?.toString();

                    break;
                }
            }
        } while (!done)

        const { transactionStatusIsSuccess, transactionTimestamp, ...error } = transactionResultAcc;

        if (!transactionStatusIsSuccess) {

            throw error;
        }
        return {
            transactionTimestamp,
        };
    }

    #monitorAggrSyncStatus = ((changeEvent: CustomEvent<ActionStatusChangeDetail<ActionStatus>>) => {

        const { entityId: eventEntityId, statusValue: eventStatusValue, eventType } = changeEvent.detail;

        const isSelfStatusEvent = eventType === SYNC_STATUS_CHANGE && eventEntityId === this.#entityId;
        const isChildStatusEvent = eventType === SYNC_STATUS_AGGR_CHANGE;
        if (!isSelfStatusEvent && !isChildStatusEvent) return;

        this.#actionStatusLog.push(changeEvent.detail);

        if (isChildStatusEvent && this.#childrenToSyncMap?.size) {

            if (this.#childrenToSyncMap?.has(eventEntityId)) {

                this.#childrenToSyncMap.set(eventEntityId, eventStatusValue);
            }

            const newAggrChildrenStatus = this.#findAggrStatusValue(new Set(this.#childrenToSyncMap.values()));

            if (this.#childrenSyncAggrStatus !== newAggrChildrenStatus) {

                this.#childrenSyncAggrStatus = newAggrChildrenStatus;

                const newChangeEvent = new CustomEvent<ActionStatusChangeDetail<ActionStatus>>(SYNC_STATUS_AGGR_CHANGE, {
                    detail: {
                        eventType: SYNC_STATUS_AGGR_CHANGE,
                        entityId: this.entityId,
                        statusValue: newAggrChildrenStatus,
                        msg: ['notifying self on aggrChildrenStatus change'],
                        timestamp: Date.now(),
                    }
                });
                this.#selfEventBus.dispatchEvent(newChangeEvent); // notifying self, used by external subscribers
            }
        }

        const newAggrStatus = this.#findAggrStatusValue(new Set([this.#syncStatus, ...(this.#childrenToSyncMap?.values() ?? [])]));



        if (newAggrStatus !== this.#aggrSyncStatus) {

            const changeEvent = new CustomEvent<ActionStatusChangeDetail<ActionStatus>>(SYNC_STATUS_AGGR_CHANGE, {
                detail: {
                    eventType: SYNC_STATUS_AGGR_CHANGE,
                    entityId: this.entityId,
                    statusValue: newAggrStatus,
                    msg: ['notifying parent on self aggrStatus change'],
                    timestamp: Date.now(),
                }
            });
            this.#aggrSyncStatus = newAggrStatus;
            this.#parentEventBus.dispatchEvent(changeEvent); // notifying parent
        }

    }) as EventListener;

    #findAggrStatusValue(statusValuesSet: Set<ActionStatus>) {

        if (statusValuesSet.size === 1) {

            return [...statusValuesSet][0];
        }

        const normalizedSet = new Set([...statusValuesSet].filter(statusValue => statusValue !== ACTION_NOT_REQUIRED));

        if (normalizedSet.size === 1) {

            return [...normalizedSet][0];
        }

        const min = Math.min(...normalizedSet);
        const aggrStatus: ActionStatus = min <= ACTION_STATUS_RETRYING ? ACTION_STATUS_WIP : ACTION_STATUS_MIXED;

        return aggrStatus;
    };
};

export class SyncTransactionFile extends SyncTransactionBase<DirEntityFile> {

    constructor(
        syncCfg: SyncCfg<DirEntityFile>,
        parentEventBus: EventTarget,
        rightParentDirHandle?: FileSystemDirectoryHandle
    ) {
        super(TYPE_FILE, syncCfg, parentEventBus, rightParentDirHandle);
    }

    executeTransaction(): TransactionGenerator {

        switch (this.syncCfg.syncAction) {

            case SYNC_ACTION_COPYLEFT: return this.#executeCopyLeft();
            case SYNC_ACTION_OVERWRITE: return this.#executeOverwrite();
            case SYNC_ACTION_DELETERIGHT: return this.#executeDeleteRight();
            default: return (function* () {
                yield () => Promise.resolve(undefined);
                return {
                    timestamp: Date.now(),
                    transactionErrorMsg: 'triggered default case in executeTransaction',
                };
            }());
        }
    };

    *#executeCopyLeft(): TransactionGenerator {
        if (this.syncCfg.syncAction !== SYNC_ACTION_COPYLEFT) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: 'Mismatch in sync action and method',
            };
        }

        let rightFileHandle: FileSystemFileHandle | undefined = undefined;
        try {
            const file = this.syncCfg[LEFT].file;

            if (!this.rightParentDirHandle || !file) {
                yield () => Promise.reject(`rightParentDirHandle or file ref is absent`);
            }
            // @ts-expect-error if no rightParentDirHandle promise is rejected above
            rightFileHandle = (yield () => this.rightParentDirHandle.getFileHandle(this.entityName, { create: true })) as FileSystemFileHandle;

             // @ts-expect-error if rightFileHandle is absent we expect error to be caught
            const writable = (yield () => rightFileHandle.createWritable()) as FileSystemWritableFileStream;

             // @ts-expect-error if no file promise is rejected above
            const readable = file.stream();

            yield () => readable.pipeTo(writable, { signal: this.transactionAbortController.signal });

            // @ts-expect-error if rightFileHandle is absent we expect error to be caught
            const rightFile = (yield () => rightFileHandle.getFile()) as File;

            return {
                timestamp: rightFile.lastModified,
            };
        } catch (e) {
            if (rightFileHandle) {

                // @ts-expect-error if rightParentDirHandle is absent rejection is above
                yield () => this.rightParentDirHandle.removeEntry(this.entityName);
                return {
                    timestamp: Date.now(),
                    transactionErrorMsg: `${e}`,
                    cleanUpMsg: `Cleanup for file '${this.entityName}' done`,
                };
            }
            return {
                timestamp: Date.now(),
                transactionErrorMsg: `${e}`,
                cleanUpMsg: `Cleanup for file '${this.entityName}' is not required`,
            };
        }
    };

    *#executeOverwrite(): TransactionGenerator {
        if (this.syncCfg.syncAction !== SYNC_ACTION_OVERWRITE) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: 'Mismatch btw sync action and method',
            };
        }
        try {
            const leftFile = this.syncCfg[LEFT].file;
            const rightFileHandle = this.syncCfg[RIGHT].entityHandle;


            if (!leftFile || !rightFileHandle) {
                yield () => Promise.reject('Left file ref or rightFileHandle is absent');
            }

            const writable = (yield () => rightFileHandle.createWritable()) as FileSystemWritableFileStream;
            // @ts-expect-error if no leftFile - rejection happens above
            const readable = leftFile.stream();

            yield () => readable.pipeTo(writable, { signal: this.transactionAbortController.signal });

            const newRightFile = (yield () => rightFileHandle.getFile()) as File;

            return {
                timestamp: newRightFile.lastModified,
            };
        } catch (e) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: `${e}`,
                cleanUpMsg: `Cleanup is not required`
            };
        }
    };

    *#executeDeleteRight() {
        if (this.syncCfg.syncAction !== SYNC_ACTION_DELETERIGHT) {
            return {
                timestamp: Date.now(),
                message: 'Mismatch btw sync action and method',
            };
        }
        const entityHandle = this.syncCfg[RIGHT].entityHandle;
        try {
            if (!this.rightParentDirHandle) {
                yield () => Promise.reject('rightParentDirHandle is absent');
            }
            // if rightParentDirHandle is null - yield is invoked
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            yield () => this.rightParentDirHandle!.removeEntry(entityHandle.name);
            return {
                timestamp: Date.now(),
            };
        } catch (e) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: `${e}`,
                cleanUpMsg: 'Cleanup is not required'
            };
        }
    };
}

export class SyncTransactionDir extends SyncTransactionBase<DirEntityDir> {

    #children: Map<string, SyncTransaction> | undefined;
    #diffStats: DiffStats = this.#generateInitDiffStats(true);

    constructor(syncCfg: SyncCfg<DirEntityDir>, parentEventBus: EventTarget, rightParentDirHandle?: FileSystemDirectoryHandle) {

        super(TYPE_DIR, syncCfg, parentEventBus, rightParentDirHandle);
    }


    get diffStats() { return this.#diffStats }

    get diffStatsTotals(): DiffStatsTotals {

        const diffStatsOverwrite = this.#diffStats[SYNC_ACTION_OVERWRITE];
        const diffStatsCopyLeft = this.#diffStats[SYNC_ACTION_COPYLEFT];
        const diffStatsDeleteRight = this.#diffStats[SYNC_ACTION_DELETERIGHT];
        const diffStatsEqual = this.#diffStats[SYNC_ACTION_EQUAL];
        return {
            copy: {
                size: diffStatsCopyLeft.sizeLeft + diffStatsOverwrite?.sizeLeft,
                dirsCount: diffStatsCopyLeft.dirsCount + diffStatsOverwrite?.dirsCount,
                filesCount: diffStatsCopyLeft.filesCount + diffStatsOverwrite?.filesCount,
            },
            delete: {
                size: diffStatsDeleteRight.sizeRight + diffStatsOverwrite.sizeRight,
                dirsCount: diffStatsDeleteRight.dirsCount + diffStatsOverwrite.dirsCount,
                filesCount: diffStatsDeleteRight.filesCount + diffStatsOverwrite.filesCount,
            },
            equal: {
                size: diffStatsEqual.sizeLeft,
                dirsCount: diffStatsEqual.dirsCount,
                filesCount: diffStatsEqual.filesCount,
            },
        };
    }

    get children(): Map<string, SyncTransaction> | undefined { return this.#children; }

    set children(newChildren: Map<string, SyncTransaction>) {
        if (newChildren && !this.#children) {
            this.#children = newChildren;
        }
    }

    setSyncStatusForChildrenRecursively(status: ActionStatusDescrete, msg: string[] = [], timestamp: number = Date.now(), syncTransactionErrorInfo?: SyncTransactionErrorInfo) {

        if (!isTypeFile(this) && this.childrenToSyncMap?.size && this.#children) {
            this.#children.values().forEach(childTransaction => {
                if (this.childrenToSyncMap?.has(childTransaction.entityId)) {
                    childTransaction.setSyncStatus(status, msg, timestamp, syncTransactionErrorInfo);
                }
                if (!isTypeFile(childTransaction)) {
                    childTransaction.setSyncStatusForChildrenRecursively(status, msg, timestamp, syncTransactionErrorInfo);
                }
            });
        }
    }

    aggregateChildrenDiffStats() {

        if (!this.#children) {
            console.error(`Expected to find children on dir ${this.entityName} at aggregating diff stats, but found null`);
            return;
        }

        const newDiffStats = Array.from(this.#children.values()).reduce<DiffStats>((acc, dirChild) => {

            const isChildFile = isTypeFile(dirChild);

            if (isChildFile) {

                const fileChildSyncCfg = dirChild.syncCfg;

                acc[fileChildSyncCfg.syncAction].sizeLeft += fileChildSyncCfg.syncAction !== SYNC_ACTION_DELETERIGHT ? fileChildSyncCfg[LEFT].size ?? 0 : 0;
                acc[fileChildSyncCfg.syncAction].sizeRight += fileChildSyncCfg.syncAction !== SYNC_ACTION_COPYLEFT ? fileChildSyncCfg[RIGHT].size ?? 0 : 0;
                acc[fileChildSyncCfg.syncAction].filesCount += 1;
            } else {

                acc[dirChild.syncCfg.syncAction].dirsCount += 1;

                const dirChildDiffStats = dirChild.diffStats;

                SYNC_ACTION_TUPLE.forEach(syncAction => {
                    acc[syncAction].sizeLeft += dirChildDiffStats[syncAction].sizeLeft;
                    acc[syncAction].sizeRight += dirChildDiffStats[syncAction].sizeRight;
                    acc[syncAction].filesCount += dirChildDiffStats[syncAction].filesCount;
                    acc[syncAction].dirsCount += dirChildDiffStats[syncAction].dirsCount;
                });

            }
            return acc;
        }, this.#generateInitDiffStats(true));

        this.#diffStats = newDiffStats;

        this.#validateDiffStats();
    }

    #generateInitDiffStats<T extends boolean, R = T extends true ? DiffStats : DiffStatsAcc>(valuesAreNumbers: T): R {
        if (valuesAreNumbers) {
            return SYNC_ACTION_TUPLE.reduce<DiffStats>((acc, syncAction) => {
                acc[syncAction] = {
                    sizeLeft: 0,
                    sizeRight: 0,
                    dirsCount: 0,
                    filesCount: 0,
                };
                return acc;
            }, {} as DiffStats) as R;
        }

        return SYNC_ACTION_TUPLE.reduce<DiffStatsAcc>((acc, syncAction) => {
            acc[syncAction] = {
                sizeLeft: [],
                sizeRight: [],
                dirsCount: [],
                filesCount: [],
            };
            return acc;
        }, {} as DiffStatsAcc) as R;
    }

    #validateDiffStats() {

        if (!this.diffStatsTotals) {
            console.error(`Found diffstats as null when validating diffStats for dir ${this.entityName}`);
            return;
        }

        const totalsFromDiff = this.diffStatsTotals;

        const getValueFromScanStatsLeft = (valueName: keyof ScanDirChildrenStats) => this.syncCfg.syncAction !== SYNC_ACTION_DELETERIGHT ? this.syncCfg[LEFT].scanDirChildrenStats[valueName] : 0;
        const getValueFromScanStatsRight = (valueName: keyof ScanDirChildrenStats) => this.syncCfg.syncAction !== SYNC_ACTION_COPYLEFT ? this.syncCfg[RIGHT].scanDirChildrenStats[valueName] : 0;

        const isSizeLeftBalanced = (totalsFromDiff.copy.size + totalsFromDiff.equal.size) === getValueFromScanStatsLeft('size');
        const isSizeRightBalanced = (totalsFromDiff.delete.size + totalsFromDiff.equal.size) === getValueFromScanStatsRight('size');
        const isDirsCountLeftBalanced = (totalsFromDiff.copy.dirsCount + totalsFromDiff.equal.dirsCount) === getValueFromScanStatsLeft('dirsCount');
        const isDirsCountRightBalanced = (totalsFromDiff.delete.dirsCount + totalsFromDiff.equal.dirsCount) === getValueFromScanStatsRight('dirsCount');
        const isFilesCountLeftBalanced = (totalsFromDiff.copy.filesCount + totalsFromDiff.equal.filesCount) === getValueFromScanStatsLeft('filesCount');
        const isFilesCountRightBalanced = (totalsFromDiff.delete.filesCount + totalsFromDiff.equal.filesCount) === getValueFromScanStatsRight('filesCount');

        if (!(isSizeLeftBalanced && isSizeRightBalanced && isDirsCountLeftBalanced && isDirsCountRightBalanced && isFilesCountLeftBalanced && isFilesCountRightBalanced)) {
            console.error(`Failed to balance scan and diff stats ${this.entityName}`, { isSizeLeftBalanced, isSizeRightBalanced, isDirsCountLeftBalanced, isDirsCountRightBalanced, isFilesCountLeftBalanced, isFilesCountRightBalanced });
            return;
        }
    }

    executeTransaction(): TransactionGenerator {

        switch (this.syncCfg.syncAction) {
            case SYNC_ACTION_COPYLEFT: return this.#executeCopyLeft();
            case SYNC_ACTION_DELETERIGHT: return this.#executeDeleteRight();
            default: return (function* () { // init for root transaction
                yield () => Promise.resolve(undefined);
                return {
                    timestamp: Date.now(),
                };
            }());
        };
    }

    *#executeCopyLeft(): TransactionGenerator {
        try {
            if (!this.rightParentDirHandle) {
                yield () => Promise.reject('rightParentDirHandle is absent');
            }

            // if rightParentDirHandle is null - yield is invoked
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const newRightDirHandle = (yield () => this.rightParentDirHandle!.getDirectoryHandle(this.entityName, { create: true })) as FileSystemDirectoryHandle;

            if (this.#children && this.#children.size) {
                this.#children.values().forEach(childTransaction => childTransaction.rightParentDirHandle = newRightDirHandle);
            }
            return {
                timestamp: Date.now(),
            };
        } catch (e) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: `${e}`,
                cleanUpMsg: 'Cleanup is not requried',
            };
        }
    }

    *#executeDeleteRight(): TransactionGenerator {

        if (this.syncCfg.syncAction !== SYNC_ACTION_DELETERIGHT) {
            return {
                timestamp: Date.now(),
                transactionErrorMsg: 'Mismatch between syncAction and method',
            };
        }
        const entityHandle = this.syncCfg[RIGHT].entityHandle;
        const selfName = this.entityName;
        const msg = `Triggered on children of recursively deleted directory '${selfName}'`;
        try {
            if (!this.rightParentDirHandle) {
                yield () => Promise.reject('rightParentDirHandle is absent');
            }

            this.setSyncStatusForChildrenRecursively(ACTION_STATUS_WIP, [msg]);

            // if rightParentDirHandle is null - yield is invoked
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            yield () => this.rightParentDirHandle!.getDirectoryHandle(entityHandle.name); // required precheck, because remove does not throw on absent dir

            // if rightParentDirHandle is null - yield is invoked
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            yield () => this.rightParentDirHandle!.removeEntry(this.entityName, { recursive: true });

            this.setSyncStatusForChildrenRecursively(ACTION_STATUS_SUCC, [msg]);

            return {
                timestamp: Date.now(),
            };

        } catch (e) {
            this.setSyncStatusForChildrenRecursively(ACTION_STATUS_ERROR, [msg], Date.now(), {
                transactionErrorMsg: `${msg}, but failed due to ${e}`,
                cleanUpMsg: 'Cleanup is not required',
            });

            return {
                timestamp: Date.now(),
                transactionErrorMsg: `${e}`,
                cleanUpMsg: 'Cleanup is not required',
            };
        }
    }

}

export type SyncTransaction = SyncTransactionFile | SyncTransactionDir;
