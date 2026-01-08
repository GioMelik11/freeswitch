import { ConfigService } from '@nestjs/config';
type TreeNode = {
    type: 'file';
    name: string;
    path: string;
} | {
    type: 'dir';
    name: string;
    path: string;
    children: TreeNode[];
};
export declare class FilesService {
    private readonly baseDir;
    private readonly backupsDir;
    constructor(config: ConfigService);
    private isAllowedTextFile;
    private resolveSafe;
    listFiles(relDir: string, opts?: {
        regex?: RegExp;
        extensions?: string[];
    }): {
        name: string;
        path: string;
    }[];
    private sha256;
    listRootTree(): TreeNode[];
    private walkDir;
    readFile(relPath: string): {
        path: string;
        content: string;
        etag: string;
        mtimeMs: number;
    };
    writeFile(params: {
        path: string;
        content: string;
        etag?: string;
    }): {
        ok: boolean;
        etag: string;
    };
    deleteFile(relPath: string, etag?: string): {
        ok: boolean;
    };
    private backupFile;
}
export {};
