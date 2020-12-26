'use strict';

import { CombineDirection } from '../data/combine-direction';

export interface Grid {
    firstPath: string,
    direction: CombineDirection,
    images: Array<{
        direction: CombineDirection,
        path: string
    }>
}