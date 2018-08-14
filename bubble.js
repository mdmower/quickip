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

document.addEventListener('DOMContentLoaded', function () {
    initOutputs();
    startListeners();
    insertIP();
}, false);

/**
 * Create elements from templates for bubble
 */
function initOutputs() {
    sourceInfo.getVersions().forEach((version) => {
        var versionData = sourceInfo.getVersionData(version);
        if (!versionData.enabled)
            return;

        // Append outputs to container
        var template = document.getElementById('output-template');
        var clone = document.importNode(template.content, true);
        clone.querySelector('label span').innerHTML = versionData.name;
        var dataSelectors = 'input,button';
        Array.from(clone.querySelectorAll(dataSelectors)).forEach((elm) => {
            elm.setAttribute('data-version', version);
        });
        document.getElementById('container').appendChild(clone);
    });
    document.querySelector('button').focus();
}

/**
 * Listen for 'Copy' button clicks
 */
function startListeners() {
    Array.from(document.querySelectorAll('button')).forEach((button) => {
        button.addEventListener('click', copyIP);
    });
}

/**
 * For each enabled IP version, request an IP address and insert
 * it into the bubble output (<input readonly>)
 */
function insertIP() {
    sourceInfo.getVersions().forEach((version) => {
        var versionData = sourceInfo.getVersionData(version);
        if (!versionData.enabled)
            return;

        var ids = sourceInfo.getOrderedEnabledIds(version);
        if (ids.length === 0)
            ids = [sourceInfo.getDefaultId(version)];

        var input = document.querySelector('input[data-version="' + version + '"]');
        chrome.extension.getBackgroundPage().requestIP(version, ids, 0)
        .then((ip) => {
            input.value = ip;
            if (version === 'v6')
                input.setAttribute('size', '39');
        })
        .catch((error) => {
            console.log('insertIP (version ' + version + '): Unable to complete request\n', error);
            input.value = '';
            input.placeholder = 'Not Found';
        });
    });
}

/**
 * Handle 'Copy' button clicks to write an IP to the clipboard
 */
function copyIP(event) {
    var version = event.target.getAttribute('data-version');
    var input = document.querySelector('input[data-version="' + version + '"]');
    if (input.value) {
        console.log('copyIP: Contents: "' + input.value + '"');
        navigator.clipboard.writeText(input.value)
        .catch((error) => {
            console.log('navigator.clipboard.writeText did not succeed; using fallback method\n', error);
            document.oncopy = function (event) {
                event.clipboardData.setData('text/plain', input.value);
                event.preventDefault();
            };
            document.execCommand('copy', false, null);
        });

        // User feedback
        input.style.color = 'blue';
        setTimeout(() => {
            input.style.color = '';
        }, 300);
    }
}
