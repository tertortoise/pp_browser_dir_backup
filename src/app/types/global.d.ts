interface Window {
    showDirectoryPicker: ({id, mode}?: {id?: string, mode?: 'read' | 'readwrite'}) => Promise<FileSystemDirectoryHandle>;
}
interface Navigator {
    userAgentData: {
        platform: string;
    };
}



interface FileSystemHandle {
    remove: (options?: {recursive?: boolean}) => Promise<undefined>;
}
interface FileSystemDirectoryHandle {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle], [string, FileSystemHandle]>;
}