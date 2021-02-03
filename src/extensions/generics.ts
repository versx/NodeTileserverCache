'use strict';

export class GenericsExtensions {
    public static parse<T>(json: string): T[] {
        const list: T[] = [];
        if (!json) return list;
        json = json.toString()?.replace(/%22/g, '"');
        if (json) {
            return JSON.parse(json);
        }
        return list;
    }
}
