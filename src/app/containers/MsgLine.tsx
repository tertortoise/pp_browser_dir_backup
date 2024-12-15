import { Box } from "@mui/material";
import { ACT_DELETE_MSG, MsgChip } from "../types/viewTypes";
import { useSyncState, useSyncStateDispatch } from "../state/SyncDirContextProvider";
import MsgChipCmp from "../components/MsgChipCmp";
import { useCallback } from "react";
import useInfoModal from "../hooks/useInfoModal";
import { DialogContentInfo } from "../types/viewTypes";



export default function MsgLine() {

    const messages = useSyncState().messages;

    const syncStateDispatch = useSyncStateDispatch();

    const deleteMsgChipHandler = useCallback((id: string) => {
        syncStateDispatch({
            type: ACT_DELETE_MSG,
            msgId: id,
        })
    }, [syncStateDispatch]);

    const confirmReadingMsgCb = useCallback(({id }: DialogContentInfo) => {
        deleteMsgChipHandler(id);
    }, [deleteMsgChipHandler]);
    
    const {modalCmp, setDialogContent} =  useInfoModal(confirmReadingMsgCb);

    const openDialogForMsgChip = useCallback((msgChip: MsgChip) => {
        setDialogContent(msgChip);
    }, [setDialogContent]);


    return <>
        <Box>
            {messages.map(message => <MsgChipCmp key={message.id} msg={message} deleteHandler={deleteMsgChipHandler} clickHandler={openDialogForMsgChip} />)}
        </Box>
        {modalCmp}
    </>
}