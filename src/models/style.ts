'use strict';

export class Style {
    public id: string;
    public name: string;
    public url: string;
    public version: number;

    constructor(id: string, name: string, url: string, version = 1) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.version = version;
    }
}