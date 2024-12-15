export type FileTuple = [string, number, number] | [string, number, number, string];
export type DirWithFiles = Record<string, (FileTuple | DirWithFiles)[]>;
export type DirStructure = (FileTuple | DirWithFiles)[];
export interface Scenario {
    description: string;
    isCaseSensitive: boolean;
    left: DirStructure;
    right: DirStructure
};

const scenarios: Record<string, Scenario> = {
    eq_01: {
        description: 'all should be equal on left and right side, BACKUP disabled',
        isCaseSensitive: false,
        left: [
            ['a', 10, -1],
            ['b', 10, -1],
            {
                'dir1': [
                    ['a', 100, -1],
                    {
                        'dir11': [['a', 100, -1]],
                    },
                    ['c', 100, -1],
                ],
            },
        ],
        right: [
            ['a', 10, 1],
            ['b', 10, 1],
            {
                'dir1': [
                    ['a', 100, 1],
                    {
                        'dir11': [['a', 100, 1]],
                    },
                    ['c', 100, 1],
                ],
            },
        ],
    },
    cl_01: {
        description: 'should all be copied from left to right, except for dir2',
        isCaseSensitive: false,
        left: [
            ['a', 10, -1],
            ['b', 10, -1],
            {
                'dir1': [
                    ['a', 100, -1],
                    {
                        'dir11': [
                            ['a', 100, -1,],
                            {
                                'emptyDir111': [],
                            },
                        ],
                    },
                    ['c', 100, -1],
                    {
                        'emptyDir11': [],
                    },
                ],
            },
            {
                'emptyDir1': [],
            },
            {
                'dir2': [
                    ['x', 100, -1]
                ]
            },
        ],
        right: [
            {
                'DIR2': []
            },
        ],
    },
    cl_02: {
        description: 'should all be copied from left to right, except for dir2',
        isCaseSensitive: false,
        left: [
            {
                'dir1': [
                    ['a', 100, -1],
                    {
                        'dir11': [
                            ['a', 100, -1],
                            {
                                'Dir111': [
                                    ['A', 100, -1],
                                ],
                            },
                        ],
                    },
                    ['c', 100, -1],
                    {
                        'emptyDir11': [],
                    },
                ],
            },
        ],
        right: [
            {
                'dir1': [
                    ['a', 100, 1],
                    {
                        'dir11': [
                            ['a', 100, 1],
                            {
                                'Dir111': [],
                            },
                        ],
                    },
                    ['c', 100, -1],
                    {
                        'emptyDir11': [],
                    },
                ],
            },
        ],
    },
    ow_01: {
        description: 'overwrite behavior',
        isCaseSensitive: false,
        left: [
            ['date', 100, 1, 'a'],
            ['size', 10, 1, 'a'],
            {
                'dir1': [
                    ['sizedate', 10, 1, 'a'],
                    {
                        'dir11': [
                            ['size', 100, 1, 'a'],
                            {
                                'Dir111': [
                                    ['date', 100, 1, 'a'],
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
        right: [
            ['date', 100, -1, 'b'],
            ['size', 10, 1, 'b'],
            {
                'dir1': [
                    ['sizedate', 100, -1, 'b'],
                    {
                        'dir11': [
                            ['size', 10, 1, 'b'],
                            {
                                'Dir111': [
                                    ['DATE', 100, -1, 'b'],
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    dr_01: {
        description: 'delete from right behavior',
        isCaseSensitive: false,
        left: [
            {
                'dir1': [
                    {
                        'dir11': [],
                    }
                ]
            }
        ],
        right: [
            ['a', 100, 1],
            ['b', 100, 1],
            {
                'dir1': [
                    ['a', 100, -1, 'b'],
                    {
                        'dir11': [
                            ['b', 10, 1, 'b'],
                            {
                                'Dir111': [
                                    ['c', 100, -1, 'b'],
                                ],
                            },
                            {
                                'Dir112': [],
                            },
                        ],
                    },
                ],
            },
            {
                'dir2': [
                    {
                        'dir21': [],
                    }
                ]
            },
            {
                'dir3': [],
            },
        ],
    },
    settings_01: {
        description: 'sync settings, transactions count and max copy size, zero values, maxSize less than single file',
        isCaseSensitive: false,
        left: [
            ['a', 2e6, -1],
            ['b', 2e6, -1],
            ['c', 2e6, -1],
            ['d', 2e6, -1],
            ['e', 2e6, -1],
            ['f', 2e6, -1],
            ['g', 2e6, -1],
        ],
        right: []
    },
    errors_01: {
        description: 'errors, change file and dirs on left and right after diff',
        isCaseSensitive: false,
        left: [
            ['ow1', 100, 1],
            {
                'owDir1': [
                    ['a', 100, -1],
                ],
            },
            ['cl1', 100, -1],
            {
                'clDir1': [
                    ['a', 100, -1],
                ],
            },
        ],
        right: [
            ['ow1', 10, -1],
            {
                'owDir1': [
                    ['a', 10, 1],
                ],
            },
            ['dr1', 100, 1],
            {
                'clDir1': [],
            },
            {
                'drDir1': []
            },
            {
                'drDir2': [
                    ['dr22', 100, 1]
                ]
            }
        ],
    },
};

export default scenarios;

