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