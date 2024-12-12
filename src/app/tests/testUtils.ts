import { DirEntityDir, DirEntityFile } from "../services/DirManager"
import { SyncTransaction } from "../services/SyncTransaction";
import { DirChildrenTree, isTypeFile, TYPE_DIR, TYPE_FILE } from "../types/servicesTypes";
import { DirStructure, DirSyncTr, DirWithFiles, FileSyncTr, FileTuple } from './scenarios';


export function compareTransactions(childrenMapById: Map<string, SyncTransaction> | undefined, name: string, expected: DirStructure<FileSyncTr | DirSyncTr>, isCaseSensitive: boolean): true  {
    if (childrenMapById?.size !== expected.length) {
        throw new Error(`length of children does not match for dir '${name}', expected: ${expected.length}, got ${childrenMapById?.size}`);
    }

    const childrenArr = [...childrenMapById.values()];

    expected.forEach(expectedTr => {
        const actualTr = childrenArr.find(childTr => {
            const expectedEntityType = expectedTr[0] === 'f' ? TYPE_FILE : TYPE_DIR;
            return childTr.entityName === expectedTr[1] && childTr.entityType === expectedEntityType;
            
    });
        if (!actualTr) {
            throw new Error(`while comparing expected to actual in dir '${name}', failed to find type '${expectedTr[0]}' '${expectedTr[1]}' in actual`);
        }
        if (actualTr.syncCfg.syncAction !== expectedTr[2]) {
            throw new Error(`expected '${expectedTr[1]}' syncAction to be '${expectedTr[2]}', while got '${actualTr.syncCfg.syncAction}'`);
        }
        if (expectedTr[0] === 'd' && expectedTr[3].length && !isTypeFile(actualTr)) {

            const childChildrenMapById = actualTr.children;

            compareTransactions(childChildrenMapById, expectedTr[1], expectedTr[3], isCaseSensitive);
        }
    });

    return true;
};

export function makeDirFromScenarioSide(name: string, dirStructure: DirStructure<FileTuple | DirWithFiles>, isCaseSensitive: boolean): DirEntityDir {
    const children: DirChildrenTree = new Map();

    const scanDirChildrenStats = { filesCount: 0, dirsCount: 0, size: 0 };

    dirStructure.forEach(dirStructureItem => {

        if (dirStructureItem[0] === 'f') {
            const fileChild = makeFileEntity(dirStructureItem);
            children.set(fileChild.entityId, fileChild);
            scanDirChildrenStats.filesCount += 1;
            scanDirChildrenStats.size += fileChild.size ?? 0;
        } else {
            const [,dirChildName, dirChildStructure ] = dirStructureItem;
            const dirChild = makeDirFromScenarioSide(dirChildName, dirChildStructure, isCaseSensitive);
            children.set(dirChild.entityId, dirChild);
            scanDirChildrenStats.dirsCount += (dirChild.scanDirChildrenStats.dirsCount + 1);
            scanDirChildrenStats.size += dirChild.scanDirChildrenStats.size;
            scanDirChildrenStats.filesCount += dirChild.scanDirChildrenStats.filesCount;
        }
    });

    return {
        entityId: crypto.randomUUID(),
        entityType: TYPE_DIR,
        entityName: name,
        children,
        entityHandle: {
            kind: TYPE_DIR,
            name,
        } as FileSystemDirectoryHandle,
        scanDirChildrenStats,
    } as DirEntityDir;
}

function makeFileEntity([,name, size, mtimeDiff]: FileTuple): DirEntityFile {

    return {
        entityId: crypto.randomUUID(),
        entityType: TYPE_FILE,
        entityName: name,
        entityHandle: {
            kind: TYPE_FILE,
            name,
        } as FileSystemFileHandle,
        mtime: 3 + mtimeDiff,
        size,
    } as DirEntityFile;
}