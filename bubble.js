document.addEventListener('DOMContentLoaded', function () {
	startListeners();
	insertIP();
}, false);

function startListeners() {
	jQuery("#copyButton").click(function() {   
		copyIP();
	});
}

function getIP(str) {
	return str.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
}

function insertIP() {
	xmlhttp=new XMLHttpRequest();
	xmlhttp.onreadystatechange=function() {
		if(xmlhttp.readyState==4 && xmlhttp.status==200) {
			var str = xmlhttp.responseXML.body.innerHTML;
			jQuery("#textOut").val(getIP(str));
		}
	}
	xmlhttp.open("GET","http://checkip.dyndns.org/",true);
	xmlhttp.responseType = "document";
	xmlhttp.send();
}

function copyIP() {
	jQuery("#textOut").select();
    document.execCommand('copy');
	window.close();
}
