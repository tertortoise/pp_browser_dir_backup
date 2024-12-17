import { TableHead, TableRow, TableCell, Box, Typography } from "@mui/material";
import { oneLineContentSxMixin, getSizeMtimeMixin } from "./SyncDirApp";
import { ACTION_NOT_REQUIRED, ACTION_STATUS_ERROR, ACTION_STATUS_INIT, ACTION_STATUS_MIXED, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, LEFT, RIGHT, SYNC_STEP_SYNC, SyncSide } from "../types/servicesTypes";
import { useSyncState } from "../state/SyncDirContextProvider";
import { useMemo } from "react";
import EqualsIcon from "../icons/EqualsIcon";
import ErrorIcon from "../icons/ErrorIcon";
import ProgressCircular from "../icons/ProgressCircular";
import StartIcon from "../icons/StartIcon";
import SuccessIcon from "../icons/SuccessIcon";
import NotEqualIcon from "../icons/NotEqual";
import { getHslaString, STROKE_COLORS } from "./utils";

const sxFlexCenterVert = {
    display: 'flex',
    alignItems: 'center',
};

interface SyncDirTableProps {
    rootDirNames: { [LEFT]: string;[RIGHT]: string };
};

export default function SyncDirTableHead({ rootDirNames }: SyncDirTableProps) {

    const syncState = useSyncState();

    const { viewOptions: { isFileMtimeVisible, isFileSizeVisible } } = syncState;

    const syncStateStatus = syncState[SYNC_STEP_SYNC];

    const { StatusIcon, StateIcon } = useMemo(() => {

        let StatusIcon = EqualsIcon;

        let StateIcon = NotEqualIcon;

        switch (syncStateStatus) {
            case ACTION_NOT_REQUIRED:
                StateIcon = EqualsIcon;
                break;
            case ACTION_STATUS_INIT:
                StatusIcon = StartIcon;
                break;
            case ACTION_STATUS_WIP:
                StatusIcon = ProgressCircular;
                break;
            case ACTION_STATUS_ERROR:
                StatusIcon = ErrorIcon;
                break;
            case ACTION_STATUS_MIXED:
            case ACTION_STATUS_SUCC:
                StatusIcon = SuccessIcon;
                break;
        }

        return { StatusIcon, StateIcon };

    }, [syncStateStatus]);

    const syncStatusColor = syncStateStatus === ACTION_NOT_REQUIRED ? 'currentColor' : getHslaString(STROKE_COLORS[syncStateStatus]);


    const { leftNameHeader, rightNameHeader } = useMemo(() => {

        const renderNameHeader = (syncSide: SyncSide) => {
            return <TableCell align='left'>
                <Box sx={{ display: 'flex' }} >
                    <Typography
                        component="span"
                        sx={{
                            ...oneLineContentSxMixin,
                        }}
                    >
                        {rootDirNames[syncSide]}
                    </Typography>
                    {
                        isFileMtimeVisible &&
                        <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'mtime', 'thead') })}
                        >
                            Time mod.
                        </Typography>
                    }
                    {isFileSizeVisible &&
                        <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'size', 'thead') })}
                        >
                            Size
                        </Typography>
                    }
                </Box>
            </TableCell>
        };

        const leftNameHeader = renderNameHeader(LEFT);
        const rightNameHeader = renderNameHeader(RIGHT);

        return { leftNameHeader, rightNameHeader };

    }, [rootDirNames, isFileMtimeVisible, isFileSizeVisible]);

    return <TableHead>
        <TableRow>
            <TableCell
                sx={() => ({
                    minWidth: '2rem',
                    width: '2rem',
                })}
            ></TableCell>
            {leftNameHeader}
            <TableCell sx={{
                width: '4rem',
                minWidth: '4rem',
            }}>
                <Box
                    sx={theme => ({
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        color: syncStatusColor,
                        borderInline: `solid 1px ${theme.palette.TableCell.border}`,
                    })}
                >
                    <Box sx={sxFlexCenterVert}><StatusIcon /></Box>
                    <Box sx={sxFlexCenterVert}><StateIcon /></Box>
                </Box>

            </TableCell>
            {rightNameHeader}
        </TableRow>
    </TableHead>
};