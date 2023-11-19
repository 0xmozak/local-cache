import * as core from '@actions/core';
import restoreImpl from './restoreImpl';
import { NullStateProvider } from './stateProvider';
async function run() {
    await restoreImpl(new NullStateProvider());
}
run()
    .catch((error) => {
    core.setFailed(error.message);
});
export default run;
