import * as core from '@actions/core';
import restoreImpl from './restoreImpl';
import { StateProvider } from './stateProvider';
async function run() {
    await restoreImpl(new StateProvider());
}
run()
    .catch((error) => {
    core.setFailed(error.message);
});
export default run;
