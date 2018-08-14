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

var sourceInfo = chrome.extension.getBackgroundPage().sourceInfo;
// var getOption = chrome.extension.getBackgroundPage().getOption;
// var getOptions = chrome.extension.getBackgroundPage().getOptions;
// var setOption = chrome.extension.getBackgroundPage().setOption;
var setOptions = chrome.extension.getBackgroundPage().setOptions;

document.addEventListener('DOMContentLoaded', function () {
    initSourceLists();
    initVersionOptions();
    sortifyList();
    toggleListeners(true);
    document.getElementById('extensionVersion').innerHTML = chrome.app.getDetails().version;
}, false);

/**
 * Listen for messages from the background
 */
chrome.runtime.onMessage.addListener(function(request) {
    switch (request.cmd) {
    case 'settings_updated':
        notify('Updated settings are available. Please refresh this page.', true);
        break;
    default:
        break;
    }
});

/**
 * Make sure text is safe for insertion into innerHTML
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Prepare and show a modal with a message. If 'refresh' is true,
 * then a Refresh button is shown instead of 'OK' and the user must
 * refresh the page.
 */
function notify(msg, refresh) {
    var notifyElement = document.getElementById('notify');
    notifyElement.querySelector('.msg').innerHTML = escapeHtml(msg);
    var button = notifyElement.querySelector('button');

    function reload(event) {
        location.reload();
    }

    function closeModal(event) {
        if ((event.type === 'keyup' && event.key === 'Escape') ||
                (event.type === 'click' && event.target === button)) {
            notifyElement.style.display = 'none';
            document.removeEventListener('keyup', closeModal);
        }
    }

    if (refresh) {
        button.innerHTML = 'Refresh';
        button.onclick = reload;
    } else {
        button.innerHTML = 'OK';
        button.onclick = closeModal;
        document.addEventListener('keyup', closeModal);
    }

    notifyElement.style.display = 'block';
    button.focus();
}

/**
 * Create version selection from template
 */
function initVersionOptions() {
    var versions = sourceInfo.getVersions();
    versions.forEach((version) => {
        var versionData = sourceInfo.getVersionData(version);

        // Append version options
        var template = document.getElementById('version_states_template');
        var clone = document.importNode(template.content, true);
        clone.querySelector('label').innerHTML += versionData.name;
        clone.querySelector('input').setAttribute('data-version', version);
        clone.querySelector('input').checked = versionData.enabled;
        document.getElementById('version-states-container').appendChild(clone);
    });
}

/**
 * Create source list from template
 */
function initSourceLists() {
    var versions = sourceInfo.getVersions();
    versions.forEach((version) => {
        var versionData = sourceInfo.getVersionData(version);

        // Append list container to page
        var template = document.getElementById('list-container-template');
        var clone = document.importNode(template.content, true);
        clone.querySelector('.title').innerHTML += versionData.name;
        var dataSelectors = '.list-container,.enable-all,.sortable';
        Array.from(clone.querySelectorAll(dataSelectors)).forEach((elm) => {
            elm.setAttribute('data-version', version);
        });
        document.getElementById('sources-container').appendChild(clone);

        // Populate <ul> with sources
        var sources = sourceInfo.getOrderedIds(version).map(id => sourceInfo.getSource(version, id));
        var sourceList = document.querySelector('.sortable[data-version="' + version + '"]');
        sources.forEach((source) => {
            sourceList.appendChild(generateSourceListItem(version, source));
        });
    });
}

/**
 * Create source option from template
 */
function generateSourceListItem(version, source) {
    var template = document.getElementById('sortable_li_template');
    var clone = document.importNode(template.content, true);

    var dataSelectors = 'li,.handle,input,a';
    Array.from(clone.querySelectorAll(dataSelectors)).forEach((elm) => {
        elm.setAttribute('data-version', version);
        elm.setAttribute('data-id', source.id);
    });

    if (source.enabled)
        clone.querySelector('input').setAttribute('checked', '');

    var a = clone.querySelector('a');
    a.setAttribute('href', source.url);
    a.innerHTML = source.name;

    return clone;
}

/**
 * Make source lists sortable
 */
