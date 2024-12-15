import { ACTION_STATUS_ERROR } from "../types/servicesTypes";
import { CloseOutlined } from "@mui/icons-material";
import { Dialog, DialogTitle, Typography, IconButton, DialogContent, DialogActions, Button, styled } from "@mui/material";
import { getHslaString, STROKE_COLORS } from "../containers/utils";
import { useMemo, useState } from "react";
import { DialogContentInfo } from "../types/viewTypes";

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialogContent-root': {
        padding: theme.spacing(4),
        minWidth: '400px',
        minHeight: '200px',
        '& .info-block': {
            marginBlock: theme.spacing(3),
            marginInlineStart: theme.spacing(3),
            color: theme.palette.grey[800],
            borderInlineStart: '1px solid currentColor',
            paddingInlineStart: theme.spacing(3),
            fontSize: '0.9rem',
        }
    },
    '& .MuiDialogTitle-root': {
        color: getHslaString(STROKE_COLORS[ACTION_STATUS_ERROR]),
        fontWeight: 'normal',
        fontSize: '1.2rem',
        '& .MuiSvgIcon-root': {
            color: getHslaString(STROKE_COLORS[ACTION_STATUS_ERROR]),
        },
    },

    '& .MuiDialogActions-root': {
        padding: theme.spacing(1),
    },

}));

export default function useInfoModal(confirmBtnCb?: (cnt: DialogContentInfo) => void) {

    const [dialogContent, setDialogContent] = useState<DialogContentInfo | null>(null);

    const modalCmp = useMemo(() => {

        const closeDialogHandler = () => {
            setDialogContent(null);
        };

        const confirmBtnHandler = () => {

            if (dialogContent) {
                confirmBtnCb?.(dialogContent);
            }
            closeDialogHandler();
        };


        return (
            <StyledDialog
                onClose={closeDialogHandler}
                aria-labelledby="settings-dialog-title"
                open={!!dialogContent}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    id="settings-dialog-title"
                >
                    <Typography
                        sx={{
                            flexGrow: 1,
                            fontSize: '1.2rem'
                        }}
                    >
                        {dialogContent?.label}
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={closeDialogHandler}
                        sx={(theme) => ({
                            color: theme.palette.grey[700],
                        })}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {!!dialogContent?.description && <p className="info-description">{dialogContent.description}</p>}
                    {
                        !!dialogContent?.infoBlocks.length &&
                        dialogContent.infoBlocks.map((infoBlock, idx) => {

                            return <div key={idx} className="info-block">
                                {infoBlock.map((infoLine, lineIdx) => <p className="info-line" key={`info-line-${lineIdx}`}>{infoLine}</p>)}
                            </div>
                        })

                    }
                </DialogContent>
                {
                    confirmBtnCb ?
                        <DialogActions>
                            <Button
                                autoFocus
                                color="inherit"
                                onClick={confirmBtnHandler}
                            >
                                Got it
                            </Button>
                        </DialogActions> :
                        null
                }

            </StyledDialog>
        );
    }, [dialogContent, confirmBtnCb]);

    return { modalCmp, setDialogContent };
}