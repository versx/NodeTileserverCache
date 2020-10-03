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

    private checkFiles() {
        fs.readdir(this.folder, (err, files) => {
            if (err) {
                console.error('Failed to read cache directory.', 'Error:', err);
                return;
            }
            if (files && files.length > 0) {
                files.forEach(async (file: string) => {
                    const filePath = path.resolve(this.folder, file);
                    const lastModified = await utils.fileLastModifiedTime(filePath);
                    const now = new Date();
                    const delta = (now.getTime() - lastModified.getTime()) / 1000;
                    console.debug('Time Delta:', delta);
                    if (delta >= this.maxAgeMinutes * 60) {
                        console.info(`Removing file ${filePath} (Too old)`);
                        try {
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    console.error('Failed to delete', filePath, 'Error:', err);
                                    return;
                                }
                                console.info('File', filePath, 'deleted...');
                            });
                        } catch (e) {
                            console.error('Failed to delete', filePath, 'Error:', e);
                        }
                    }
                });
            }
        });
    }

    public stop() {
        console.info('Stopping cache directory cleaner for', this.folder);
        clearInterval(this.timer);
    }
}