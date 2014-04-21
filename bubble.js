document.addEventListener('DOMContentLoaded', function () {
  startListeners();
  insertIP();
}, false);

function startListeners() {
  $("#copyButton").click(function() {
    copyIP();
  });
}

function insertIP() {
  var es = getEnabledSources();
  var so = getSourceOrder();

  if (es.length <= 0 || so.length <= 0) {
    $("#textOut").attr("placeholder", "No IP sources");
    return;
  }

  var finalSources = [];
  for (var i = 0; i < so.length; i++) {
    if (es.indexOf(so[i]) >= 0) {
      finalSources.push(so[i]);
    }
  }

  if (finalSources.length <= 0) {
    $("#textOut").attr("placeholder", "No IP sources");
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

// Duplicated from options.js
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

// Duplicated from options.js
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
    $("#textOut").val("Network down?");
    $("#textOut").blur();
    return;
  }

  var src = sources[attempt];
  var url = srcInfo(src)[0];
  if (src == "customurl") {
    url = localStorage["custom_url"];
  }

  $("#textOut").blur();
  $("#textOut").attr("placeholder", "Checking source " + (++attempt));
  $.ajax({
    type: 'GET',
    url: url,
    success: function(data) {
      var ip = getIPv4(data);
      if (ip == null) {
        $("#textOut").attr("placeholder", "Malformed response");
        setTimeout(function() {
          requestIP(sources, attempt);
        }, 500);
      } else {
        fillTextArea(ip[0]);
      }
    },
    error: function() {
      requestIP(sources, attempt);
    }
  });
}

function fillTextArea(ip) {
  $("#textOut").val(ip);
  $("#copyButton").focus();
}

function copyIP() {
  $("#textOut").select();
  document.execCommand('copy');
  window.close();
}