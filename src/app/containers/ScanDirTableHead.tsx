import { Box, Button, IconButton, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { oneLineContentSxMixin, getSizeMtimeMixin } from "./SyncDirApp";
import useScanControls from "../hooks/useScanControls";
import { ClearOutlined, ReplayOutlined } from "@mui/icons-material";
import { ACTION_STATUS_ERROR, ACTION_STATUS_INIT, ACTION_STATUS_WIP, ActionStatus, SyncSide } from "../types/servicesTypes";
import { ViewOptions } from "../types/viewTypes";
import { memo } from "react";

interface ScanDirTableHeadProps {
    viewOptions: ViewOptions;
    isCaseSensitive: boolean;
    rootDirName: string;
    syncSide: SyncSide;
    currScanStatus: ActionStatus;
}

function ScanDirTableHead({ syncSide, currScanStatus, viewOptions: {isFileSizeVisible, isFileMtimeVisible}, isCaseSensitive, rootDirName }: ScanDirTableHeadProps) {

    const {
        handleDirPick,
        handleDirClear,
        handleDirRescan,
    } = useScanControls(isCaseSensitive);

    return <TableHead>
        <TableRow>
            <TableCell>
                <Box
                    sx={{
                        display: 'flex',
                    }}
                >
                    <Button
                        variant="text"
                        size="small"
                        disabled={currScanStatus === ACTION_STATUS_WIP}
                        sx={theme => ({
                            ...oneLineContentSxMixin,
                            color: 'unset',
                            textTransform: 'unset',
                            lineHeight: 1.5,
                            justifyContent: 'flex-start',
                            padding: 0,
                            textAlign: 'start',
                        })}
                        onClick={handleDirPick[syncSide]}
                    >
                        <Typography
                            component="span"
                            sx={theme => ({
                                ...oneLineContentSxMixin,
                                justifyContent: 'flex-start',
                                color: currScanStatus < ACTION_STATUS_ERROR ? theme.palette.primary.main : 'currentcolor',
                                paddingInlineStart: theme.spacing(2)
                            })}
                        >
                            {rootDirName}
                        </Typography>

                    </Button>
                    <Tooltip title="clear directory selection">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleDirClear[syncSide]}
                                disabled={currScanStatus === ACTION_STATUS_INIT}
                            >
                                <ClearOutlined />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="rescan directory">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleDirRescan[syncSide]}
                                disabled={currScanStatus === ACTION_STATUS_INIT}
                            >
                                <ReplayOutlined />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {
                        isFileMtimeVisible
                        && <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'mtime', 'thead') })}
                        >
                            Time mod.
                        </Typography>
                    }
                    {
                        isFileSizeVisible
                        && <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'size', 'thead') })}
                        >
                            Size
                        </Typography>
                    }
                </Box>
            </TableCell>
        </TableRow>
    </TableHead>
}

export default memo(ScanDirTableHead);