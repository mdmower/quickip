/*
	Copyright (C) 2014 Matthew D. Mower

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

document.addEventListener('DOMContentLoaded', function () {
  checkForSettings();
}, false);

function checkForSettings() {
  if(typeof localStorage["ip_source_order"] == 'undefined') {
    localStorage["ip_source_order"] = srcs.join(',');
  }

  for (var i = 0; i < srcs.length; i++) {
    if (typeof localStorage["cb_" + srcs[i]] == 'undefined') {
      if (srcs[i] == "dyn") {
        localStorage["cb_" + srcs[i]] = true;
      } else {
        localStorage["cb_" + srcs[i]] = false;
      }
    }
  }
}

// chrome.commands
// To Do: unify most of this so it's only in one location

chrome.commands.onCommand.addListener(function(command) {
  console.log('QuickIP:', command);
  copyIpToClipboard();
});

function copyIpToClipboard() {
  var es = getEnabledSources();
  var so = getSourceOrder();

  if (es.length <= 0 || so.length <= 0) {
    console.log('QuickIP:', "No IP sources");
    return;
  }

  var finalSources = [];
  for (var i = 0; i < so.length; i++) {
    if (es.indexOf(so[i]) >= 0) {
      finalSources.push(so[i]);
    }
  }

  if (finalSources.length <= 0) {
    console.log('QuickIP:', "No IP sources");
    return;
  }

  requestIP(finalSources, 0);
}

function getEnabledSources() {
  var enabledSources = [];
  for (var i = 0; i < srcs.length; i++) {
    ipsrc = localStorage["cb_" + srcs[i]];
    if (ipsrc === 'true') {
      enabledSources.push(srcs[i]);
    }
  }

  var curl = localStorage["custom_url"];
  var curlIndex = enabledSources.indexOf("customurl");
  
  if ((typeof curl == 'undefined' || curl == "") && curlIndex >= 0) {
    enabledSources.splice(curlIndex, 1);
  }

  return enabledSources;
}

function getSourceOrder() {
  var src = [];
  var srcsStored = localStorage["ip_source_order"];
  if (typeof srcsStored != 'undefined') {
    src = checkSrcOrder(srcsStored);
  } else {
    src = srcs;
  }

  // Update stored sources in case changes occurred
  localStorage["ip_source_order"] = src.join(",");

  return src;
}

function checkSrcOrder(list) {
  var src = list.split(',');

  // Remove non-existent sources
  for (i = 0; i < src.length; i++) {
    if (srcs.indexOf(src[i]) < 0) {
      src.splice(i, 1);
      i--;
    }
  }

  // Remove duplicate sources without sorting
  var sourcename = "";
  for (i = 0; i < src.length; i++) {
    sourcename = src[i];
    src = $.grep(src, function(n, j) {
      return n != src[i];
    });
    src.splice(i, 0, sourcename);
  }

  // Add missing sources
  if (src.length < srcs.length) {
    for (i = 0; i < srcs.length; i++) {
      if (src.indexOf(srcs[i]) < 0) {
        src.push(srcs[i]);
      }
    }
  }

  return src;
}

function getIPv4(str) {
  return str.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
}

function requestIP(sources, attempt) {
  if(attempt >= sources.length) {
    console.log('QuickIP:', "Network down?");
    return;
  }

  var src = sources[attempt];
  var url = srcInfo(src)[0];
  if (src == "customurl") {
    url = localStorage["custom_url"];
  }

  console.log('QuickIP:', "Checking source " + (++attempt));
  $.ajax({
    type: 'GET',
    url: url,
    success: function(data) {
      var ip = getIPv4(data);
      if (ip == null) {
        console.log('QuickIP:', "Malformed response");
        setTimeout(function() {
          requestIP(sources, attempt);
        }, 500);
      } else {
        reportAndCopyIP(ip[0]);
      }
    },
    error: function() {
      requestIP(sources, attempt);
    }
  });
}

function reportAndCopyIP(ip) {
  console.log('QuickIP:', "IP found: " + ip);

  var elm = $('<input/>');
  elm.attr({ id: "dummyelm", type: "text"});
  elm.val(ip);
  $('body').append(elm);
  elm.select();
  document.execCommand('copy');
  elm.remove();
}