/**
 * @license Copyright (C) 2014-2018 Matthew D. Mower
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

document.addEventListener('DOMContentLoaded', function () {
    initSourceInfo();
    applyOptions();
    chrome.storage.onChanged.addListener(storageChangeHandler);
}, false);

// sourceInfo is globally accessible
var sourceInfo;

/**
 * Initialize sourceInfo with properties and methods
 */
function initSourceInfo() {
    sourceInfo = {
        data: {
            v4: {
                name: 'IPv4',
                id: 'v4',
                default: true,
                enabled: true,
                sources: {
                    identme: {
                        id: 'identme',
                        url: 'https://v4.ident.me',
                        name: 'ident.me',
                        order: 3,
                        default: false,
                        enabled: true,
                    },
                    ipify: {
                        id: 'ipify',
                        url: 'https://api.ipify.org',
                        name: 'ipify',
                        order: 1,
                        default: false,
                        enabled: true,
                    },
                    icanhazip: {
                        id: 'icanhazip',
                        url: 'https://ipv4.icanhazip.com',
                        name: 'ICanHazIP',
                        order: 0,
                        default: true,
                        enabled: true,
                    },
                    wtfismyip: {
                        id: 'wtfismyip',
                        url: 'https://ipv4.wtfismyip.com/text',
                        name: 'WTF is my IP?!?!??',
                        order: 2,
                        default: false,
                        enabled: true,
                    },
                },
            },
            v6: {
                name: 'IPv6',
                id: 'v6',
                default: false,
                enabled: true,
                sources: {
                    identme: {
                        id: 'identme',
                        url: 'https://v6.ident.me',
                        name: 'ident.me',
                        order: 2,
                        default: false,
                        enabled: true,
                    },
                    icanhazip: {
                        id: 'icanhazip',
                        url: 'https://ipv6.icanhazip.com',
                        name: 'ICanHazIP',
                        order: 0,
                        default: true,
                        enabled: true,
                    },
                    wtfismyip: {
                        id: 'wtfismyip',
                        url: 'https://ipv6.wtfismyip.com/text',
                        name: 'WTF is my IP?!?!??',
                        order: 1,
                        default: false,
                        enabled: true,
                    },
                },
            },
        },

        // Get the IP version ID that should be automatically enabled if the user
        // attempts to un-select all versions in Options
        getDefaultVersion() {
            return Object.keys(this.data).find((version) => {
                return this.data[version].default;
            });
        },

        // Get an array of all known IP version IDs
        getVersions() {
            return Object.keys(this.data);
        },

        // Get info for a specific IP version
        getVersionData(version) {
            return this.data[version];
        },

        // Validate a version ID and throw an error if not recognized
        verifyVersionOrThrow(version) {
            if (Object.keys(this.data).indexOf(version) < 0)
                throw new Error('Unrecognized version "' + version + '"');
        },

        // Get the default source ID that should be automatically enabled if the user
        // attempts to un-select all sources for a specific IP version in Options
        getDefaultId(version) {
            this.verifyVersionOrThrow(version);
            return Object.keys(this.data[version].sources).find((id) => {
                return this.data[version].sources[id].default;
            });
        },

        // Get an array of all known source IDs for a specific IP version
        getIds(version) {
            this.verifyVersionOrThrow(version);
            return Object.keys(this.data[version].sources);
        },

        // Get an array of all known source IDs for a specific IP version
        // sorted by user preference
        getOrderedIds(version) {
            this.verifyVersionOrThrow(version);
            return Object.keys(this.data[version].sources).sort((a, b) => {
                return this.data[version].sources[a].order - this.data[version].sources[b].order;
            });
        },

        // Get an array of all enabled source IDs for a specific IP version
        getEnabledIds(version) {
            this.verifyVersionOrThrow(version);
            return Object.keys(this.data[version].sources).filter((id) => {
                return this.data[version].sources[id].enabled;
            });
        },

        // Get an array of all enabled source IDs for a specific IP version
        // sorted by user preference
        getOrderedEnabledIds(version) {
            this.verifyVersionOrThrow(version);
            return Object.keys(this.data[version].sources).filter((id) => {
                return this.data[version].sources[id].enabled;
            }).sort((a, b) => {
                return this.data[version].sources[a].order - this.data[version].sources[b].order;
            });
        },

        // Get info for a specific source under a specific IP version
        getSource(version, id) {
            this.verifyVersionOrThrow(version);
            return this.data[version].sources[id];
        },

        // Get info for all sources under a specific IP version
        getSources(version) {
            this.verifyVersionOrThrow(version);
            return this.data[version].sources;
        },

        // Restore original version and source data (version parameter is optional)
        restoreData(version) {
            // Object.assign makes a shallow copy; nested objects are copied as references.
            // Use stringify & parse for a very basic deep clone.
            if (version) {
                this.verifyVersionOrThrow(version);
                this.data[version] = JSON.parse(JSON.stringify(this.defaultData[version]));
            } else {
                this.data = JSON.parse(JSON.stringify(this.defaultData));
            }
        },
    };

    // Save a read-only copy of the source data in case a restore is requested.
    // This is a bit clumsy, but safe as long as id properties remain basic types
    // like string, number, and boolean.
    sourceInfo.defaultData = (() => {
        var setPropertiesReadOnly = (obj) => {
            Object.keys(obj).forEach((key) => {
                if (typeof obj[key] === 'object')
                    setPropertiesReadOnly(obj[key]);
                Object.defineProperty(obj, key, { writable: false });
            });
        };

        // Object.assign makes a shallow copy; nested objects are copied as references.
        // Use stringify & parse for a very basic deep clone.
        var data = JSON.parse(JSON.stringify(sourceInfo.data));
        setPropertiesReadOnly(data);
        return data;
    })();
    Object.defineProperty(sourceInfo, 'defaultData', { writable: false });
}

