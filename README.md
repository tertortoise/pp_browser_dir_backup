This info can be accessed by clicking on '&#x2699;/About'.

Primary purpose of this demo project is demonstrating how browser can access native file system. It should be noted that only **chromium-based desktop** browsers support required functionality as of the moment. This support is limited as compared to what can be done by traditional backend languages (Java, Nodejs etc).

However it is enough to make a simple backup utility: contents of the left directory is compared to the right directory and the right directory is synchronized with the left. Coupled with web streams it is powerful enough to make a backup of a directory with **thousands of files and Gbs in size** to transfer.

### Main functionality

This is a backup app. It means that left directory is the source of truth, while right is ultimately synced to the left:
- if directory / file on is present in the right directory, but absent in the left, it is deleted
- if directory / file on is present in the left directory, but absent in the right, it is copied from left to right
- if file in the left directory has the same path and name as in the right directory, but different size or right modification time is less that the left one, left file overwrites right one
- left file is assumed to be equal to the right one if they have the same path, name, size and modification time of the left file is not greater than that of the right counterpart. Attention: files are **not compared by content**. Browser definetely allows it, but it is app's limitation - after all, it is just a demo project
- if scan of a directory fails (because of permissions issues, or too long path on windows machine), diff and backup stage are not reachable
- in case of disruptions in transactions (copy was cancelled by user), app does some cleanup and deletes zero sized file created by browser. Use can press on attention icon in transaction row to get more info

### I/O concurrency settings

There are settings in '&#x2699;/About' to manage concurrency:

- 'Max size of concurrent copy operations'
- 'Max count of concurrent transactions'

App's scheduler queues file handling transactions and **maintains number and size of concurrent transactions currently under way** according to these settings. It is a way of throttling i/o operations so that to allow it digest big volumes.
If max count is '1', it means that backup will make one transaction after another. Copy transactions are also capped by the 'Max size of concurrent copy operations'.
Unlimited values in case of really massive number of transactions may crash browser.

### Case sensitivity setting

There is a setting in '&#x2699;/About' called 'Case sensitivity'.
App tries to use default setting (for windows it is `false` by default, on linux `true`), but it may be changed manually.
If platform is case sensitive, there may be two files: 'text.txt' and 'Text.txt', but on case insensitive platforms text.txt on the left is copied to the right, and Text.txt on the right is deleted.

### Limitations

One should bear in mind some limitations that this demo backup app has.
- As of now this works on chromium-based desktop browsers as it relies on File System Access api.
- Browser does not allow to understand if file/directory is a symlink, hardlink, junction. So unfortunately this demo is prone to breaking on cyclic references (e.g. when there is a symlink pointing to a parent directory).
- When copiyng file, copied file is essentially a freshly new file which does not **inherit time attributes and permissions**.
- Browser does not provide access to creation time, permissions, which makes it difficult/prohibitive to make more sophisticated sync analysis.
- Copying/overwriting files is **inherently slow**, as browser does security checks. So it is hardly a competitor to a similiar native app.
- When diffing files, this app does not compare file contents. **Equality of the files is assumed** based on name, size and modification time.
- At the scan and diff states app reads directory recursively and and builds diff table in one go, so is not optimized for scanning and diffing really massive directories in terms of files count (diffing two node_modules directories with say 50,000 of files in each is slow but should be more or less ok, but trying to read something of larger scale may already crash browser)
- At the same time directories with limited number of files, but of considerable size (say 100 gb directory with 1000 vide data) is scanned, diffed and backed up ok.
- Web workers were not used, as it deals mostly with i/o operations and platforms utilize cores as they see fit.









