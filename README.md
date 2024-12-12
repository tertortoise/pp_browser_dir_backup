This info can be accessed by clicking on &#x2699; / About.

Primary purpose of this demo project is demonstrating how browser can access native file system. It should be noted that only **chromium-based desktop** browsers support required functionality as of the moment. This support is limited as compared to what can be done by traditional backend languages (Java, Nodejs etc).

However it is enough to make a simple backup utility: contents of the left directory is compared to the right directory and the right directory is synchronized with the left. Coupled with web streams it is powerful enough to make a backup of a directory with **thousands of files and Gbs in size** to transfer.
### Limitations
One should bear in mind some limitations that this demo backup utility has.
- Browser does not allow to understand if file/directory is a symlink, hardlink, junction. So unfortunately this demo is prone to breaking on cyclic references (e.g. when there is a symlink pointing to a parent directory).
- When copiyng file, copied file is essentially as freshly new file which does not inherit time attributes and permissions
