import * as core from '@actions/core';
import saveImpl from './saveImpl';
import { StateProvider } from './stateProvider';
async function run() {
    await saveImpl(new StateProvider());
}
run()
    .catch((error) => {
    core.setFailed(error.message);
});
export default run;
