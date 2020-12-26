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
        this.filePath = path.resolve(globals.TemplatesDir, name);
    }

    public render(data: ejs.Data): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                return utils.fileExists(this.filePath).then(exists => {
                    if (exists) {
                        ejs.renderFile(this.filePath, data, (err, str) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(str);
                        });
                    } else {
                        console.error('Template', this.filePath, 'does not exist!');    
                        return reject();
                    }
                });
            } catch (e) {
                return reject(e);
            }
        });
    }
}