import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { SyncFlowState, SyncTableRow, SyncTreeSnapshot } from '../types/viewTypes';
import { isTypeFile, LEFT, RIGHT, SYNC_STEP_DIFF } from "../types/servicesTypes";
import usePaging from '../hooks/usePaging';
import { Box, TablePagination } from '@mui/material';
import { ACTION_STATUS_SUCC } from '../types/servicesTypes';
import SyncDirTableRow from './SyncDirTableRow';
import { useSyncState } from '../state/SyncDirContextProvider';
import useGetTableRows from '../hooks/useGetTableRows';
import SyncDirTableHead from './SyncDirTableHead';
import { getSizeHuman } from './utils';
import useInfoModal from '../hooks/useInfoModal';

function getDiffStatsLabels(syncStateDiff: SyncFlowState[typeof SYNC_STEP_DIFF]) {
    if (syncStateDiff.status !== ACTION_STATUS_SUCC) {
        return null;
    }
    const diffStatsTotals = syncStateDiff.diffStatsTotals;
    if (!diffStatsTotals) {
        return null;
    }
    const totalFilesCount = diffStatsTotals.copy.filesCount + diffStatsTotals.delete.filesCount + diffStatsTotals.equal.filesCount;
    const totalDirsCount = diffStatsTotals.copy.dirsCount + diffStatsTotals.delete.dirsCount + diffStatsTotals.equal.dirsCount;
    const totalRowsCount = totalFilesCount + totalDirsCount;

    return {
        totalRowsCount: getSizeHuman(totalRowsCount),
        totalDirsCount: getSizeHuman(totalDirsCount),
        totalFilesCount: getSizeHuman(totalFilesCount),
    };
}

export default function SyncDirBlock({ rootDirNames }: { rootDirNames: { [LEFT]: string;[RIGHT]: string } }) {
    const syncState = useSyncState();

    const { viewOptions: { isFileMtimeVisible, isFileSizeVisible } } = syncState;

    const syncStateDiff = syncState[SYNC_STEP_DIFF];

    const isSuccessDiffStatus = syncStateDiff.status === ACTION_STATUS_SUCC;

    const { handleCollapseSingleDir, tableRows, collapsedDirsSet } = useGetTableRows<SyncTreeSnapshot, SyncTableRow>(isSuccessDiffStatus ? syncStateDiff.data : undefined);

    const { handleChangePage, currentPage, rowsPerPage } = usePaging();

    const {modalCmp, setDialogContent} = useInfoModal();

    return (
        <>
            <TableContainer
                sx={{
                    gridColumn: 'span 2',
                }}
            >
                <Table >
                    <SyncDirTableHead rootDirNames={rootDirNames} />
                    <TableBody>
                        {tableRows
                            .slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
                            .map((row) => {
                                return (
                                    <SyncDirTableRow
                                        key={row.entityId}
                                        syncRow={row}
                                        handleCollapseSingleDir={handleCollapseSingleDir}
                                        isSizeVisible={isFileSizeVisible}
                                        isMtimeVisible={isFileMtimeVisible}
                                        isCollapsed={!isTypeFile(row) && collapsedDirsSet.has(row.entityId)}
                                        setDialogContent={setDialogContent}
                                    />
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box
                component="footer"
                sx={{
                    gridColumn: 'span 2',
                    display: 'flex',
                }}
            >
                <Box
                    sx={{
                        flexGrow: 1,
                        paddingInline: 2,
                        fontSize: '0.8rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: '1fr 1fr',
                    }}
                >
                    {
                        syncStateDiff.status === ACTION_STATUS_SUCC ?
                            <>
                                <span>
                                    {`Total compared ${getDiffStatsLabels(syncStateDiff)?.totalRowsCount ?? ''}`}
                                </span>
                                <span>
                                    {`Copy from left to right ${getSizeHuman(syncStateDiff.diffStatsTotals.copy.dirsCount)} directories, ${getSizeHuman(syncStateDiff.diffStatsTotals.copy.filesCount)} files, ${getSizeHuman(syncStateDiff.diffStatsTotals.copy.size)} bytes`}
                                </span>
                                <span>
                                    {`Delete from right ${getSizeHuman(syncStateDiff.diffStatsTotals.delete.dirsCount)} directories, ${getSizeHuman(syncStateDiff.diffStatsTotals.delete.filesCount)} files, ${getSizeHuman(syncStateDiff.diffStatsTotals.delete.size)} bytes`}
                                </span>
                                <span>
                                    {`Potentially equal (by name, by mod.time, by size) ${getSizeHuman(syncStateDiff.diffStatsTotals.equal.dirsCount)} directories, ${getSizeHuman(syncStateDiff.diffStatsTotals.equal.filesCount)} files, ${getSizeHuman(syncStateDiff.diffStatsTotals.equal.size)} bytes`}
                                </span>
                            </> : null
                    }
                </Box>
                <TablePagination
                    component="div"
                    count={tableRows.length}
                    rowsPerPageOptions={[-1]}
                    rowsPerPage={rowsPerPage}
                    page={currentPage}
                    onPageChange={handleChangePage}
                    showFirstButton={true}
                    showLastButton={true}
                />
            </Box>
            {modalCmp}
        </>);
}
