/* eslint-disable max-classes-per-file */
import * as core from '@actions/core';
import { Outputs, State } from './constants';
class StateProviderBase {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, class-methods-use-this
        this.setState = (_key, _value) => { };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
        this.getState = (_key) => '';
    }
    getCacheState() {
        const cacheKey = this.getState(State.CacheMatchedKey);
        if (cacheKey) {
            core.debug(`Cache state/key: ${cacheKey}`);
            return cacheKey;
        }
        return undefined;
    }
}
export class StateProvider extends StateProviderBase {
    constructor() {
        super(...arguments);
        this.setState = core.saveState;
        this.getState = core.getState;
    }
}
export class NullStateProvider extends StateProviderBase {
    constructor() {
        super(...arguments);
        this.stateToOutputMap = new Map([
            [State.CacheMatchedKey, Outputs.CacheMatchedKey],
            [State.CachePrimaryKey, Outputs.CachePrimaryKey],
        ]);
        this.setState = (key, value) => {
            core.setOutput(this.stateToOutputMap.get(key), value);
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
        this.getState = (_key) => '';
    }
}
