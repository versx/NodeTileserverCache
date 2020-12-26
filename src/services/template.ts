'use strict';

import ejs from 'ejs';
import * as path from 'path';

import * as utils from './utils';
import * as globals from '../data/globals';

export class Template {
    public name: string;
    public filePath: string;

    constructor(name: string) {
        this.name = name;
        if (!this.name.endsWith('.json')) {
            this.name += '.json';
        }
        this.filePath = path.resolve(globals.TemplatesDir, this.name);
    }

    public render(data: ejs.Data): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                return utils.fileExists(this.filePath).then(exists => {
                    if (!exists) {
                        console.error('Template', this.filePath, 'does not exist!');    
                        return reject();
                    }
                    ejs.renderFile(this.filePath, data, (err, str) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(str);
                    });
                });
            } catch (e) {
                return reject(e);
            }
        });
    }
}