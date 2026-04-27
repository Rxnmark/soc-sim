import { ukCore } from './uk-core';
import { ukThreats } from './uk-threats';
import { ukExtended } from './uk-extended';

export const uk = { ...ukCore, ...ukThreats, ...ukExtended };
export default uk;