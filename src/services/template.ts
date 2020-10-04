'use strict';

import ejs from 'ejs';
import * as path from 'path';

import * as utils from './utils';
import * as globals from '../data/globals';

export class Template {
    constructor() {
    }

    public static render(name: string, data: ejs.Data): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const filePath = path.resolve(globals.TemplatesDir, name);
                if (!await utils.fileExists(filePath)) {
                    console.error('Template', filePath, 'does not exist!');
                    return;
                }
                ejs.renderFile(filePath, data, (err, str) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(str);
                })
            } catch (e) {
                return reject(e);
            }
        });
    };
}