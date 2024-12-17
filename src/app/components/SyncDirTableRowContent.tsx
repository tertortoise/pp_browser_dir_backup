import { TableCell, Box, Typography, LinearProgress, linearProgressClasses } from "@mui/material";

import { oneLineContentSxMixin, getSizeMtimeMixin, TBODY_CONTENT_FS } from '../containers/SyncDirApp';
import { STROKE_COLORS, getHslaString, getMtimeHuman, getSizeHuman } from "../containers/utils";
import { ACTION_NOT_REQUIRED, ACTION_STATUS_INIT, ACTION_STATUS_SUCC, ACTION_STATUS_WIP, ActionStatus, isTypeFile, LEFT, RIGHT, SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_EQUAL, SYNC_ACTION_OVERWRITE, SyncSide } from "../types/servicesTypes";
import { SyncTableRow,  ScanTableRowDir, ScanTableRowFile } from "../types/viewTypes";
import { IndentSpacer } from "./IndentSpacer";

interface SyncDirTableRowContentProps {
    syncSide: SyncSide;
    syncRow: SyncTableRow;
    syncStatus?: ActionStatus;
    syncStatusTimestamp?: number | null;
    childrenSyncAggrStatus?: ActionStatus;
    isFileSizeVisible: boolean;
    isFileMtimeVisible: boolean;
};

