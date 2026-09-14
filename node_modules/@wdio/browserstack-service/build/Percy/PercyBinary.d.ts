declare class PercyBinary {
    #private;
    constructor();
    getBinaryPath(): Promise<string>;
    validateBinary(binaryPath: string): Promise<unknown>;
    download(destParentDir: string, response?: Response): Promise<string>;
}
export default PercyBinary;
