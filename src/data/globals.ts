'use strict';

import * as path from 'path';

export const ValidFormats = [ 'png', 'jpg' ];

// Cache directory paths
export const CacheDir = path.resolve(__dirname, '../../Cache');
export const TileCacheDir = path.resolve(CacheDir, 'Tile');
export const StaticCacheDir = path.resolve(CacheDir, 'Static');
export const StaticMultiCacheDir = path.resolve(CacheDir, 'StaticMulti');
export const StaticWithMarkersCacheDir = path.resolve(CacheDir, 'StaticWithMarkers');
export const MarkerCacheDir = path.resolve(CacheDir, 'Marker');