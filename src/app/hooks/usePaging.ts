import { useCallback, useLayoutEffect, useState } from "react";
import { useSyncState, useSyncStateDispatch } from "../state/SyncDirContextProvider";
import { ACT_CHANGE_VIEW_OPTS } from "../types/viewTypes";

export default function usePaging() {

    const [currentPage, setPage] = useState(0);

    const { viewOptions: { rowsPerPage } } = useSyncState();

    const syncStateDispatch = useSyncStateDispatch();

    const handleChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        syncStateDispatch({
            type: ACT_CHANGE_VIEW_OPTS,
            newViewOptions: { rowsPerPage: +event.target.value },
        });
    }, [syncStateDispatch]);

    useLayoutEffect(() => {
        setPage(0);
    }, [rowsPerPage]);

    return { handleChangePage, handleChangeRowsPerPage, currentPage, rowsPerPage };
}