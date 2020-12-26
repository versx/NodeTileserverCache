'use strict';

import * as os from 'os';
import * as path from 'path';
import SphericalMercator from '@mapbox/sphericalmercator';

import { exec } from './spawn';
import * as globals from '../data/globals';
import { Circle } from '../models/circle';
import { Coordinate } from '../models/coordinate';
import { Grid } from '../interfaces/grid';
import { Marker } from '../models/marker';
import { Polygon } from '../models/polygon';
import { StaticMap } from '../models/staticmap';
import { CombineDirection } from '../data/combine-direction';
import * as utils from '../services/utils';

const ImageMagickPath = os.platform() === 'win32'
    ? 'convert'
    : '/usr/local/bin/convert';

export class ImageMagick {
    public markers: Marker[];
    public polygons: Polygon[];
    public circles: Circle[];

    constructor(markers: Marker[] = [], polygons: Polygon[] = [], circles: Circle[] = []) {
        this.markers = markers;
        this.polygons = polygons;
        this.circles = circles;
    }

    public async buildArguments(staticmap: StaticMap): Promise<string[]> {
        let args: string[] = [];
        const markerArgs: string[] = [];
        const staticmapCoord = new Coordinate(staticmap.latitude, staticmap.longitude);
        for (const marker of staticmap.markers || []) {
            const markerCoord = new Coordinate(marker.latitude, marker.longitude);
            let realOffset = this.getRealOffset(
                markerCoord,
                staticmapCoord,
                staticmap.zoom,
                staticmap.scale,
                marker.x_offset ?? 0,
                marker.y_offset ?? 0,
            );

            if (Math.abs(realOffset.x) > (staticmap.width + marker.width) * staticmap.scale / 2 ||
               (Math.abs(realOffset.y) > (staticmap.height + marker.height) * staticmap.scale / 2)) {
                continue;
            }

            let realOffsetXPrefix: string = realOffset.x >= 0 ? '+' : '';
            let realOffsetYPrefix: string = realOffset.y >= 0 ? '+' : '';

            let markerPath: string;
            if (marker.url.startsWith('http://') || marker.url.startsWith('https://')) {
                const markerUrlEncoded = utils.md5(marker.url);
                const markerFileName = path.resolve(globals.MarkerCacheDir, markerUrlEncoded);
                if (!await utils.fileExists(markerFileName)) {
                    await utils.downloadFile(marker.url, markerFileName);
                }
                markerPath = markerFileName;
            } else {
                markerPath = `Markers/${marker.url}`;
            }

            markerArgs.push([
                '(', markerPath, '-resize', `${marker.width * staticmap.scale}x${marker.height * staticmap.scale}`, ')',
                '-gravity', 'Center',
                '-geometry', `${realOffsetXPrefix}${realOffset.x}${realOffsetYPrefix}${realOffset.y}`,
                '-composite'
            ].join(' '));
        }
        const polygonArgs: string[] = [];
        for (const polygon of staticmap.polygons || []) {
            const points: any[] = [];
            const polygonPaths: number[][] = JSON.parse(polygon.path);
            for (const coord of polygonPaths) {
                if (coord.length !== 2) {
                    //return request.eventLoop.future(error: Abort(.badRequest, reason: "Expecting two values to form a coordinate but got \(coord.count)"))
                }
                const polygonCoord = new Coordinate(coord[0], coord[1]);
                const point = this.getRealOffset(polygonCoord, staticmapCoord, staticmap.zoom, staticmap.scale);
                points.push({
                    x: point.x + Number(staticmap.width / 2 * staticmap.scale),
                    y: point.y + Number(staticmap.height / 2 * staticmap.scale)
                });
            }
            
            let polygonPath:string = '';
            for (const point of points) {
                polygonPath += `${point.x},${point.y} `;
            }
            //polygonPath.removeLast();
            
            polygonArgs.push([
                '-strokewidth', String(polygon.stroke_width),
                '-fill', polygon.fill_color,
                '-stroke', polygon.stroke_color,
                '-gravity', 'Center',
                '-draw', `polygon ${polygonPath}`
            ].join(' '));
        }
        const circleArgs: string[] = [];
        for (const circle of staticmap.circles || []) {
            const coord = new Coordinate(circle.latitude, circle.longitude);
            const point = this.getRealOffset(
                coord,
                new Coordinate(staticmap.latitude, staticmap.longitude),
                staticmap.zoom,
                staticmap.scale,
            );
            const radius = this.getRealOffset(
                coord,
                coord.coordinate(circle.radius, 0),
                staticmap.zoom,
                staticmap.scale,
            ).y
            const x = point.x + Number(staticmap.width * staticmap.scale / 2);
            const y = point.y + Number(staticmap.height * staticmap.scale / 2);
            const args = [
                '-strokewidth', String(circle.stroke_width),
                '-fill', circle.fill_color,
                '-stroke', circle.stroke_color,
                '-gravity', 'Center',
                '-draw', `circle ${x},${y} ${x},${y + radius}`
            ];
            circleArgs.push(args.join(' '));
        }
        markerArgs.forEach(x => args.push(x));
        polygonArgs.forEach(x => args.push(x));
        circleArgs.forEach(x => args.push(x));
        return args;
    }

