import * as core from '@actions/core';
import saveImpl from './saveImpl';
import { NullStateProvider } from './stateProvider';
async function run() {
    const cacheId = await saveImpl(new NullStateProvider());
    if (cacheId === -1) {
        core.warning('Cache save failed.');
    }
}
run()
    .catch((error) => {
    core.setFailed(error.message);
});
export default run;
