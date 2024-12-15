import { SyncSide, isTypeFile, ACTION_STATUS_WIP, ACTION_STATUS_SUCC, ActionStatus } from "../types/servicesTypes";
import {  TableRow, TableCell, TableBody, Skeleton } from "@mui/material";
import {ScanColumn, ScanTableRow, ViewOptions } from "../types/viewTypes";
import ScanDirTableRow from "./ScanDirTableRow";
import { memo } from "react";

const column: ScanColumn = { id: 'entityName', label: 'Dir/file name', minWidth: 200, align: 'left' };

interface ScanDirBlockProps {
    syncSide: SyncSide;
    currScanStatus: ActionStatus;
    tableRows: ScanTableRow[];
    currentPage: number;
    rowsPerPage: number;
    viewOptions: ViewOptions;
    handleCollapseSingleDir: (dirId: string) => void;
    collapsedDirsSet: Set<string>;
};

function ScanDirTableBody({ currScanStatus, tableRows, currentPage, rowsPerPage, viewOptions, handleCollapseSingleDir, collapsedDirsSet }: ScanDirBlockProps) {

    return (
        <TableBody>
            {currScanStatus === ACTION_STATUS_WIP &&
                Array.from({ length: 5 }).map((_: unknown, idx) => <TableRow key={idx}>
                    <TableCell sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                        <Skeleton height="24px" />
                    </TableCell>
                </TableRow>)
            }
            {currScanStatus !== ACTION_STATUS_WIP && !tableRows.length &&
                <TableRow>
                    <TableCell sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                        {currScanStatus === ACTION_STATUS_SUCC ? 'Empty' : 'No data'}
                    </TableCell>
                </TableRow>}
            {Boolean(tableRows.length) && tableRows
                .slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
                .map((row) => <ScanDirTableRow
                    key={row.entityId}
                    scanTableRow={row}
                    column={column}
                    handleCollapseSingleDir={handleCollapseSingleDir}
                    isCollapsed={!isTypeFile(row) && collapsedDirsSet.has(row.entityId)}
                    viewOptions={viewOptions}
                />)}
        </TableBody>
    );
};

export default memo(ScanDirTableBody);