    async generate(): Promise<void> {
        // TODO: Build up imagemagick command and generate per staticmap
        const lat = 34.05;
        const lon = -117.05;
        const markers: Marker[] = [
            new Marker({
                url: 'https://www.artfixdaily.com/images/c/90/a8/Pokemon_card34390x650.jpg',
                width: 32,
                height: 32,
                latitude: lat,
                longitude: lon,
                bearing: 0,
                pitch: 0
            }),
        ];
        const polygons: Polygon[] = [
            //new Polygon('green', 'black', 1, null),
        ];
        const circles: Circle[] = [
            new Circle({
                latitude: lat,
                longitude: lon,
                radius: 25,
                fill_color: 'red',
                stroke_color: 'black',
                stroke_width: 1
            }),
        ];
        const staticmap = new StaticMap({
            style: 'dark-matter',
            latitude: lat,
            longitude: lon,
            zoom: 15,
            width: 300,
            height: 175,
            scle: 1,
            format: 'png',
            bearing: 0,
            pitch: 0,
            markers: markers,
            polygons: polygons,
            circles: circles
        });
        const args = await this.buildArguments(staticmap);
        console.debug('ImageMagick arguments:', args.join('\n'));
    }

    public async combineImagesGrid(grids: Array<Grid>, destinationPath: string): Promise<void> {
        console.debug(`Combine Images Grid [Grids: ${grids}, DestinationPath: ${destinationPath}]`);
        const args = Array<string>();
        for (const grid of grids) {
            args.push('(');
            args.push(grid.firstPath);
            for (const image of grid.images) {
                args.push(image.path);
                if (image.direction === CombineDirection.Bottom) {
                    args.push('-append');
                } else {
                    args.push('+append');
                }
            }
            args.push(')');
            if (grid.direction === CombineDirection.Bottom) {
                args.push('-append');
            } else {
                args.push('+append');
            }
        }
        args.push(destinationPath);
    
        //console.debug('Grid Args:', args);
        try {
            const shell = await exec(ImageMagickPath, args);
            console.debug('Magick CombineImagesGrid:', shell);
        } catch (e) {
            console.error('Failed to run magick:', e);
        }
    }
    
    public async combineImages(staticPath: string, markerPath: string, destinationPath: string, marker: Marker, staticmap: StaticMap): Promise<void> {
        const realOffset = this.getRealOffset(
            new Coordinate(marker.latitude, marker.longitude),
            new Coordinate(staticmap.latitude, staticmap.longitude),
            staticmap.zoom,
            staticmap.scale,
            marker.x_offset,
            marker.y_offset
        );
        const realOffsetXPrefix = realOffset.x >= 0 ? '+' : '';
        const realOffsetYPrefix = realOffset.y >= 0 ? '+' : '';
        const shell = await exec(ImageMagickPath, [
            staticPath,
            '(', markerPath, '-resize', `${marker.width * staticmap.scale}x${marker.height * staticmap.scale}`, ')',
            '-gravity', 'Center',
            '-geometry', `${realOffsetXPrefix}${realOffset.x}${realOffsetYPrefix}${realOffset.y}`,
            '-composite',
            destinationPath
        ]);
        console.debug('Magick CombineImages:', shell);
    }
    
