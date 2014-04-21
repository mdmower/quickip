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
  switch (ipsrc) {
  case "checkip":
    ipurl = "http://www.checkip.org";
    ipname = "CheckIP";
    ipperm = "http://www.checkip.org/";
    break;
  case "dyn":
    ipurl = "http://checkip.dyndns.org";
    ipname = "Dyn";
    ipperm = "http://checkip.dyndns.org/";
    break;
  case "icanhazip":
    ipurl = "http://ipv4.icanhazip.com";
    ipname = "ICanHazIP";
    ipperm = "http://ipv4.icanhazip.com/";
    break;
  case "ifconfig":
    ipurl = "http://ifconfig.me/ip";
    ipname = "IfConfig";
    ipperm = "http://ifconfig.me/";
    break;
  default:
    break;
  }
  return [ ipurl, ipname, ipperm ];
}