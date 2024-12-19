import { SYNC_ACTION_COPYLEFT, SYNC_ACTION_DELETERIGHT, SYNC_ACTION_EQUAL, SYNC_ACTION_OVERWRITE, SyncAction, SyncActionDir } from "../types/servicesTypes";

export type FileTuple = ['f', string, number, number] | ['f', string, number, number, string];
export type DirWithFiles = ['d', string, (FileTuple | DirWithFiles)[]];
export type FileSyncTr = ['f', string, SyncAction];
export type DirSyncTr = ['d', string, SyncActionDir, (FileSyncTr | DirSyncTr)[]];

export type DirStructure<T> = T[];
// export type 
export interface Scenario {
    description: string;
    isCaseSensitive: boolean;
    left: DirStructure<FileTuple | DirWithFiles>;
    right: DirStructure<FileTuple | DirWithFiles>;
    expected: DirStructure<FileSyncTr | DirSyncTr>;
};

const scenarios: Record<string, Scenario> = {
    eq_00: {
        description: 'epmpty dirs on the left and right',
        isCaseSensitive: false,
        left: [],
        right: [],
        expected: [],
    },
    eq_01: {
        description: 'all should be equal on left and right side',
        isCaseSensitive: false,
        left: [
            ['f', 'a', 10, -1],
            ['f', 'b', 10, -1],
            ['f', 'C', 10, -1],
            ['d', 'dir1', [
                ['f', 'a', 100, -1],
                ['d', 'dir11', [
                    ['f', 'a', 100, -1]
                ]],
                ['f', 'c', 100, -1],
            ],
            ],
        ],
        right: [
            ['f', 'A', 10, 1],
            ['f', 'b', 10, 1],
            ['f', 'c', 10, 1],
            ['d', 'DIR1', [
                ['f', 'a', 100, 1],
                ['d', 'dir11', [
                    ['f', 'a', 100, 1]
                ]],
                ['f', 'c', 100, 1],
            ]],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_EQUAL],
            ['f', 'b', SYNC_ACTION_EQUAL],
            ['f', 'C', SYNC_ACTION_EQUAL],
            ['d', 'dir1', SYNC_ACTION_EQUAL, [
                ['f', 'a', SYNC_ACTION_EQUAL],
                ['f', 'c', SYNC_ACTION_EQUAL],
                ['d', 'dir11', SYNC_ACTION_EQUAL, [
                    ['f', 'a', SYNC_ACTION_EQUAL]
                ]],
            ]],
        ],
    },
    eq_02: {
        description: 'all should be equal on left and right side',
        isCaseSensitive: true,
        left: [
            ['f', 'a', 10, -1],
            ['f', 'A', 10, -1],
            ['f', 'c', 10, -1],
            ['d', 'dir1', [
                ['f', 'C', 100, -1],
                ['d', 'dir11', [
                    ['f', 'a', 100, -1]
                ]],
                ['f', 'c', 100, -1],
            ]],
        ],
        right: [
            ['f', 'a', 10, 1],
            ['f', 'A', 10, 1],
            ['f', 'c', 10, 1],
            ['d', 'dir1', [
                ['f', 'C', 100, 1],
                ['d', 'dir11', [
                    ['f', 'a', 100, 1]
                ]],
                ['f', 'c', 100, 1],
            ]],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_EQUAL],
            ['f', 'A', SYNC_ACTION_EQUAL],
            ['f', 'c', SYNC_ACTION_EQUAL],
            ['d', 'dir1', SYNC_ACTION_EQUAL, [
                ['f', 'C', SYNC_ACTION_EQUAL],
                ['f', 'c', SYNC_ACTION_EQUAL],
                ['d', 'dir11', SYNC_ACTION_EQUAL, [
                    ['f', 'a', SYNC_ACTION_EQUAL]
                ]],
            ]],
        ],
    },
    cl_01: {
        description: 'should all be copied from left to right, except for DIR2',
        isCaseSensitive: false,
        left: [
            ['f', 'a', 10, -1],
            ['f', 'b', 10, -1],
            ['d', 'dir1', [
                ['f', 'a', 100, -1],
                ['f', 'C', 100, -1],
                ['d', 'dir11', [
                    ['f', 'a', 100, -1,],
                    ['d', 'emptyDir111', []],
                ]],
                ['d', 'emptyDir11', []],
            ]],
            ['d', 'emptyDir1', []],
            ['d', 'dir2', [
                ['f', 'x', 100, -1]
            ]],
        ],
        right: [
            ['d', 'DIR2empty', []],
            ['d', 'dir2', []],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_COPYLEFT],
            ['f', 'b', SYNC_ACTION_COPYLEFT],
            ['d', 'dir1', SYNC_ACTION_COPYLEFT, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
                ['f', 'C', SYNC_ACTION_COPYLEFT],
                ['d', 'dir11', SYNC_ACTION_COPYLEFT, [
                    ['f', 'a', SYNC_ACTION_COPYLEFT],
                    ['d', 'emptyDir111', SYNC_ACTION_COPYLEFT, []],
                ]],
                ['d', 'emptyDir11', SYNC_ACTION_COPYLEFT, []],
            ]],
            ['d', 'emptyDir1', SYNC_ACTION_COPYLEFT, []],
            ['d', 'dir2', SYNC_ACTION_EQUAL, [
                ['f', 'x', SYNC_ACTION_COPYLEFT]
            ]],
            ['d', 'DIR2empty', SYNC_ACTION_DELETERIGHT, []],
        ],
    },
    ow_01: {
        description: 'files should be overwritten',
        isCaseSensitive: false,
        left: [
            ['f', 'date', 100, 1, 'a'],
            ['f', 'size', 10, 1, 'a'],
            ['d', 'dir1', [
                ['f', 'Sizedate', 10, 1, 'a'],
                ['d', 'dir11', [
                    ['f', 'siZe', 100, 1, 'a'],
                    ['d', 'Dir111', [
                        ['f', 'date', 100, 1, 'a'],
                    ]],
                ]],
            ]],
        ],
        right: [
            ['f', 'Date', 100, -1, 'b'],
            ['f', 'Size', 10, -1, 'b'],
            ['d', 'Dir1', [
                ['f', 'sizedate', 100, -1, 'b'],
                ['d', 'dir11', [
                    ['f', 'size', 10, 1, 'b'],
                    ['d', 'Dir111', [
                        ['f', 'DATE', 100, -1, 'b'],
                    ]],
                ]],
            ]],
        ],
        expected: [
            ['f', 'date', SYNC_ACTION_OVERWRITE],
            ['f', 'size', SYNC_ACTION_OVERWRITE],
            ['d', 'dir1', SYNC_ACTION_EQUAL, [
                ['f', 'Sizedate', SYNC_ACTION_OVERWRITE],
                ['d', 'dir11', SYNC_ACTION_EQUAL, [
                    ['f', 'siZe', SYNC_ACTION_OVERWRITE],
                    ['d', 'Dir111', SYNC_ACTION_EQUAL, [
                        ['f', 'date', SYNC_ACTION_OVERWRITE],
                    ]]
                ]],
            ]],
        ],
    },
    cldr_01: {
        description: 'delete from right file-folder conflict',
        isCaseSensitive: false,
        left: [
            ['f', 'x', 100, 1],
            ['f', 'y', 100, 1],
        ],
        right: [
            ['d', 'x', []],
            ['d', 'Y', [
                ['f', 'a', 100, 1],
            ]],
        ],
        expected: [
            ['f', 'x', SYNC_ACTION_COPYLEFT],
            ['f', 'y', SYNC_ACTION_COPYLEFT],
            ['d', 'x', SYNC_ACTION_DELETERIGHT, []],
            ['d', 'Y', SYNC_ACTION_DELETERIGHT, [
                ['f', 'a', SYNC_ACTION_DELETERIGHT],
            ]],

        ],
    },
    cldr_02: {
        description: 'delete from right behavior',
        isCaseSensitive: false,
        left: [
            ['f', 'x', 100, 1],
            ['f', 'y', 100, 1],
            ['d', 'Z', [
                ['f', 'a', 100, 1],
            ]],
            ['d', 'dir', [
                ['f', 'a', 100, 1],
            ]],
        ],
        right: [
            ['d', 'x', []],
            ['d', 'y', [
                ['f', 'a', 100, 1],
            ]],
            ['f', 'z', 100, 1],
            ['d', 'dir', [
                ['d', 'a', []],
            ]],
        ],
        expected: [
            ['f', 'x', SYNC_ACTION_COPYLEFT],
            ['f', 'y', SYNC_ACTION_COPYLEFT],
            ['d', 'x', SYNC_ACTION_DELETERIGHT, []],
            ['d', 'y', SYNC_ACTION_DELETERIGHT, [
                ['f', 'a', SYNC_ACTION_DELETERIGHT],
            ]],
            ['d', 'Z', SYNC_ACTION_COPYLEFT, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
            ]],
            ['f', 'z', SYNC_ACTION_DELETERIGHT],
            ['d', 'dir', SYNC_ACTION_EQUAL, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
                ['d', 'a', SYNC_ACTION_DELETERIGHT, []],
            ]],
        ],
    },
    cldr_03: {
        description: 'delete from right behavior, file-folder conflict',
        isCaseSensitive: true,
        left: [
            ['f', 'x', 100, 1],
            ['f', 'y', 100, 1],
            ['d', 'X', []],  
            ['f', 'Y', 100, 1],
            ['d', 'Z', [
                ['f', 'a', 100, 1],
                ['d', 'A', []],
            ]],
            ['d', 'dir', [
                ['f', 'a', 100, 1],
                ['d', 'A', []],
            ]],
        ],
        right: [
            ['d', 'x', []],
            ['d', 'y', [
                ['f', 'A', 100, 1],
            ]],
            ['f', 'X', 100, 1],
            ['d', 'Y', []],
            ['f', 'z', 100, 1],
            ['d', 'dir', [
                ['f', 'A', 100, -1],
                ['d', 'a', []],
            ]],
        ],
        expected: [
            ['f', 'x', SYNC_ACTION_COPYLEFT],
            ['f', 'y', SYNC_ACTION_COPYLEFT],
            ['d', 'X', SYNC_ACTION_COPYLEFT, []],
            ['f', 'Y', SYNC_ACTION_COPYLEFT],
            ['d', 'Z', SYNC_ACTION_COPYLEFT, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
                ['d', 'A',SYNC_ACTION_COPYLEFT, []],
            ]],
            ['d', 'dir', SYNC_ACTION_EQUAL, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
                ['f', 'A', SYNC_ACTION_DELETERIGHT],
                ['d', 'A', SYNC_ACTION_COPYLEFT, []],
                ['d', 'a', SYNC_ACTION_DELETERIGHT, []],
            ]],    
            ['d', 'x', SYNC_ACTION_DELETERIGHT, []],
            ['d', 'y', SYNC_ACTION_DELETERIGHT, [
                ['f', 'A', SYNC_ACTION_DELETERIGHT],
            ]],  
            ['f', 'X', SYNC_ACTION_DELETERIGHT],
            ['d', 'Y', SYNC_ACTION_DELETERIGHT, []],
            ['f', 'z', SYNC_ACTION_DELETERIGHT],
        ],
    },
    dr_02: {
        description: 'delete from right behavior',
        isCaseSensitive: false,
        left: [
            ['f', 'x', 100, 1],
            ['f', 'y', 100, 1],
            ['d', 'dir1', [
                ['d', 'dir11', []]

            ]],
        ],
        right: [
            ['d', 'x', []],
            ['d', 'Y', []],
            ['f', 'a', 100, 1],
            ['f', 'b', 100, 1],
            ['d', 'dir1', [
                ['f', 'a', 100, -1],
                ['d', 'dir11', [
                    ['f', 'b', 10, 1],
                    ['d', 'Dir111', [
                        ['f', 'c', 100, -1],
                    ]],
                    ['d', 'Dir112', []],
                ]],
            ]],
            ['d', 'dir2', [
                ['d', 'dir21', []]
            ]],
            ['d', 'dir3', []]
        ],
        expected: [
            ['f', 'x', SYNC_ACTION_COPYLEFT],
            ['f', 'y', SYNC_ACTION_COPYLEFT],
            ['d', 'x', SYNC_ACTION_DELETERIGHT, []],
            ['d', 'Y', SYNC_ACTION_DELETERIGHT, []],
            ['f', 'a', SYNC_ACTION_DELETERIGHT],
            ['f', 'b', SYNC_ACTION_DELETERIGHT],
            ['d', 'dir1', SYNC_ACTION_EQUAL, [
                ['f', 'a', SYNC_ACTION_DELETERIGHT],
                ['d', 'dir11', SYNC_ACTION_EQUAL, [
                    ['f', 'b', SYNC_ACTION_DELETERIGHT],
                    ['d', 'Dir111', SYNC_ACTION_DELETERIGHT, [
                        ['f', 'c', SYNC_ACTION_DELETERIGHT],
                    ]],
                    ['d', 'Dir112', SYNC_ACTION_DELETERIGHT, []],
                ]],
            ]],
            ['d', 'dir2', SYNC_ACTION_DELETERIGHT, [
                ['d', 'dir21', SYNC_ACTION_DELETERIGHT, []]
            ]],
            ['d', 'dir3', SYNC_ACTION_DELETERIGHT, []]
        ],
    },
    cldrow_01: {
        description: 'mix of copyleft, deleteright, overwrite',
        isCaseSensitive: true,
        left: [
            ['f', 'a', 100, 1],
            ['f', 'A', 10, 1],
            ['f', 'b', 10, -1],
            ['d', 'dir1', [
                ['f', 'a', 100, -1],
                ['d', 'dir11', [
                    ['f', 'A', 100, -1],
                    ['d', 'DIR111', [
                        ['f', 'A', 100, -1],
                    ]],
                ]],
                ['d', 'EmptyDir11', []],
            ]],
            ['d', 'EMPTYDIR', []],
        ],
        right: [
            ['f', 'a', 100, 1],
            ['f', 'A', 10, -1],
            ['f', 'B', 10, -1],
            ['d', 'dir1', [
                ['f', 'a', 100, 1],
                ['d', 'dir11', [
                    ['f', 'a', 10, 1],
                    ['d', 'dir111', []],
                ]],
            ]],
            ['d', 'emptyDir', []],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_EQUAL],
            ['f', 'A', SYNC_ACTION_OVERWRITE],
            ['f', 'b', SYNC_ACTION_COPYLEFT],
            ['f', 'B', SYNC_ACTION_DELETERIGHT],
            ['d', 'dir1', SYNC_ACTION_EQUAL, [
                ['f', 'a', SYNC_ACTION_EQUAL],
                ['d', 'dir11', SYNC_ACTION_EQUAL, [
                    ['f', 'A', SYNC_ACTION_COPYLEFT],
                    ['f', 'a', SYNC_ACTION_DELETERIGHT],
                    ['d', 'DIR111', SYNC_ACTION_COPYLEFT, [
                        ['f', 'A', SYNC_ACTION_COPYLEFT],
                    ]],
                    ['d', 'dir111', SYNC_ACTION_DELETERIGHT, []],
                ]],
                ['d', 'EmptyDir11', SYNC_ACTION_COPYLEFT, []],
            ]],
            ['d', 'EMPTYDIR', SYNC_ACTION_COPYLEFT, []],
            ['d', 'emptyDir', SYNC_ACTION_DELETERIGHT, []],
        ],
    },
    man_01: {
        description: 'sizable files',
        isCaseSensitive: false,
        left: [
            ['f', 'a', 1e6, -1],
            ['f', 'b', 1e6, -1],
            ['f', 'C', 1e6, -1],
        ],
        right: [
            ['f', 'A', 10, -1],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_OVERWRITE],
            ['f', 'b', SYNC_ACTION_COPYLEFT],
            ['f', 'C', SYNC_ACTION_COPYLEFT],
        ],
    },
    man_02: {
        description: 'sizable files on left',
        isCaseSensitive: true,
        left: [
            ['f', 'a', 1e6, -1],
            ['f', 'A', 1e6, -1],
            ['f', 'c', 1e6, -1],
        ],
        right: [
            ['f', 'A', 10, -1],
            ['d', 'a', []],
        ],
        expected: [
            ['f', 'a', SYNC_ACTION_COPYLEFT],
            ['f', 'A', SYNC_ACTION_OVERWRITE],
            ['f', 'c', SYNC_ACTION_COPYLEFT],
            ['d', 'a', SYNC_ACTION_DELETERIGHT, []],
        ],
    },
    man_03: {
        description: 'sizable files in dirs',
        isCaseSensitive: false,
        left: [
            ['d', 'dir1', [
                ['f', 'a', 1e6, -1],
                ['f', 'b', 1e6, -1],
                ['f', 'c', 1e6, -1],
                ['f', 'd', 1e6, -1],
            ]],
            ['d', 'dir2', [
                ['f', 'm', 1e6, 1],
                ['f', 'n', 1e6, 1],
                ['f', 'o', 1e6, 1],
                ['f', 'p', 1e6, 1],
            ]],
        ],
        right: [
            ['f', 'A', 10, -1],
            ['d', 'dir2', [
                ['f', 'm', 10, 1],
                ['f', 'n', 10, 1],
                ['f', 'o', 10, 1],
                ['f', 'p', 10, 1],
            ]],
        ],
        expected: [
            ['d', 'dir1', SYNC_ACTION_COPYLEFT, [
                ['f', 'a', SYNC_ACTION_COPYLEFT],
                ['f', 'b', SYNC_ACTION_COPYLEFT],
                ['f', 'c', SYNC_ACTION_COPYLEFT],
                ['f', 'd', SYNC_ACTION_COPYLEFT],
            ]],
            ['f', 'A', SYNC_ACTION_DELETERIGHT],
            ['d', 'dir2', SYNC_ACTION_EQUAL, [
                ['f', 'm', SYNC_ACTION_OVERWRITE],
                ['f', 'n', SYNC_ACTION_OVERWRITE],
                ['f', 'o', SYNC_ACTION_OVERWRITE],
                ['f', 'p', SYNC_ACTION_OVERWRITE],
            ]]
        ],
    },
    man_04: {
        description: 'overwrite sizable',
        isCaseSensitive: false,
        left: [
            ['f', 'm', 1e6, 1],
            ['f', 'n', 1e6, 1],
            ['f', 'o', 1e6, 1],
            ['f', 'p', 1e6, 1],
        ],
        right: [
            ['f', 'm', 10, 1],
            ['f', 'n', 10, 1],
            ['f', 'o', 10, 1],
            ['f', 'p', 10, 1],
        ],
        expected: [
            ['f', 'm', SYNC_ACTION_OVERWRITE],
            ['f', 'n', SYNC_ACTION_OVERWRITE],
            ['f', 'o', SYNC_ACTION_OVERWRITE],
            ['f', 'p', SYNC_ACTION_OVERWRITE],
        ],
    },
};

function checkScenariosCaseSensitivity(scenarios: Record<string, Scenario>) {

    for (const [scenarioName, scenario] of Object.entries(scenarios)) {

        try {

            checkScenarioSide(scenario.left, scenario.isCaseSensitive);
            checkScenarioSide(scenario.right, scenario.isCaseSensitive);
        } catch (e) {

            throw new Error(`error in scenario ${scenarioName}`, { cause: e });
        }
    }

};


function checkScenarioSide(dirStructure: DirStructure<FileTuple | DirWithFiles | FileSyncTr | DirSyncTr>, isCaseSensitive: boolean): true {

    const nameSet: Set<string> = new Set();

    for (const tuple of dirStructure) {

        const nameToCheck = isCaseSensitive ? tuple[1] : tuple[1].toLocaleLowerCase();

        if (!nameSet.has(nameToCheck)) {
            nameSet.add(nameToCheck);
        } else {
            throw new Error(`found duplicate name ${nameToCheck}`);
        }
    }
    return true;
}

checkScenariosCaseSensitivity(scenarios);


export default scenarios;

