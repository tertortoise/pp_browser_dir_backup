import Box from "@mui/material/Box";

export function IndentSpacer({ indentsCount }: { indentsCount: number }) {

    return (<Box
        sx={{ display: 'flex'}}
    >
        {Array.from({ length: indentsCount }, (_, idx) => {
            return <Box
                key={idx}
                sx={theme => ({
                    width: 12,
                    borderInlineStart: `dotted 1px ${theme.palette.TableCell.border}`,
                    '&:nth-of-type(4n)': {
                        background: 'hsla(0, 0%, 80%, 0.25)',
                    },
                    '&:nth-of-type(4n + 1)': {
                        background: 'hsla(0, 0%, 70%, 0.25)',
                    },
                    '&:nth-of-type(4n + 2)': {
                        background: 'hsla(0, 0%, 85%, 0.25)',
                    },
                    '&:nth-of-type(4n + 3)': {
                        background: 'hsla(0, 0%, 75%, 0.25)',
                    }
                })}
            />
        })}
    </Box>);
};
