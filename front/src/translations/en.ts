import { enCore } from './en-core';
import { enThreats } from './en-threats';
import { enExtended } from './en-extended';

export const en = { ...enCore, ...enThreats, ...enExtended };
export default en;