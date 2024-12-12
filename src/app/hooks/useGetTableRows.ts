import { useSyncState } from "../state/SyncDirContextProvider";
import { DirChildrenSnapshot, DirEntryTableRow } from "../types/viewTypes";
import { getSortedTableRows } from "../containers/utils";
import { useMemo, useState } from "react";

export default function useGetTableRows<
    M extends DirChildrenSnapshot, R extends DirEntryTableRow
>(
    dirTreeSnapshot?: M
): {
    handleCollapseDirs: (dirIdsSet: Set<string>) => void;
    handleCollapseSingleDir: (dirId: string) => void;
    tableRows: R[];
    collapsedDirsSet: Set<string>;
} {

    const syncState = useSyncState();

    const { viewOptions: { sortedByName }, syncOptions: { isCaseSensitive } } = syncState;

    const [collapsedDirsSet, setCollapsedDirsSet] = useState<Set<string>>(new Set());

    const { handleCollapseDirs, handleCollapseSingleDir } = useMemo(() => {

        const handleCollapseDirs = (dirIdsSet: Set<string>) => {

            setCollapsedDirsSet(prevCollapsedDirs => {

                return prevCollapsedDirs.symmetricDifference(dirIdsSet);
            });
        };

        const handleCollapseSingleDir = (dirId: string) => {
            handleCollapseDirs(new Set([dirId]));
        };

        return {handleCollapseDirs, handleCollapseSingleDir};

    }, []);

    let tableRows: R[] = [];

    if (dirTreeSnapshot) {

        const tableRowsUnfiltered = getSortedTableRows<M, R>(dirTreeSnapshot, sortedByName, isCaseSensitive);

        tableRows = collapsedDirsSet.size ? tableRowsUnfiltered.filter(tableRow => !tableRow.parentIds.size || !tableRow.parentIds.intersection(collapsedDirsSet).size) : tableRowsUnfiltered;
    }

    return { handleCollapseDirs, handleCollapseSingleDir, collapsedDirsSet, tableRows };

};