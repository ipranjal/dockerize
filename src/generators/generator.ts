import * as path from "node:path";
const NOT_IMPLEMENTED = "not implemented";

export class generator {
    file:string
    constructor(file:string) {
        this.file = file
      }

    getWorkDir(){
        return "/app"
    }

    getImage() {
        throw new Error(NOT_IMPLEMENTED);
    }

    getPreRun() {
        throw new Error(NOT_IMPLEMENTED);
    }

    getEnv(){
        throw new Error(NOT_IMPLEMENTED);
    }


    getPostRun():string[][] {
        return []
    }

    getExpose(){
        return 0
    }


    getCmd() {
        throw new Error(NOT_IMPLEMENTED);
    }

    getCopy() {
        const fileName: string = path.basename(this.file);
        return [{ [fileName]: this.file }];
    }

    
}
