'use strict';

import * as fs from 'fs';
import axios from 'axios';
import * as crypto from 'crypto';
import btoa from 'btoa';
import * as path from 'path';

import * as globals from '../data/globals';

export const fileExists = async (path: string): Promise<boolean> => {
    return await fs.promises.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
};

export const fileLastModifiedTime = async (path: string): Promise<Date> => {
    const stats = await fs.promises.stat(path);
    return stats.mtime;
};

export const getData = async (url: string): Promise<string> => {
    const response = await axios.get(url);
    return response.data;
};

export const downloadFile = async (from: string, to: string): Promise<void> => {
    console.debug(`DownloadFile [From: ${from} To: ${to}]`);
    const writer = fs.createWriteStream(to);
    const response = await axios.get(from, {
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

export const md5 = (data: string): string => {
    const hash = crypto
        .createHash('md5')
        .update(data)
        .digest('hex');
    return hash;
};

// TODO: Review unknown (any value) or Record<string, unknown> (any object)
export const getHashCode = (obj: unknown): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json).replace('/', '_');
    const hash = md5(base64);
    return hash;
};

export const touch = async (fileName: string): Promise<void> => {
    try {
        const time = new Date();
        await fs.promises.utimes(fileName, time, time);
    } catch (err) {
        const handle = await fs.promises.open(fileName, 'w');
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        fs.close(handle.fd, () => {});
    }
};

export const storeRegenerable = async <T>(staticmap: T): Promise<string> => {
    const id = getHashCode(staticmap);
    const fileName = path.resolve(globals.RegeneratableCacheDir, id) + '.json';
    const fileData = JSON.stringify(staticmap);
    fs.writeFileSync(fileName, fileData);
    return id;
};