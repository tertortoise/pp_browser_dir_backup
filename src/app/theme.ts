import { createTheme, Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        TableCell: {
            border: string;
        };
    }

    interface PaletteOptions {
        TableCell: {
            border: string;
        };
    }
}

const theme: Theme = createTheme({
    cssVariables: true,
    typography: {
        fontFamily: 'var(--font-roboto)',
    },
    spacing: '2px',
    palette: {
        primary: {
            main: '#0052cc',
        },
        secondary: {
            main: '#edf2ff',
        },
        TableCell: {
            border: 'hsla(0, 0%, 80%, 1)'
        }
    },
    components: {
        MuiTablePagination: {
            styleOverrides: {
                actions: {
                   marginInlineStart: 2,
                   '& button': {
                        paddingInline: 0,
                        
                   },
                },
            },
        },
    },
});

export default theme;