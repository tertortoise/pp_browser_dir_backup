/*
Quick and dirty and unsafe util to make folder/files structure with big size to test file system api
For win and linux
*/
import { WriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import scenarios, { DirStructure, DirWithFiles, FileTuple } from '../src/app/tests/scenarios';

const scenariosSelection = new Set((process.argv[2] ?? '').split(' '));
scenariosSelection.delete('');

const platform = os.platform();
const isWin = platform === 'win32';
const isLinux = platform === 'linux';


const scenariosToCreateOld = scenariosSelection.size ? Object.entries(scenarios).filter(([scenarioName,]) => {
    scenariosSelection.has(scenarioName)
}) : Object.entries(scenarios);

const scenariosToCreate = Object.entries(scenarios).filter(([scenarioName, scenario]) => {
    const isNameIncluded = scenariosSelection.size ? scenariosSelection.has(scenarioName) : true;
    const isRelevantForPlatform = (scenario.isCaseSensitive && isLinux) || (!scenario.isCaseSensitive && isWin);
    return isNameIncluded && isRelevantForPlatform;
});

const rootDirPathLeft = process.argv[3] ?? path.resolve(process.cwd(), './testfiles');
const rootDirPathRight = process.argv[4] ?? path.resolve(process.cwd(), 'E:/test');

createDirSync(rootDirPathLeft);
createDirSync(rootDirPathRight);

for (const scenarioToCreate of scenariosToCreate) {
    try {
        const scenarioRootDirPathLeft = path.resolve(rootDirPathLeft, scenarioToCreate[0]);
        const scenarioRootDirPathRight = path.resolve(rootDirPathRight, scenarioToCreate[0]);

        createDirSync(scenarioRootDirPathLeft);
        createDirSync(scenarioRootDirPathRight);

        const leftDirPromise = createDirStructure(scenarioRootDirPathLeft, scenarioToCreate[1].left, scenarioToCreate[1].isCaseSensitive);
        const rightDirPromise = createDirStructure(scenarioRootDirPathRight, scenarioToCreate[1].right, scenarioToCreate[1].isCaseSensitive);
        Promise.all([leftDirPromise, rightDirPromise])
            .then(() => {
                console.log(`creating dirs for scenario ${scenarioToCreate[0]} done `);
            })
            .catch((e) => {
                console.error(`error creating dirs ${scenarioToCreate[0]}`, e);
            });

    } catch (e) {
        console.error(`error creating dirs ${scenarioToCreate[0]}`, e);

        break;
    }
};

function createDirSync(dirPath: string) {
    try {
        if (existsSync(dirPath)) {
            rmSync(dirPath, { recursive: true });
        }
        mkdirSync(dirPath);
    } catch (err) {
        console.error(err);
    }
};

function createDirStructure(parentDirPath: string, dirStructure: DirStructure<FileTuple | DirWithFiles>, isCaseSensitive: boolean): Promise<unknown> {

    const dirEntryPromises = dirStructure.map<Promise<unknown>>(dirEntry => {

        if (dirEntry[0] === 'f') { // file

            const [,fileName, fileSize, fileMtimeFlag, fileContent = 'a'] = dirEntry;

            if (fileName && fileContent && Number(fileSize)) {
                return createFile(path.resolve(parentDirPath, fileName), fileContent, Number(fileSize), Number(fileMtimeFlag));
            } else {
                return Promise.reject(`not enough info to create file ${fileName}`);
            }

        } else {

            const dirName = dirEntry[1];

            const dirStructureInDir = dirEntry[2];

            if (dirName && dirStructureInDir) {

                const dirPath = path.resolve(parentDirPath, dirName);

                const currDirPromise = new Promise<unknown>((res, rej) => {
                    fs.mkdir(dirPath).then(() => {
                        res(createDirStructure(dirPath, dirStructureInDir, isCaseSensitive));
                    }).catch((e) => {
                        rej(e);
                    });
                });

                return currDirPromise;
            }
            return Promise.reject(`not enough info to create dir ${dirName}`);

        };

    }, []);

    return Promise.all(dirEntryPromises);
};

async function createFile(filePath: string, contentChar: string, totalSize: number, mTimeFlag: number): Promise<unknown> {

    const MAX_BUFFER_SIZE = 16_384;

    const fileHandle = await fs.open(filePath, 'wx');

    const stream: WriteStream = fileHandle.createWriteStream();
    const writer = fillFileWriteStream(stream, contentChar, totalSize, MAX_BUFFER_SIZE);

    stream.on('drain', () => {
        writer.next();
    });
    const promise = new Promise<void>((resolve, reject) => {
        stream.on('finish', () => {
            fileHandle.close();
            if (mTimeFlag) {
                const newTime = Date.now() / 1000 + mTimeFlag * 10;
                fileHandle.utimes(newTime, newTime).then(() => {
                    resolve();
                }).catch(() => {
                    reject();
                });
            } else {
                resolve();
            }
        });
    });
    writer.next();
    return promise;
};

function* fillFileWriteStream(stream: WriteStream, contentChar: string, totalSize: number, maxBufferSize: number) {

    let remainingSize = totalSize;
    let maxBuffer: Buffer | undefined = undefined;

    do {
        let currBuffToWrite = maxBuffer;
        if (remainingSize >= maxBufferSize) {

            currBuffToWrite = maxBuffer ?? (maxBuffer = Buffer.from(contentChar.repeat(maxBufferSize)));
            remainingSize -= maxBufferSize;
        } else {

            currBuffToWrite = Buffer.from(contentChar.repeat(remainingSize));
            remainingSize = 0;
        }

        const streamBufferIsNotFull = stream.write(currBuffToWrite);
        if (!streamBufferIsNotFull) {
            yield;
        }

    } while (remainingSize > 0)

    stream.end();
};


