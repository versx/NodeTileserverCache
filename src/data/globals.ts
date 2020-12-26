'use strict';

import * as path from 'path';

export const ValidFormats = [ 'png', 'jpg' ];

export const TemplatesDir = path.resolve(__dirname, '../../templates');

// Cache directory paths
export const CacheDir = path.resolve(__dirname, '../../cache');
export const TileCacheDir = path.resolve(CacheDir, 'tile');
export const StaticCacheDir = path.resolve(CacheDir, 'static');
export const StaticMultiCacheDir = path.resolve(CacheDir, 'static-multi');
export const StaticWithMarkersCacheDir = path.resolve(CacheDir, 'static-markers');
export const MarkerCacheDir = path.resolve(CacheDir, 'marker');