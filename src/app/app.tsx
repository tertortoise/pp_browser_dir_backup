import { ThemeProvider } from '@mui/material/styles';

import SyncDirApp from "./containers/SyncDirApp";
import { SyncDirProvider } from "./state/SyncDirContextProvider";
import theme from './theme';
import { CssBaseline } from '@mui/material';


const supportsFsaApi = 'showDirectoryPicker' in window;

export function App() {

  if (!supportsFsaApi) {
    return <div>
      Your browser does not support File System Api required for this util to work
      Chromium based browser (desktop) should have support for this features
    </div>
  }

  return (
    <SyncDirProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SyncDirApp />
      </ThemeProvider>
    </SyncDirProvider>
  );
}

export default App;
