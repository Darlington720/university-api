const { create } = require("apisauce");
const baseIp = "192.168.42.28";
const port = 9000;

const api = create({
  baseURL: "https://student.nkumbauniversity.ac.ug/bridge",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
    "Content-Type": "text/plain",
    Cookie:
      "ai=30363563313466623066396439336533353436303766666536386261306661667C7C6E6B756D6261; as=36343331666338363733323138393964363234383535363735353061666139627C7C32303030313031303431; asc=47790cd01e78aca6ae9915f7077e1604; ast=131efb6f-e27b-4a63-b938-e9068b896db1-1669587392",
  },
});

module.exports = {
  baseIp,
  port,
  api,
};
