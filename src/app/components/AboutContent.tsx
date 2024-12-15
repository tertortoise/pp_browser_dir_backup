import { Box } from "@mui/material";

export default function AboutContent() {
    return <Box
        sx={theme => ({
            '& h3': {
                marginBlock: theme.spacing(2),
            }
        })}
    >
        <p>This info can be accessed by clicking on &#x2699; / About.</p>
        <p>Primary purpose of this demo project is demonstrating how browser can access native file system. It should be noted that only <strong>chromium-based desktop</strong> browsers support required functionality as of the moment. This support is limited as compared to what can be done by traditional backend languages (Java, Nodejs etc).</p>
        <p>However it is enough to make a simple backup utility: contents of the left directory is compared to the right directory and the right directory is synchronized with the left. Coupled with **web streams** it is powerful enough to make a backup of even a sizeable directory with **thousands of files and Gbs in size** to transfer.</p>
        <h3>Limitations</h3>
        <p>One should bear in mind some limitations that this demo backup utility has.</p>
        <ul>
            <li>Browser does not allow to understand if file/directory is a symlink, hardlink, junction. So unfortunately it is prone to breaking on cyclic references (e.g. when a symlink points to a parent directory).</li>
            <li>When copiyng file, copied file is essentially as freshly new file which does not inherit time attributes and permissions</li>
        </ul>
    </Box>
}