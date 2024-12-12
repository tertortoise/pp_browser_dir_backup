import { Box } from "@mui/material";

export default function AboutContent() {
    return <Box
        sx={theme => ({
            '& h3': {
                marginBlock: theme.spacing(2),
            }
        })}
    >
        <p>Primary purpose of this demo project is highlight browser&#39;s capabilities with <a href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_API" target="_blank" rel="noreferrer">File System Access API</a>.</p>
        <p>It should be noted that only <strong>chromium-based desktop</strong> browsers support required functionality as of the moment.
            This support for handling native file system is severely limited as compared to what can be done by traditional backend languages (Java, Nodejs etc).</p>
        <p>However it is enough to make a simple backup utility: contents of the left directory is compared to the right directory and the right directory is synchronized with the left. Coupled with web streams it is powerful enough to make a backup of a sizeable directory <strong>Gbs in size</strong> to transfer.
            Web app is an SPA (React, Typescript). You can find code at <a href="https://github.com/tertortoise/backupinbrowser_demo" target="_blank" rel="noreferrer">github repo</a>.</p>
        <p>This info can be accessed by clicking on &#39;&#x2699;/Sync settings&#39;.</p>
        <h3>File handling</h3>
        <p>Webapp does backup in three steps:</p>
        <ul>
            <li>scan  directories selected by user</li>
            <li>diff selected directories and produce a diff report (DIFF button)</li>
            <li>backup from left to right (BACKUP button)</li>
        </ul>
        <p>Primary focus was placed on the third step, i.e. backup of files, so that to understand how browser handles transfer of large files (say, a thousand files worth of 100gb).
            App&#39;s architecture is not optimized for the first two steps.</p>
        <h3>Cancelling</h3>
        <p>Scanning and backup may be cancelled.</p>
        <p>In case of interrupted backup, app will report what items were completed and what items were cancelled/not started.</p>
        <h3>I/O concurrency settings for backup steps</h3>
        <p>To better understand browser&#39;s files handling, there are settings in &#39;&#x2699;/Sync settings&#39; to manage concurrency of file operations at the backup step:</p>
        <ul>
            <li>&#39;Max size of concurrent copy operations&#39;</li>
            <li>&#39;Max count of concurrent transactions&#39;</li>
        </ul>
        <p>Scheduler queues file handling transactions and <strong>maintains number and size of concurrent transactions currently under way</strong> according to these settings. It is a way of throttling i/o operations so that to allow it digest big volumes.
            If max count is &#39;1&#39;, it means that backup will make one transaction after another. Copy transactions are also capped by the &#39;Max size of concurrent copy operations&#39;. So 1 mb limit in case of handling 10-20 mb files will also mean that app will essentially do the backup one file at a time.
            Unlimited values in case of really massive number of transactions are not advisable.</p>
        <h3>Backup algo</h3>
        <p>This is a backup app. It means that left directory is the source of truth, while right is ultimately synced to the left:</p>
        <ul>
            <li>if directory / file on is present in the right directory, but absent in the left, it is deleted</li>
            <li>if directory / file on is present in the left directory, but absent in the right, it is copied from left to right</li>
            <li>if file in the left directory has the same path and name as in the right directory, but different size or right modification time is less that the left one, left file overwrites right one</li>
            <li>left file is assumed to be equal to the right one if they have the same path, name, size and modification time of the left file is not greater than that of the right counterpart. Attention: files are <strong>not compared by content</strong>. Browser is definetely capable of this -  it is just an app&#39;s limitation</li>
            <li>if scan of a directory fails (because of permissions issues, or too long path on windows machine), diff and backup stage are not reachable</li>
            <li>in case of disruptions in transactions (copy was cancelled by user), app does some cleanup and deletes zero sized file created by browser. Use can press on attention icon in transaction row to get more info</li>
        </ul>
        <h3>Case sensitivity setting</h3>
        <p>There is a setting in &#39;&#x2699;/About&#39; called &#39;Case sensitivity&#39;.
            App tries to use default setting (for windows it is <code>false</code> by default, on linux <code>true</code>), but it may be changed manually.
            If platform is case sensitive, there may be two files: &#39;text.txt&#39; and &#39;Text.txt&#39;, but on case insensitive platforms &#39;text.txt&#39; on the left is copied to the right, and &#39;Text.txt&#39; on the right is deleted.</p>
        <h3>Limitations</h3>
        <p>One should bear in mind some limitations that this demo backup app has.</p>
        <ul>
            <li>As of now this works on chromium-based desktop browsers as it relies on File System Access api.</li>
            <li>Browser&#39;s file api is not link aware, i.e. it does not allow to understand if file/directory is a symlink, hardlink, junction. So unfortunately this demo is prone to breaking on cyclic references (e.g. when there is a symlink pointing to a parent directory).</li>
            <li>When copiyng file, copied file is essentially a freshly new file which does not <strong>inherit time attributes and permissions</strong>.</li>
            <li>Browser does not provide access to creation time, permissions, which makes it difficult/prohibitive to make more sophisticated sync handling.</li>
            <li>Copying/overwriting files is <strong>inherently slow</strong>, as browser does security checks. So it is hardly a competitor to a similiar native apps.</li>
            <li>When diffing files, this app does not compare file contents. <strong>Equality of the files is assumed</strong> based on name, size and modification time.</li>
            <li>App is not optimized for the first two steps (scan and diff), reading directory recursively and building diff table in one go. That means that diffing two directories with really massive file count may overflow browser. Browser allows optimization for such tasks, but that was not the primary purpose of this app.</li>
            <li>Web workers were not used, as file handling deals mostly with i/o operations and browser itslef utilizes cores as it sees fit.</li>
        </ul>


    </Box>
}