import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import { SettingsOutlined, CloseOutlined, CheckOutlined, SouthOutlined, NorthOutlined } from '@mui/icons-material';
import { Checkbox, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, FormHelperText, IconButton, Input, InputAdornment, InputLabel, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import useSyncControls from '../hooks/useSyncControls';
import { ACT_CHANGE_SYNC_SETT, SORT_ASC, SORT_DESC } from '../types/viewTypes';
import { useSyncState, useSyncStateDispatch } from '../state/SyncDirContextProvider';
import { SyncOptions } from '../types/servicesTypes';
import { detectOs, findRecordsAreEqual, getSizeHuman } from './utils';
import { useEffect, useMemo, useState } from 'react';
import AboutContent from '../components/AboutContent';

const dialogTitleSx = { 
    m: 0,
    p: 2,
    display: 'flex',
    alignItems: 'center'
};

const SettingsDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialogContent-root': {
        padding: theme.spacing(4),
        '& .setting-block': {
            marginBlock: theme.spacing(6),
            fontSize: '0.9rem',
        },
        '& .setting-label': {
            fontWeight: 600,
        },
        '& .current-value': {
            fontStyle: 'italic',
        },
        '& .MuiFormControl-root': {
            marginBlockStart: theme.spacing(5),
        },
    },
    '& .MuiDialogActions-root': {
        padding: theme.spacing(1),
    },
}));

const AboutDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        width: '80%',
        maxWidth: '80%',
        margin: theme.spacing(8),
    },
    '& .MuiDialogContent-root': {
        padding: theme.spacing(4),
        '& section': {
            fontSize: '0.9rem',
            marginBlock: theme.spacing(3),
        },
        '& p': {
            marginBlock: theme.spacing(2),
        },
        '& ul': {
            listStyle: 'inside'
        },
    }
}));

