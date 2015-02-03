var srcs = [
  "checkip",
  "dyn",
  "icanhazip",
  "ifconfig",
  "customurl" ];

function srcInfo(ipsrc) {
  var ipurl = "";
  var ipname = "";
  var ipperm = "";
  var ipoptional = true;
  switch (ipsrc) {
  case "checkip":
    ipurl = "http://www.checkip.org";
    ipname = "CheckIP";
    ipperm = "http://www.checkip.org/";
    ipoptional = true;
    break;
  case "dyn":
    ipurl = "http://checkip.dyndns.org";
    ipname = "Dyn";
    ipperm = "http://checkip.dyndns.org/";
    ipoptional = false;
    break;
  case "icanhazip":
    ipurl = "http://ipv4.icanhazip.com";
    ipname = "ICanHazIP";
    ipperm = "http://ipv4.icanhazip.com/";
    ipoptional = true;
    break;
  case "ifconfig":
    ipurl = "http://ifconfig.me/ip";
    ipname = "IfConfig";
    ipperm = "http://ifconfig.me/";
    ipoptional = true;
    break;
  default:
    break;
  }
  return {
    url: ipurl,
    name: ipname,
    perm: ipperm,
    optional: ipoptional
  };
}