    public async drawPolygon(staticPath: string, destinationPath: string, polygon: Polygon, staticmap: StaticMap): Promise<void> {
        const points = [];
        const polygons = JSON.parse(polygon.path);
        const staticmapCoord = new Coordinate(staticmap.latitude, staticmap.longitude);
        for (let i = 0; i < polygons.length; i++) {
            const coord = polygons[i];
            if (coord.length !== 2) {
                console.error('Polygon coordinates don\'t match up, aborting...');
                return;
            }
            const polygonCoord = new Coordinate(coord[0], coord[1]);
            const point = this.getRealOffset(polygonCoord, staticmapCoord, staticmap.zoom, staticmap.scale);
            points.push({
                x: point.x + staticmap.width / 2 * staticmap.scale,
                y: point.y + staticmap.height / 2 * staticmap.scale
            });
        }
    
        let polygonPath = points.map((value) => `${value.x},${value.y} `).join('');
        polygonPath = polygonPath.slice(0, polygonPath.length - 1);
        const shell = await exec(ImageMagickPath, [
            staticPath,
            '-strokewidth', polygon.stroke_width?.toString(),
            '-fill', polygon.fill_color,
            '-stroke', polygon.stroke_color,
            '-gravity', 'Center',
            '-draw', `polygon ${polygonPath}`,
            destinationPath 
        ]);
        console.debug('Magick DrawPolygon:', shell);
    }
    
    public async drawCircle(staticPath: string, destinationPath: string, circle: Circle, staticmap: StaticMap): Promise<void> {
        const circleCoord = new Coordinate(circle.latitude, circle.longitude);
        const radiusCoord = circleCoord.coordinate(circle.radius, 0);
        const staticMapCoord = new Coordinate(staticmap.latitude, staticmap.longitude);
        const point = this.getRealOffset(circleCoord, staticMapCoord, staticmap.zoom, staticmap.scale);
        const radius = this.getRealOffset(circleCoord, radiusCoord, staticmap.zoom, staticmap.scale).y;
        let x = point.x + Number(staticmap.width * staticmap.scale / 2);
        let y = point.y + Number(staticmap.height * staticmap.scale / 2);
        const shell = await exec(ImageMagickPath, [
            staticPath,
            '-strokewidth', circle.stroke_width?.toString(),
            '-fill', circle.fill_color,
            '-stroke', circle.stroke_color,
            '-gravity', 'Center',
            '-draw', `circle ${x},${y} ${x - circle.radius},${y + circle.radius}`,
            destinationPath 
        ]);
        console.debug('Magick DrawCircle:', shell);
    }

    private getRealOffset(at: Coordinate, relativeTo: Coordinate, zoom: number, scale: number, extraX: number = 0, extraY: number = 0): { x: number, y: number } {
        let realOffsetX: number;
        let realOffsetY: number;
        if (relativeTo.latitude === at.latitude && relativeTo.longitude === at.longitude) {
            realOffsetX = 0;
            realOffsetY = 0;
        } else {
            // TODO: Use singleton of SphericalMercator
            const options = {};
            const px1 = new SphericalMercator(options).px([relativeTo.latitude, relativeTo.longitude], 20);
            const px2 = new SphericalMercator(options).px([at.latitude, at.longitude], 20);
            const pxScale = Math.pow(2, zoom - 20);
            realOffsetX = (px2[0] - px1[0]) * pxScale * scale;
            realOffsetY = (px2[1] - px1[1]) * pxScale * scale;
            if (!(px1 && px2)) {
                realOffsetX = 0;
                realOffsetY = 0;
            }
        }
        return {
            x: realOffsetX + extraX * scale,
            y: realOffsetY + extraY * scale,
        };
    }
};