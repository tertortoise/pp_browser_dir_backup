import { Box } from "@mui/material";

export default function AboutContent() {
    return <Box
        sx={theme => ({
            '& h3': {
                marginBlock: theme.spacing(2),
            }
        })}
    >
        <p>This info can be accessed by clicking on &#39;&#x2699;/About&#39;.</p>
        <p>Primary purpose of this demo project is demonstrating how browser can access native file system. It should be noted that only <strong>chromium-based desktop</strong> browsers support required functionality as of the moment. This support is limited as compared to what can be done by traditional backend languages (Java, Nodejs etc).</p>
        <p>However it is enough to make a simple backup utility: contents of the left directory is compared to the right directory and the right directory is synchronized with the left. Coupled with web streams it is powerful enough to make a backup of a directory with <strong>thousands of files and Gbs in size</strong> to transfer.</p>
        <h3>Main functionality</h3>
        <p>This is a backup app. It means that left directory is the source of truth, while right is ultimately synced to the left:</p>
        <ul>
            <li>if directory / file on is present in the right directory, but absent in the left, it is deleted</li>
            <li>if directory / file on is present in the left directory, but absent in the right, it is copied from left to right</li>
            <li>if file in the left directory has the same path and name as in the right directory, but different size or right modification time is less that the left one, left file overwrites right one</li>
            <li>left file is assumed to be equal to the right one if they have the same path, name, size and modification time of the left file is not greater than that of the right counterpart. Attention: files are <strong>not compared by content</strong>. Browser definetely allows it, but it is app&#39;s limitation - after all, it is just a demo project</li>
            <li>if scan of a directory fails (because of permissions issues, or too long path on windows machine), diff and backup stage are not reachable</li>
            <li>in case of disruptions in transactions (copy was cancelled by user), app does some cleanup and deletes zero sized file created by browser. Use can press on attention icon in transaction row to get more info</li>
        </ul>
        <h3>I/O concurrency settings</h3>
        <p>There are settings in &#39;&#x2699;/About&#39; to manage concurrency:</p>
        <ul>
            <li>&#39;Max size of concurrent copy operations&#39;</li>
            <li>&#39;Max count of concurrent transactions&#39;</li>
        </ul>
        <p>App&#39;s scheduler queues file handling transactions and <strong>maintains number and size of concurrent transactions currently under way</strong> according to these settings. It is a way of throttling i/o operations so that to allow it digest big volumes.
            If max count is &#39;1&#39;, it means that backup will make one transaction after another. Copy transactions are also capped by the &#39;Max size of concurrent copy operations&#39;.
            Unlimited values in case of really massive number of transactions may crash browser.</p>
        <h3>Case sensitivity setting</h3>
        <p>There is a setting in &#39;&#x2699;/About&#39; called &#39;Case sensitivity&#39;.
            App tries to use default setting (for windows it is <code>false</code> by default, on linux <code>true</code>), but it may be changed manually.
            If platform is case sensitive, there may be two files: &#39;text.txt&#39; and &#39;Text.txt&#39;, but on case insensitive platforms text.txt on the left is copied to the right, and Text.txt on the right is deleted.</p>
        <h3>Limitations</h3>
        <p>One should bear in mind some limitations that this demo backup app has.</p>
        <ul>
            <li>As of now this works on chromium-based desktop browsers as it relies on File System Access api.</li>
            <li>Browser does not allow to understand if file/directory is a symlink, hardlink, junction. So unfortunately this demo is prone to breaking on cyclic references (e.g. when there is a symlink pointing to a parent directory).</li>
            <li>When copiyng file, copied file is essentially a freshly new file which does not <strong>inherit time attributes and permissions</strong>.</li>
            <li>Browser does not provide access to creation time, permissions, which makes it difficult/prohibitive to make more sophisticated sync analysis.</li>
            <li>Copying/overwriting files is <strong>inherently slow</strong>, as browser does security checks. So it is hardly a competitor to a similiar native app.</li>
            <li>When diffing files, this app does not compare file contents. <strong>Equality of the files is assumed</strong> based on name, size and modification time.</li>
            <li>At the scan and diff states app reads directory recursively and and builds diff table in one go, so is not optimized for scanning and diffing really massive directories in terms of files count (diffing two node_modules directories with say 50,000 of files in each is slow but should be more or less ok, but trying to read something of larger scale may already crash browser)</li>
            <li>At the same time directories with limited number of files, but of considerable size (say 100 gb directory with 1000 vide data) is scanned, diffed and backed up ok.</li>
            <li>Web workers were not used, as it deals mostly with i/o operations and platforms utilize cores as they see fit.</li>
        </ul>

    </Box>
}