function sortifyList() {
    Array.from(document.querySelectorAll('ul.sortable')).forEach((list) => {
        new Sortable(list, {
            ghostClass: 'ui-sortable-placeholder',
            onUpdate: saveOptions,
        });
    });
}

/**
 * Toggle all sources to enabled for a specific IP version
 */
function enableAllSources(event) {
    var version = event.target.getAttribute('data-version');
    Array.from(document.querySelectorAll('#sources-container input[data-version="' + version + '"]')).forEach((input) => {
        input.checked = true;
    });
    saveOptions();
}

/**
 * Handle link to extension shortcut options (<a> not allowed)
 */
function openShortcutsConfig(event) {
    event.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

/**
 * Restore all settings to defaults
 */
function restoreDefaults() {
    sourceInfo.restoreData();
    // If any settings are stored, this will trigger the refresh modal
    chrome.storage.sync.clear();
}

/**
 * Map element selectors to events and callbacks
 */
var listenerMap = [
    { selector: '#version-states-container input[name="version_states"]', event: 'change', callback: saveOptions },
    { selector: '#sources-container input[data-id]', event: 'change', callback: saveOptions },
    { selector: '#sources-container .enable-all', event: 'click', callback: enableAllSources },
    { selector: '#keyboard-shortcut-config', event: 'click', callback: openShortcutsConfig },
    { selector: '#restore-defaults', event: 'click', callback: restoreDefaults },
];

/**
 * Toggle all event listeners on/off
 */
function toggleListeners(enable) {
    listenerMap.forEach((listenerData) => {
        Array.from(document.querySelectorAll(listenerData.selector)).forEach((elm) => {
            if (enable)
                elm.addEventListener(listenerData.event, listenerData.callback);
            else
                elm.removeEventListener(listenerData.event, listenerData.callback);
        });
    });
}

/**
 * Save all options to storage
 */
function saveOptions() {
    toggleListeners(false);
    var options = {};

    sourceInfo.getVersions().forEach((version) => {
        var sourceOrder = getSourceOrder(version);
        var enabledSources = getEnabledSources(version);
        if (enabledSources.length === 0) {
            var defaultId = sourceInfo.getDefaultId(version);
            var defaultSource = sourceInfo.getSource(version, defaultId);
            enabledSources.push(defaultId);
            document.querySelector('#sources-container input[data-version="' + version + '"][data-id="' + defaultId + '"]').checked = true;
            notify('At least one source must be enabled for each IP version. "' + defaultSource.name + '" has been automatically enabled.');
        }

        var states = {};
        sourceOrder.forEach((id, index) => {
            states[id] = {
                order: index,
                enabled: enabledSources.indexOf(id) >= 0,
            };
            if (sourceInfo.data[version].sources.hasOwnProperty(id))
                Object.assign(sourceInfo.data[version].sources[id], states[id]);
        });
        options['source_states_' + version] = states;
    });

    var versionStates = {};
    if (document.querySelectorAll('#version-states-container input:checked').length === 0) {
        var defaultVersion = sourceInfo.getDefaultVersion();
        var defaultVersionData = sourceInfo.getVersionData(defaultVersion);
        document.querySelector('#version-states-container input[data-version="' + defaultVersion + '"]').checked = true;
        notify('At least one IP version must be enabled. "' + defaultVersionData.name + '" has been automatically enabled.');
    }
    Array.from(document.querySelectorAll('#version-states-container input')).forEach((input) => {
        var version = input.getAttribute('data-version');
        versionStates[version] = input.checked;
        if (sourceInfo.data.hasOwnProperty(version))
            sourceInfo.data[version].enabled = input.checked;
    });
    options.version_states = versionStates;

    setOptions(options)
    .then(() => toggleListeners(true));
}

/**
 * Get the order of sources for a specific IP version from the page
 */
function getSourceOrder(version) {
    return Array.from(document.querySelectorAll('#sources-container li[data-version="' + version + '"]'))
    .map(li => li.getAttribute('data-id'));
}

/**
 * Get the enabled sources for a specific IP version from the page
 */
function getEnabledSources(version) {
    return Array.from(document.querySelectorAll('#sources-container input[data-version="' + version + '"]'))
    .filter(input => input.checked)
    .map(input => input.getAttribute('data-id'));
}