export default function SyncDirTableRowContent({ syncRow, syncSide, syncStatus, childrenSyncAggrStatus, syncStatusTimestamp, isFileSizeVisible, isFileMtimeVisible }: SyncDirTableRowContentProps) {

    const isFile = isTypeFile(syncRow);

    let entity: (Omit<ScanTableRowFile, 'parentIds'> | Omit<ScanTableRowDir, 'parentIds'>) | undefined = undefined;
    let cellContentName = '';
    let cellContentFileSize: number | null = null;
    let cellContentFileMtime: number | null = null;
    let contentBackgroundColor = 'initial';
    let contentTextColor = 'currentColor';
    let contentTextDecoration: 'none' | 'line-through' = 'none';
    let contentTextFontWeight: 'normal' | 'bold' = 'normal';

    const syncCfg = syncRow.syncCfg;
    const syncAction = syncCfg.syncAction;
    const dirChildrenBarStatus = !isFile && !syncRow.isEmpty && childrenSyncAggrStatus !== ACTION_NOT_REQUIRED ? childrenSyncAggrStatus : undefined;

    if (syncAction === SYNC_ACTION_EQUAL) {

        entity = syncCfg[syncSide];
        cellContentName = entity.entityName;
        cellContentFileMtime = isFile && isTypeFile(entity) ? entity.mtime : null;
        cellContentFileSize = isFile && isTypeFile(entity) ? entity.size : null;

    } else if (syncSide === LEFT) {

        if (syncAction !== SYNC_ACTION_DELETERIGHT) {
            cellContentName = syncCfg[syncSide].entityName;
            contentTextColor = syncStatus === ACTION_STATUS_SUCC ? getHslaString(STROKE_COLORS.copy) : getHslaString(STROKE_COLORS[ACTION_STATUS_INIT]);
            entity = syncCfg[syncSide];
            cellContentFileMtime = isFile && isTypeFile(entity) ? entity.mtime : null;
            cellContentFileSize = isFile && isTypeFile(entity) ? entity.size : null;
        } else {
            contentBackgroundColor = getHslaString(STROKE_COLORS.noContentLeft);
        }
    } else {
        /* 
        COPYLEFT and notSuccess - no content, reddish background
        COPYLEFT and success - green bold, name from left, size from left and external timestamp
        OW/DR and notSuccess - content red; name from right, size, mtime from rigth
        OW and success -  green bold, size from left and external timestamp; name from right
        DR and success - content red stricken; name from right, size and timestamp from right
        */

        const isStatusSuccess = syncStatus === ACTION_STATUS_SUCC;
        const isNotCopyLeft = syncAction !== SYNC_ACTION_COPYLEFT;
        const isDeleteRight = syncAction === SYNC_ACTION_DELETERIGHT;

        contentBackgroundColor = !isStatusSuccess && !isNotCopyLeft ? getHslaString(STROKE_COLORS.noContentRight) : 'initial';
        contentTextColor = isStatusSuccess ? getHslaString(STROKE_COLORS.copy) : getHslaString(STROKE_COLORS.delete);
        contentTextFontWeight = isStatusSuccess && !isDeleteRight ? 'bold' : 'normal';
        contentTextDecoration = isStatusSuccess && isDeleteRight ? 'line-through' : 'none';
        cellContentName = !isNotCopyLeft ? isStatusSuccess ? syncCfg[LEFT].entityName : '' : syncCfg[RIGHT].entityName;

        if (
            ((!isStatusSuccess && isNotCopyLeft) || (isStatusSuccess && isDeleteRight))
            && isFile
            && isTypeFile(syncCfg[RIGHT])
        ) {
            cellContentFileMtime = syncCfg[RIGHT].mtime;
            cellContentFileSize = syncCfg[RIGHT].size;
        } else if (
            ((isStatusSuccess && !isNotCopyLeft) || (isStatusSuccess && syncAction === SYNC_ACTION_OVERWRITE))
            && isFile
            && isTypeFile(syncCfg[LEFT])
        ) {
            cellContentFileMtime = syncStatusTimestamp ?? null;
            cellContentFileSize = syncCfg[LEFT].size;
        }
    }


    return <TableCell align='left'>
        <Box sx={{ display: 'flex' }}>
            {Boolean(syncRow.parentIds.size) && <IndentSpacer indentsCount={syncRow.parentIds.size} />}
            <Box
                sx={{
                    display: 'flex',
                    flexGrow: 1,
                    minWidth: 0,
                    flexDirection: 'column',
                }}
            >
                <Box
                    sx={{
                        color: contentTextColor,
                        textDecoration: contentTextDecoration,
                        fontWeight: contentTextFontWeight,
                        height: '1.5rem',
                        backgroundColor: contentBackgroundColor,
                        display: 'flex',
                        alignItems: 'baseline'
                    }}
                >
                    <Typography
                        component="span"
                        sx={{
                            ...oneLineContentSxMixin,
                            fontSize: `${TBODY_CONTENT_FS}rem`,
                            fontWeight: contentTextFontWeight
                        }}
                    >{cellContentName}</Typography>

                    {
                        isFile &&
                        isFileMtimeVisible &&
                        <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'mtime', 'tbody') })}
                        >
                            {getMtimeHuman(cellContentFileMtime)}
                        </Typography>
                    }
                    {
                        isFile &&
                        isFileSizeVisible &&
                        <Typography
                            component="span"
                            sx={theme => ({ ...getSizeMtimeMixin(theme, 'size', 'tbody') })}
                        >
                            {getSizeHuman(cellContentFileSize)}
                        </Typography>
                    }
                </Box>
                {
                    dirChildrenBarStatus &&
                    dirChildrenBarStatus === ACTION_STATUS_WIP &&
                    <LinearProgress
                        sx={(theme) => {
                            return {
                                height: theme.spacing(1),
                                [`&.${linearProgressClasses.colorPrimary}`]: {
                                    backgroundColor: getHslaString(STROKE_COLORS[dirChildrenBarStatus]),
                                },
                                [`& .${linearProgressClasses.bar}`]: {
                                    backgroundColor: getHslaString(STROKE_COLORS.progressBarRunner1),
                                    borderRadius: theme.spacing(1)
                                },
                            };
                        }}
                    />
                }
                {
                    dirChildrenBarStatus &&
                    dirChildrenBarStatus !== ACTION_STATUS_WIP &&
                    <Box
                            sx={theme => ({ height: theme.spacing(1), backgroundColor: getHslaString(STROKE_COLORS[dirChildrenBarStatus]), borderRadius: theme.spacing(1) })}
                        />
                }
            </Box>
        </Box>
    </TableCell>;

};