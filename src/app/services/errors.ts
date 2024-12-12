import { EntityType } from "../types/servicesTypes";

export const ERR_UNTYPED = 'untypedError';
export const ERR_CASE_SENSITIVITY = 'caseSensitivityError';
export const ERR_PERMISSION_ERROR = 'permissionError';
export const ERR_DIR_ENTRIES_FAIL = 'dirEntriesFailed';
export const ERR_GET_FILE_FROM_HANDLE = 'failedGetFileFromHandle';



export type ErrorType = typeof ERR_UNTYPED | typeof ERR_PERMISSION_ERROR | typeof ERR_CASE_SENSITIVITY | typeof ERR_DIR_ENTRIES_FAIL | typeof ERR_GET_FILE_FROM_HANDLE;

export interface ScanErrorDetails {
    type: ErrorType;
    entityName: string;
    entityType: EntityType;
    path: string;
    cause: Error | string;
    timestamp: number;
}

export class ScanError extends Error {

    constructor(message: string, public details: ScanErrorDetails) {
        super(message, { cause: details.cause });
    }
}

export function causifyCaughtErr(e: unknown): Error | string {

    if (
        (typeof e === 'string') ||
        (e instanceof Error)
    ) {
        return e;
    }
   
    return e?.toString?.() ?? 'cause absent';
}

export function convertScanErrorToInfoBlock(error: ScanError): string[] {
    return [
        error.message,
        `Type: ${error.details.entityType}`,
        `Path: ${error.details.path}`,
        `Name: '${error.details.entityName}'`,
        error.details.cause.toString(),
    ];
}