/**
 * Create promises from storage get/set callback functions
 */

/**
 * Returns the value of a stored option
 * @param {string} option Option name
 * @returns {Promise} Resolves to option value {mixed} (no rejection)
 */
function getOption(option) {
    return getOptions([option]).then((stg) => stg[option]);
}

/**
 * Returns the values of multiple stored options
 * @param {array} options Option names
 * @returns {Promise} Resolves to option values {object} (no rejection)
 */
function getOptions(options) {
    return new Promise ((resolve) => {
        chrome.storage.sync.get(options, resolve);
    });
}

/**
 * Sets the value of an option in storage
 * @param {string} option Option name
 * @param {mixed} value Option value
 * @returns {Promise} Resolves with undefined (no rejection)
 */
function setOption(option, value) {
    return setOptions({[option]: value});
}

/**
 * Sets the value of multiple options in storage
 * @param {object} options Option names and values
 * @returns {Promise} Resolves with undefined (no rejection)
 */
function setOptions(options) {
    storageChangeHandler.status = false;
    return new Promise ((resolve) => {
        chrome.storage.sync.set(options, () => {
            storageChangeHandler.status = true;
            resolve();
        });
    });
}

/**
 * Remove legacy options from localStorage (not enough worth carrying forward)
 * and either apply options from parameter or get settings from chrome.storage
 */
function applyOptions(options) {
    // Remove legacy options
    if (Object.keys(localStorage).length > 0)
        localStorage.clear();

    var knownOptions = getKnownOptions();
    var optionsPromise = options === undefined ? getOptions(knownOptions) : Promise.resolve(options);

    optionsPromise
    .then((options) => {
        var states = options.version_states;
        if (typeof states === 'object') {
            Object.keys(states).forEach((key) => {
                if (sourceInfo.data.hasOwnProperty(key))
                    sourceInfo.data[key].enabled = states[key];
            });
        }

        var versions = Object.keys(sourceInfo.data);
        versions.forEach((version) => {
            var states = options['source_states_' + version];
            if (typeof states === 'object') {
                Object.keys(states).forEach((key) => {
                    if (sourceInfo.data[version].sources.hasOwnProperty(key))
                        Object.assign(sourceInfo.data[version].sources[key], states[key]);
                });
            }
        });
    });
}

/**
 * Get an array of all known options in storage
 */
function getKnownOptions() {
    var knownOptions = [
        'version_states',
    ];

    var versions = Object.keys(sourceInfo.data);
    versions.forEach((version) => {
        knownOptions.push('source_states_' + version);
    });

    return knownOptions;
}

/**
 * Handle storage change events and notify Options page
 * so it can refresh.
 */
function storageChangeHandler(changes, namespace) {
    if (storageChangeHandler.status === undefined)
        storageChangeHandler.status = true;
    else if (!storageChangeHandler.status)
        return;

    if (namespace !== 'sync')
        return;

    var knownOptions = getKnownOptions();
    var updatedOptions = {};
    for (let change in changes) {
        if (changes.hasOwnProperty(change) && knownOptions.indexOf(change) >= 0)
            updatedOptions[change] = changes[change].newValue;
    }

    if (Object.keys(updatedOptions).length > 0) {
        console.log('New settings available from sync storage:\n', updatedOptions);
        applyOptions(updatedOptions);
        chrome.runtime.sendMessage({
            cmd: 'settings_updated',
        });
    }
}

/**
 * Listen for shortcuts: https://developer.chrome.com/apps/commands
 */
chrome.commands.onCommand.addListener((command) => {
    switch (command) {
        case 'quick-copy-ipv4':
            copyIpToClipboard('v4');
            break;
        case 'quick-copy-ipv6':
            copyIpToClipboard('v6');
            break;
        default:
            break;
    }
});

/**
 * Request an IP and copy it to the clipboard in the background
 */
function copyIpToClipboard(version) {
    sourceInfo.verifyVersionOrThrow(version);

    var ids = sourceInfo.getOrderedEnabledIds(version);
    if (ids.length === 0)
        ids = [sourceInfo.getDefaultId(version)];

    requestIP(version, ids, 0)
    .then(writeToClipboard)
    .catch(error => console.log('copyIpToClipboard: Unable to complete request\n', error));
}

/**
 * Fetch an IP, cycling through ordered sources whenever a request fails
 * until all enabled sources are exhausted
 */
function requestIP(version, ids, attempt) {
    sourceInfo.verifyVersionOrThrow(version);

    if (attempt >= ids.length)
        return Promise.reject('requestIP: Attempt #' + attempt + ' exceeds number of enabled sources; network down?');

    var urls = ids.map(id => sourceInfo.getSource(version, id).url);
    var url = urls[attempt];
    console.log('requestIP: Checking source ' + url);

    // Prepare for next iteration, if necessary
    attempt += 1;

    return fetch(url, {cache: 'no-store'})
    .then(response => response.text())
    .then(ip => {
        ip = ip.trim();
        if (!ip) {
            console.log('requestIP: Invalid response from ' + url);
            return requestIP(version, ids, attempt);
        }
        return ip;
    })
    .catch(error => {
        console.log('requestIP: Request failed for ' + url + '\n', error);
        return requestIP(version, ids, attempt);
    });
}

/**
 * Copy a string to the clipboard
 */
function writeToClipboard(str) {
    // navigator.clipboard.writeText doesn't work since non-active-tab
    console.log('writeToClipboard: Contents: "' + str + '"');
    document.oncopy = function (event) {
        event.clipboardData.setData('text/plain', str);
        event.preventDefault();
    };
    document.execCommand('copy', false, null);
}
