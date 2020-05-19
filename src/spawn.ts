'use strict';

import { spawn } from 'child_process';

// TODO: Change any types
// TODO: Change function

function exec(path: string, args: any[]) {
    //console.log('[Child] Cmd:', path, 'Args:', args);
    return new Promise((resolve, reject) => {
        try {
            const shell = spawn(path, args);
            shell.stdout.on('data', (data: Buffer) => {
                console.log('Stdout:' + data.toString());
            });
            shell.stderr.on('data', (data: Buffer) => {
                console.log('[ERROR] Stderr:', data.toString());
                resolve(data.toString());
            });
            shell.on('close', (code: number) => {
                //console.log('Child process exited with code:', code);
                if (code > 0) {
                    console.error('[ERROR] Child process exited with non zero exit code:', code);
                }
                resolve(code);
            });
        } catch (e) {
            return reject(e);
        }
    });
}

export {
    exec
};