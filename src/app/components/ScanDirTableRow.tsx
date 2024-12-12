import { memo } from "react";
import { ScanColumn, ScanTableRow, ViewOptions } from "../types/viewTypes";
import { ACTION_STATUS_SUCC, isTypeFile } from "../types/servicesTypes";
import { TableRow, TableCell, Box, IconButton, Typography } from "@mui/material";
import { IndentSpacer } from "./IndentSpacer";
import FolderIcon from "../icons/FolderIcon";
import FolderOpenIcon from "../icons/FolderOpenIcon";
import FolderEmptyIcon from "../icons/FolderEmptyIcon";
import FileIcon from "../icons/FileIcon";
import { getSizeMtimeMixin, oneLineContentSxMixin, TBODY_CONTENT_FS } from "../containers/SyncDirApp";
import { getHslaString, getMtimeHuman, getSizeHuman, STROKE_COLORS } from "../containers/utils";

interface ScanDirTableRowProps {
    scanTableRow: ScanTableRow;
    column: ScanColumn;
    handleCollapseSingleDir: (id: string) => void;
    isCollapsed: boolean;
    viewOptions: ViewOptions;
};

function ScanDirTableRow({ scanTableRow, column, handleCollapseSingleDir, isCollapsed, viewOptions: {isFileSizeVisible, isFileMtimeVisible} }: ScanDirTableRowProps) {

    const isDir = !isTypeFile(scanTableRow);

    return (
        <TableRow hover role="checkbox" tabIndex={-1} key={scanTableRow.entityId}>
            <TableCell
                key={column.id}
                align={column.align}
            >
                <Box
                    sx={{
                        display: 'flex',
                    }}
                >
                    {Boolean(scanTableRow.parentIds.size) && <IndentSpacer indentsCount={scanTableRow.parentIds.size} />}
                    {isDir && !scanTableRow.isEmpty
                        && <IconButton size="small" onClick={() => handleCollapseSingleDir(scanTableRow.entityId)} aria-label="expand">
                            {isCollapsed ? <FolderIcon /> : <FolderOpenIcon />}
                        </IconButton>}
                    {isDir && scanTableRow.isEmpty && <FolderEmptyIcon />}
                    {!isDir && <FileIcon />}
                    <Box
                        sx={{
                            marginInlineStart: 2,
                            flexGrow: 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'baseline',
                            backgroundColor: scanTableRow.scanStatus !== ACTION_STATUS_SUCC ? getHslaString(STROKE_COLORS[scanTableRow.scanStatus]) : 'initial',
                        }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                ...oneLineContentSxMixin,
                                fontSize: `${TBODY_CONTENT_FS}rem`,
                            }}
                        >{scanTableRow.entityName}</Typography>
                        {isTypeFile(scanTableRow) && isFileMtimeVisible && <Typography component="span" sx={theme => ({ ...getSizeMtimeMixin(theme, 'mtime', 'tbody') })}>{getMtimeHuman(scanTableRow.mtime)}</Typography>}
                        {isFileSizeVisible && <Typography component="span" sx={theme => ({ ...getSizeMtimeMixin(theme, 'size', 'tbody') })}>{getSizeHuman(isTypeFile(scanTableRow) ? scanTableRow.size : scanTableRow.scanDirChildrenStats?.size ?? null)}</Typography>}
                    </Box>
                </Box>

            </TableCell>
        </TableRow>
    );
};

export default memo(ScanDirTableRow);