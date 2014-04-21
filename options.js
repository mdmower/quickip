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
  initListElements();
  getIpSourceSelection();
  sortifyList();
  startListeners();
}, false);

function initListElements() {
  var src = [];
  var srcsStored = localStorage["ip_source_order"];
  if (typeof srcsStored != 'undefined') {
    src = checkSrcOrder(srcsStored);
  } else {
    src = srcs;
  }

  // Update stored sources in case changes occurred
  localStorage["ip_source_order"] = src.join(",");

  for (var i = 0; i < src.length; i++) {
    $("#ip_source_list").append(htmlListSrc(src[i]));
  }

  var curl = localStorage["custom_url"];
  if (typeof curl != 'undefined') {
    $("#custom_url_input").val(curl);
  } else {
    localStorage["custom_url"] = "";
  }
}

function getIpSourceSelection() {
  var ipsrc;
  for (var i = 0; i < srcs.length; i++) {
    ipsrc = localStorage["cb_" + srcs[i]];
    if (typeof ipsrc != 'undefined') {
      var onoff = (ipsrc === 'true');
      $("#cb_" + srcs[i]).prop('checked', onoff);
    } else {
      $("#cb_" + srcs[i]).prop('checked', false);
    }
  }

  if ($(".ip_checkbox:checked").length == 0) {
    $("#cb_" + srcs[1]).prop('checked', true);
    saveIpSourceSelection();
  }
}

function sortifyList() {
  $("ol.sortable_list").sortable({
    group: 'ip-sources',
    handle: 'div.icon-move',
    onDrop: function  (item, targetContainer, _super) {
      saveOptions("ip_source_order")
      _super(item)
    }
  })
}

