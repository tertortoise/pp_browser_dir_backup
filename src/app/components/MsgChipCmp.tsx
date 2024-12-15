import { Chip } from "@mui/material";
import { MsgChip } from "../types/viewTypes";


interface MsgChipProps {
    msg: MsgChip;
    clickHandler: (msg: MsgChip) => void;
    deleteHandler: (id: string) => void;
}

export default function MsgChipCmp({ msg, clickHandler, deleteHandler }: MsgChipProps) {

    return (
        <Chip
            size="small"
            variant="outlined"
            color={msg.color}
            label={msg.label}
            onClick={() => clickHandler(msg)}
            onDelete={() => {deleteHandler(msg.id)}}
        />
    );
}