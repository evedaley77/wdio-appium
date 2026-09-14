export declare class BStackLogger {
    static logFilePath: string;
    static logFolderPath: string;
    private static logFileStream;
    private static redactCredentials;
    static logToFile(logMessage: string, logLevel: string): void;
    private static formatLog;
    static info(message: string): void;
    static error(message: string): void;
    static debug(message: string, param?: unknown): void;
    static warn(message: string): void;
    static trace(message: string): void;
    /**
     * Drain whatever is still sitting in the log stream's buffer onto disk.
     *
     * `logToFile` writes to an async `fs.WriteStream`, so a line logged immediately before the
     * archive is built is very likely NOT in the file yet — the stream's `open` is async too,
     * so early on the file may not exist at all. Anything that snapshots the log (the debug-log
     * upload) must flush first or it ships a truncated copy.
     *
     * A zero-length write's callback fires only after every chunk queued ahead of it has been
     * handed to the fs layer, which drains the buffer without ending the stream — unlike
     * `clearLogger()`, logging continues to work afterwards.
     */
    static flushLogFile(timeoutMs?: number): Promise<void>;
    static clearLogger(): void;
    static clearLogFile(): void;
    static ensureLogsFolder(): void;
}
