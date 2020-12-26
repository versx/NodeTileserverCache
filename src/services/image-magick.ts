'use strict';

import * as os from 'os';
import * as path from 'path';
import SphericalMercator from '@mapbox/sphericalmercator';

import { exec } from './spawn';
import { CombineDirection } from '../data/combine-direction';
import * as globals from '../data/globals';
import { Grid } from '../interfaces/grid';
import { Coordinate } from '../models/coordinate';
import { StaticMap } from '../models/staticmap';
import * as utils from '../services/utils';

const ImageMagickPath = os.platform() === 'win32'
    ? 'convert'
    : '/usr/local/bin/convert';

const sphericalMercator = new SphericalMercator({});

export class ImageMagick {

    public async buildArguments(staticmap: StaticMap, tilePath: string, destinationPath: string): Promise<string[]> {
        let args: string[] = [];
        args.push(tilePath);
        const markerArgs: string[][] = [];
        const staticmapCoord = new Coordinate(staticmap.latitude, staticmap.longitude);
        for (const marker of staticmap.markers || []) {
            const markerCoord = new Coordinate(marker.latitude, marker.longitude);
            const realOffset = this.getRealOffset(
                markerCoord,
                staticmapCoord,
                staticmap.zoom,
                staticmap.scale,
                marker.x_offset || 0,
                marker.y_offset || 0,
            );

            if (Math.abs(realOffset.x) > (staticmap.width + marker.width) * staticmap.scale / 2 ||
               (Math.abs(realOffset.y) > (staticmap.height + marker.height) * staticmap.scale / 2)) {
                continue;
            }

            const realOffsetXPrefix: string = realOffset.x >= 0 ? '+' : '';
            const realOffsetYPrefix: string = realOffset.y >= 0 ? '+' : '';

            let markerPath: string;
            if (marker.url.startsWith('http://') || marker.url.startsWith('https://')) {
                const markerUrlEncoded = utils.md5(marker.url);
                const markerFileName = path.resolve(globals.MarkerCacheDir, markerUrlEncoded);
                if (!await utils.fileExists(markerFileName)) {
                    await utils.downloadFile(marker.url, markerFileName);
                }
                markerPath = markerFileName;
            } else {
                // TODO: Test local marker support
                markerPath = `static/markers/${marker.url}`;
            }

            markerArgs.push([
                '(', markerPath, '-resize', `${marker.width * staticmap.scale}x${marker.height * staticmap.scale}`, ')',
                '-gravity', 'Center',
                '-geometry', `${realOffsetXPrefix}${realOffset.x}${realOffsetYPrefix}${realOffset.y}`,
                '-composite'
            ]);
        }
        const polygonArgs: string[][] = [];
        for (const polygon of staticmap.polygons || []) {
            const points: Point[] = [];
            const polygonPaths: number[][] = JSON.parse(polygon.path);
            for (const coord of polygonPaths) {
                if (coord.length !== 2) {
                    console.error('Invalid coordinate count, expected two values but received', coord.length);
                    continue;
                }
                const polygonCoord = new Coordinate(coord[0], coord[1]);
                const point = this.getRealOffset(polygonCoord, staticmapCoord, staticmap.zoom, staticmap.scale);
                points.push({
                    x: point.x + Number(staticmap.width / 2 * staticmap.scale),
                    y: point.y + Number(staticmap.height / 2 * staticmap.scale)
                });
            }
            
            let polygonPath = points.map((value) => `${value.x},${value.y} `).join('');
            polygonPath = polygonPath.slice(0, polygonPath.length - 1);
            
            polygonArgs.push([
                '-strokewidth', String(polygon.stroke_width),
                '-fill', polygon.fill_color,
                '-stroke', polygon.stroke_color,
                '-gravity', 'Center',
                '-draw', `polygon ${polygonPath}`
            ]);
        }
        const circleArgs: string[][] = [];
        for (const circle of staticmap.circles || []) {
            const coord = new Coordinate(circle.latitude, circle.longitude);
            const point = this.getRealOffset(
                coord,
                new Coordinate(staticmap.latitude, staticmap.longitude),
                staticmap.zoom,
                staticmap.scale,
            );
            /*
            const radius = this.getRealOffset(
                coord,
                coord.coordinateFrom(circle.radius, 0),
                staticmap.zoom,
                staticmap.scale,
            ).y;
            */
            const x = point.x + Number(staticmap.width * staticmap.scale / 2);
            const y = point.y + Number(staticmap.height * staticmap.scale / 2);
            circleArgs.push([
                '-strokewidth', String(circle.stroke_width),
                '-fill', circle.fill_color,
                '-stroke', circle.stroke_color,
                '-gravity', 'Center',
                '-draw', `circle ${x},${y} ${x - circle.radius},${y + circle.radius}`
            ]);
        }
        polygonArgs.forEach(x => args = args.concat(x));
        circleArgs.forEach(x => args = args.concat(x));
        markerArgs.forEach(x => args = args.concat(x));
        args.push(destinationPath);
        return args;
    }

    public async generate(args: string[]): Promise<void> {
        //console.debug('args:', args.join('\n'));
        const shell = await exec(ImageMagickPath, args);
        console.debug('Magick:', shell);
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
   
    private getRealOffset(at: Coordinate, relativeTo: Coordinate, zoom: number, scale: number, extraX = 0, extraY = 0): Point {
        let realOffsetX: number;
        let realOffsetY: number;
        if (relativeTo.latitude === at.latitude && relativeTo.longitude === at.longitude) {
            realOffsetX = 0;
            realOffsetY = 0;
        } else {
            const px1 = sphericalMercator.px([relativeTo.latitude, relativeTo.longitude], 20);
            const px2 = sphericalMercator.px([at.latitude, at.longitude], 20);
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
}

interface Point {
    x: number;
    y: number;
}