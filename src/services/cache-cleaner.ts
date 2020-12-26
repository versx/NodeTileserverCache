'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';

export class CacheCleaner {
    private folder: string;
    private maxAgeMinutes: number;
    private clearDelaySeconds: number;
    private timer: NodeJS.Timeout;

    constructor(folder: string, maxAgeMinutes: number, clearDelaySeconds: number) {
        this.folder = folder;
        this.maxAgeMinutes = maxAgeMinutes;
        this.clearDelaySeconds = clearDelaySeconds || 60;
        this.timer = setInterval(() => this.checkFiles(), this.clearDelaySeconds * 1000);
        console.info('Started cache directory cleaner for', this.folder);
    }

    private checkFiles(): void {
        fs.readdir(this.folder, async (err, files) => {
            if (err) {
                console.error('Failed to read cache directory.', 'Error:', err);
                return;
            }
            if (files && files.length > 0) {
                for (const file in files) {
                    const filePath = path.resolve(this.folder, file);
                    if (await this.isFileTooOld(filePath)) {
                        console.info(`Removing file ${filePath} (Too old)`);
                        this.deleteFile(filePath);
                    }
                }
            }
        });
    }

    private isFileTooOld = async (path: string): Promise<boolean> => {
        const lastModified = await utils.fileLastModifiedTime(path);
        const now = new Date();
        const delta = (now.getTime() - lastModified.getTime()) / 1000;
        console.debug('Time Delta:', delta);
        return delta >= this.maxAgeMinutes * 60;
    }

    private deleteFile = (path: string): void => {
        try {
            fs.unlink(path, (err) => {
                if (err) {
                    console.error('Failed to delete', path, 'Error:', err);
                    return;
                }
                console.info('File', path, 'deleted...');
            });
        } catch (e) {
            console.error('Failed to delete', path, 'Error:', e);
        }
    }

    public stop(): void {
        console.info('Stopping cache directory cleaner for', this.folder);
        clearInterval(this.timer);
    }
}