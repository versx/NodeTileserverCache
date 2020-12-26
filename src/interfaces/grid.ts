'use strict';

import { CombineDirection } from '../data/combine-direction';
import { GridImage } from '../interfaces/grid-image';

export interface Grid {
    firstPath: string,
    direction: CombineDirection,
    images: Array<GridImage>
}