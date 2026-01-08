import { FilesService } from './files.service';
import { WriteFileDto } from './dto/write-file.dto';
export declare class FilesController {
    private readonly files;
    constructor(files: FilesService);
    tree(): ({
        type: "file";
        name: string;
        path: string;
    } | {
        type: "dir";
        name: string;
        path: string;
        children: ({
            type: "file";
            name: string;
            path: string;
        } | any)[];
    })[];
    read(path: string): {
        path: string;
        content: string;
        etag: string;
        mtimeMs: number;
    };
    write(dto: WriteFileDto): {
        ok: boolean;
        etag: string;
    };
}
