import { SyncSide, SYNC_STEP_SCAN, ACTION_STATUS_SUCC } from "../types/servicesTypes";
import { Box, TableContainer, Table, TablePagination } from "@mui/material";
import { isScanFlowSideStateOk, ScanTableRow, ScnaDirChildrenTreeSnapshot } from "../types/viewTypes";
import usePaging from "../hooks/usePaging";
import { useSyncState } from "../state/SyncDirContextProvider";
import useGetTableRows from "../hooks/useGetTableRows";
import ScanDirTableHead from "./ScanDirTableHead";
import { getSizeHuman } from "./utils";
import  ScanDirTableBody from "../components/ScanDirTableBody";
import { useLayoutEffect } from "react";


interface ScanDirBlockProps {
    syncSide: SyncSide;
    rootDirName: string;
};

export function ScanDirBlock({ rootDirName, syncSide }: ScanDirBlockProps) {

    const { handleChangePage, currentPage, rowsPerPage } = usePaging();

    const syncState = useSyncState();

    const { viewOptions, syncOptions: {isCaseSensitive} } = syncState;

    const syncStateScan = syncState[SYNC_STEP_SCAN][syncSide];

    const currScanStatus = syncStateScan.status;

    const rootDirId = currScanStatus === ACTION_STATUS_SUCC ? syncStateScan.rootDirId : undefined;

    const dirTreeSnapshot = isScanFlowSideStateOk(syncStateScan) ? syncStateScan.rootDirTree : undefined;

    const { handleCollapseSingleDir, collapsedDirsSet, tableRows } = useGetTableRows<ScnaDirChildrenTreeSnapshot, ScanTableRow>(dirTreeSnapshot);

    useLayoutEffect(() => {
        handleChangePage(null, 0);
    }, [rootDirId, handleChangePage]);

    return (
        <Box
            sx={() => ({
                gridRow: 'span 2',
                display: 'grid',
                gridTemplateRows: 'subgrid',
            })}
        >
            <TableContainer>
                <Table>
                    <ScanDirTableHead
                        rootDirName={rootDirName}
                        viewOptions={viewOptions}
                        syncSide={syncSide}
                        isCaseSensitive={isCaseSensitive}
                        currScanStatus={currScanStatus}
                    />
                    <ScanDirTableBody
                        syncSide={syncSide}
                        currScanStatus={currScanStatus}
                        tableRows={tableRows}
                        currentPage={currentPage}
                        rowsPerPage={rowsPerPage}
                        viewOptions={viewOptions}
                        handleCollapseSingleDir={handleCollapseSingleDir}
                        collapsedDirsSet={collapsedDirsSet}
                    />
                </Table>
            </TableContainer>
            <Box
                component="footer"
                sx={{
                    display: 'flex',
                }}
            >
                <Box
                    sx={{
                        flexGrow: 1,
                        paddingInline: 2,
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-evenly',
                    }}
                >
                    {
                        isScanFlowSideStateOk(syncStateScan) ?
                            <>
                                <div>
                                    <span>
                                        {`Total ${getSizeHuman(syncStateScan.rootDirStats.dirsCount + syncStateScan.rootDirStats.filesCount)}, directories: ${getSizeHuman(syncStateScan.rootDirStats.dirsCount)}, files: ${getSizeHuman(syncStateScan.rootDirStats.filesCount)}`}
                                    </span>
                                </div>
                                <div>
                                    <span>Total size {getSizeHuman(syncStateScan.rootDirStats.size)} bytes</span>
                                </div>
                            </> : null
                    }
                </Box>
                <TablePagination
                    component="div"
                    rowsPerPageOptions={[-1]}
                    count={tableRows.length}
                    rowsPerPage={rowsPerPage}
                    page={currentPage}
                    onPageChange={handleChangePage}
                    showFirstButton={true}
                    showLastButton={true}
                />
            </Box>

        </Box>

    );
};