function startListeners() {
  $("#custom_url_input").change(function() {
    saveOptions("custom_url");
  });
  $(".ip_checkbox").change(function() {
    if(this.value == "customurl") {
      if (validateUrlInput() == "valid") {
        checkSourcePermissions(this.value);
      }
    } else {
      checkSourcePermissions(this.value);
    }
  });
  $("#enable_all a").click(function() {
    setBulkPermissions();
  });
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

function saveIpSourceSelection() {
  for (var i = 0; i < srcs.length; i++) {
    localStorage["cb_" + srcs[i]] = $("#cb_" + srcs[i]).prop('checked');
  }
}

function saveOptions(item) {
  switch(item) {
  case "custom_url": // save regardless of validity
    localStorage["custom_url"] = $("#custom_url_input").val();
    validateUrlInput();
    break;
  case "ip_source_order":
    localStorage["ip_source_order"] = getIpSourceOrder();
    showNotice("saved");
    break;
  case "ip_source_onoff":
    saveIpSourceSelection();
    showNotice("saved");
    break;
  }
}

function getIpSourceOrder() {
  var ipso = [];
  var listelms = $("#ip_source_list").children();
  for (var i = 0; i < listelms.length; i++) {
    ipso.push(listelms[i].id);
  }
  return ipso.join(',');
}

function validateUrlInput() {
  var textinput = $("#custom_url_input").val();
  var urlregex = new RegExp("^(http|https|ftp)\://"); // not comprehensive
  var ret = "";

  if (textinput == "") {
    ret = "empty";
    $("#cb_customurl").prop('checked', false);
    showNotice("empty_url");
  } else if (urlregex.test(textinput)) {
    ret = "valid";
    showNotice("saved");
  } else {
    ret = "invalid";
    $("#cb_customurl").prop('checked', false);
    showNotice("invalid_url");
  }

  return ret;
}

function checkSourcePermissions(source) {
  var chkd = $("#cb_" + source).prop('checked');

  var ipPerm = [];
  if (source == "customurl") {
    ipPerm.push("http://*/");
    ipPerm.push("https://*/");
  } else {
    ipPerm.push(srcInfo(source)[2]);
  }

  if(chkd) {
    chrome.permissions.request({
      origins: ipPerm
    }, function(granted) {
      if(granted) {
        reportSourcePermissions(source, "enable", true);
      } else {
        reportSourcePermissions(source, "enable", false);
      }
    });
  } else {
    chrome.permissions.remove({
      origins: ipPerm
    }, function(removed) {
      if (removed) {
        reportSourcePermissions(source, "disable", true);
      } else {
        reportSourcePermissions(source, "disable", false);
      }
    });
  }
}

function setBulkPermissions() {
  var ipPerm = [];
  ipPerm.push("http://*/");
  ipPerm.push("https://*/");

  chrome.permissions.request({
    origins: ipPerm
  }, function(granted) {
    if(granted) {
      reportBulkPermissions(true);
    } else {
      reportBulkPermissions(false);
    }
  });
}

function reportSourcePermissions(source, onoff, success) {
  switch(onoff) {
  case "enable":
    if (!success) {
      $("#cb_" + source).prop('checked', false);
      showNotice("perm_cancel");
      return;
    }
    break;
  case "disable":
    // Allow checkbox to be unselected, even if perm not removed
    break;
  }
  saveOptions("ip_source_onoff");
}

function reportBulkPermissions(success) {
  if (success) {
    $(".ip_checkbox:not(:checked)").prop('checked', true);
    validateUrlInput();
    saveOptions("ip_source_onoff");
  } else {
    showNotice("perm_cancel");
  }
}

function showNotice(message) {
  $.when(setupNotice(message)).done(function() {
     resetStatus();
  });
}

function setupNotice(message) {
  $("#status").stop(true);
  var dfd = new jQuery.Deferred();
  switch(message) {
  case "saved":
    $("#status").css("display", "none");
    $("#status").css("color", "DarkGreen");
    $("#status").html("Saved");
    $("#status").fadeIn(300).delay(1400).fadeOut(300);
    break;
  case "invalid_url":
    $("#status").css("display", "none");
    $("#status").css("color", "DarkRed");
    $("#status").html("Invalid URL");
    $("#status").fadeIn(300).delay(1400).fadeOut(300);
    break;
  case "empty_url":
    $("#status").css("display", "none");
    $("#status").css("color", "DarkRed");
    $("#status").html("No URL entered");
    $("#status").fadeIn(300).delay(1400).fadeOut(300);
    break;
  case "perm_cancel":
    $("#status").css("display", "none");
    $("#status").css("color", "#cc9900");
    $("#status").html("Permissions request canceled");
    $("#status").fadeIn(300).delay(1400).fadeOut(300);
    break;
  }
  setTimeout(function() {
    dfd.resolve();
  }, 2020);
  return dfd.promise();
}

function resetStatus() {
  $("#status").fadeIn(100);
  $("#status").css("color", "black");
  $("#status").html("Idle");
}

function htmlListSrc(ipsrc) {
  var li = '';
  if (ipsrc != "customurl") {
    var l = $('<li>');
    l.attr({ id: ipsrc });
    var d = $('<div>').addClass("icon-move");
    var i = $('<input/>').addClass("ip_checkbox");
    i.attr({ type: "checkbox", id: "cb_" + ipsrc, value: ipsrc });
    var a = $('<a>').addClass("ip_link");
    a.attr({ href: srcInfo(ipsrc)[0], target: '_blank' });
    a.html(srcInfo(ipsrc)[1]);
    li = l.append([d,i,a]);
  } else {
    var l = $('<li>');
    l.attr({ id: ipsrc });
    var d = $('<div>').addClass("icon-move");
    var ia = $('<input/>').addClass("ip_checkbox");
    ia.attr({ type: "checkbox", id: "cb_" + ipsrc, value: ipsrc });
    var ib = $('<input/>').addClass("ip_input");
    ib.attr({ type: "text", id: "custom_url_input", placeholder: "custom url" });
    li = l.append([d,ia,ib]);
  }
  return li;
}