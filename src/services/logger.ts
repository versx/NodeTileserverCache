'use strict';

import { betterLogging, Theme } from 'better-logging';

betterLogging(console, {
    color: Theme.dark
});

const stringToLogLevel = (level: string): number => {
    switch (level.toLowerCase()) {
    case 'debug':
        return 4;
    case 'log':
        return 3;
    case 'info':
        return 2;
    case 'warn':
    case 'line':
        return 1;
    case 'error':
        return 0;
    case 'off':
        return -1;
    }
    return 3;
};

console.logLevel = stringToLogLevel(process.env.LOG_LEVEL || 'info');
/**
 * debug: 4
 * log: 3
 * info: 2
 * warn: 1
 * error: 0
 * line: 1
 * turn off all logging: -1
 * default: 3
 */