export default function SyncOptionsMenu() {

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);
    const [syncSettingsDialog, setSyncSettingsDialog] = useState<SyncOptions | null>(null);
    const [isAboutDialogOpen, setIsAboutDialogOpen] = useState<boolean>(false);

    const syncStateDispatch = useSyncStateDispatch();
    const syncState = useSyncState();

    const { handleViewOptionsChange } = useSyncControls(setMenuAnchorEl);

    const { isFileSizeVisible, isFileMtimeVisible, sortedByName } = syncState.viewOptions;

    const syncSettingsApplied = { ...syncState.syncOptions, bufferCopyMaxSize: syncState.syncOptions.bufferCopyMaxSize / 1e6 };

    const isSortedByNameAsc = sortedByName === SORT_ASC;

    const { 
        handleCaseSensitivityChange,
        handleSizeChange,
        handleSettingsDialogClose,
        handleMenuClose,
        handleOpenOptionsClick,
        handleAboutDialogOpen,
        handleAboutDialogClose,
     } = useMemo(() => {

        const handleOpenOptionsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            setMenuAnchorEl(event.currentTarget);
        };
        const handleMenuClose = () => {
            setMenuAnchorEl(null);
        };


        const handleSettingsDialogClose = () => {
            setSyncSettingsDialog(null);
        };

        const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: Exclude<keyof SyncOptions, 'isCaseSensitive'>) => {
            
            if (!(/^\d*$/.test(e.target.value))) return;

            const newValue = Number(e.target.value);

            setSyncSettingsDialog(prevSettings => {
                if (!prevSettings || prevSettings[field] === newValue) {
                    return prevSettings;
                }

                return {
                    ...prevSettings,
                    [field]: newValue,
                }
            });
        };

        const handleCaseSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {

            setSyncSettingsDialog(prevSettings => {
                if (!prevSettings) return prevSettings;

                return {
                    ...prevSettings,
                    isCaseSensitive: e.target.checked,
                };
            })
        };

        const handleAboutDialogOpen = () => {
            setMenuAnchorEl(null);
            setIsAboutDialogOpen(true);

        };

        const handleAboutDialogClose = () => {
            setIsAboutDialogOpen(false);
            if (!window.localStorage?.getItem('file_utils_about_shown')) {

                window.localStorage.setItem('file_utils_about_shown', '1');
            }
        };


        return { 
            handleCaseSensitivityChange,
            handleSizeChange,
            handleSettingsDialogClose,
            handleMenuClose,
            handleOpenOptionsClick,
            handleAboutDialogOpen,
            handleAboutDialogClose
        };

    }, []);

    const handleSettingsDialogOpenClick = () => {
        handleMenuClose();
        setSyncSettingsDialog(syncSettingsApplied);
    };

    const handleSaveSyncSettings = () => {
        if (syncSettingsDialog) {

            syncStateDispatch({
                type: ACT_CHANGE_SYNC_SETT,
                newSyncSetting: {
                    ...syncSettingsDialog,
                    bufferCopyMaxSize: syncSettingsDialog.bufferCopyMaxSize * 1e6,
                },
            })

        }
        setSyncSettingsDialog(null);
    };

    useEffect(() => {

        if (!window.localStorage?.getItem('file_utils_about_shown')) {
            setIsAboutDialogOpen(true);
        }
    }, []);

    return (
        <>
            <Tooltip title="View options and sync options settings" placement='right'>
                <Button
                    size="small"
                    variant="text"
                    onClick={handleOpenOptionsClick}
                >
                    <SettingsOutlined />
                </Button>
            </Tooltip>

            <Menu
                id="syncOptionsMenu"
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
            >
                <MenuItem
                    onClick={() => handleViewOptionsChange('sortedByName', isSortedByNameAsc ? SORT_DESC : SORT_ASC)}
                >
                    <ListItemIcon>
                        {
                            isSortedByNameAsc ?
                                <NorthOutlined /> :
                                <SouthOutlined />
                        }
                    </ListItemIcon>
                    <ListItemText>
                        Sort order by name
                    </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => handleViewOptionsChange('isFileMtimeVisible', !isFileMtimeVisible)}
                >
                    <ListItemIcon>
                        {
                            isFileMtimeVisible ?
                                <CheckOutlined /> :
                                null
                        }
                    </ListItemIcon>
                    <ListItemText>
                        File time modif. column
                    </ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => handleViewOptionsChange('isFileSizeVisible', !isFileSizeVisible)}
                >
                    <ListItemIcon>
                        {
                            isFileSizeVisible ?
                                <CheckOutlined /> :
                                null
                        }
                    </ListItemIcon>
                    <ListItemText>
                        Size column
                    </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSettingsDialogOpenClick}>
                    <ListItemText inset>
                        Sync settings
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleAboutDialogOpen}>
                    <ListItemText inset>
                        About
                    </ListItemText>
                </MenuItem>

            </Menu>

            <SettingsDialog
                onClose={handleSettingsDialogClose}
                aria-labelledby="settings-dialog-title"
                open={!!syncSettingsDialog}
            >
                <DialogTitle
                    sx={{...dialogTitleSx}}
                    id="settings-dialog-title"
                >
                    <Typography sx={{ flexGrow: 1, fontWeight: 'bold'}}>
                        Backup settings
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleSettingsDialogClose}
                        sx={(theme) => ({
                            color: theme.palette.grey[500],
                        })}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <section className="setting-block">
                        <p className="setting-label">Max size of concurrent copy operations</p>
                        <p className="current-value">Current value is {getSizeHuman(syncSettingsApplied.bufferCopyMaxSize)} Mb</p>
                        <FormControl>
                            <InputLabel htmlFor="copy-size">Max copy size</InputLabel>
                            <Input
                                id="copy-size"
                                required
                                endAdornment={<InputAdornment position="end">Mb</InputAdornment>}
                                value={syncSettingsDialog?.bufferCopyMaxSize ?? 0}
                                onChange={(e) => handleSizeChange(e, 'bufferCopyMaxSize')}
                            />
                            <FormHelperText >If 0 or left empty, no limit is applied</FormHelperText>

                        </FormControl>
                    </section>
                    <section className="setting-block">
                        <p className="setting-label">Max count of concurrent transactions</p>
                        <p className="current-value">Current value is {getSizeHuman(syncSettingsApplied.numberTransactionsMax)}</p>
                        <FormControl>
                            <InputLabel htmlFor="transactions-count">Max number</InputLabel>
                            <Input
                                id="transactions-count"
                                required
                                value={syncSettingsDialog?.numberTransactionsMax ?? 0}
                                onChange={(e) => handleSizeChange(e, 'numberTransactionsMax')}
                            />
                            <FormHelperText >If 0 or empty, no limit is applied</FormHelperText>
                        </FormControl>
                    </section>

                    <section className="setting-block">
                    <p className="setting-label">File system case sensitivity</p>
                        <p className="description">Please, pay attention to this setting! It may have significant impact on backup!</p>
                        <p className="description">If system is NOT case sensitive (e.g. Windows by default is not) if a file `a.txt` exists in a directory, one can not create file named `A.txt`</p>
                        <p className="current-value">Operating system was defined as {detectOs()}</p>
                        <FormControlLabel
                            label="Case sensitive"
                            control={
                                <Checkbox
                                    checked={syncSettingsDialog?.isCaseSensitive ?? false}
                                    onChange={handleCaseSensitivityChange}
                                />}
                        />
                    </section>
                </DialogContent>
                <DialogActions>
                    <Button
                        autoFocus
                        disabled={findRecordsAreEqual(syncSettingsDialog, syncSettingsApplied)}
                        onClick={handleSaveSyncSettings}
                    >
                        Save changes
                    </Button>
                </DialogActions>
            </SettingsDialog>
            
            <AboutDialog
                onClose={handleAboutDialogClose}
                aria-labelledby="settings-dialog-title"
                open={isAboutDialogOpen}
            >
                <DialogTitle
                    sx={{...dialogTitleSx}}
                    id="about-dialog-title"
                >
                    <Typography sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        About backup web app
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleAboutDialogClose}
                        sx={(theme) => ({
                            color: theme.palette.grey[500],
                        })}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <AboutContent />
                </DialogContent>
            </AboutDialog>
        </>
    );
}
