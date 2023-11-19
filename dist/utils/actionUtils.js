import * as core from '@actions/core';
import * as cache from '../cache';
export function isGhes() {
    const ghUrl = new URL(process.env.GITHUB_SERVER_URL || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
export function isExactKeyMatch(key, cacheKey) {
    return !!(cacheKey
        && cacheKey.localeCompare(key, undefined, {
            sensitivity: 'accent',
        }) === 0);
}
export function logWarning(message) {
    const warningPrefix = '[warning]';
    core.info(`${warningPrefix}${message}`);
}
export function getInputAsArray(name, options) {
    return core
        .getInput(name, options)
        .split('\n')
        .map(s => s.replace(/^!\s+/, '!').trim())
        .filter(x => x !== '');
}
export function getInputAsInt(name, options) {
    const value = parseInt(core.getInput(name, options), 10);
    if (Number.isNaN(value) || value < 0) {
        return undefined;
    }
    return value;
}
export function getInputAsBool(name, options) {
    const result = core.getInput(name, options);
    return result.toLowerCase() === 'true';
}
export function isCacheFeatureAvailable() {
    if (cache.isFeatureAvailable()) {
        return true;
    }
    if (isGhes()) {
        logWarning(`Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.
Otherwise please upgrade to GHES version >= 3.5 and If you are also using Github Connect, please unretire the actions/cache namespace before upgrade (see https://docs.github.com/en/enterprise-server@3.5/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect#automatic-retirement-of-namespaces-for-actions-accessed-on-githubcom)`);
        return false;
    }
    logWarning('An internal error has occurred in cache backend. Please check https://www.githubstatus.com/ for any ongoing issue in actions.');
    return false;
}
