const { create } = require("apisauce");
const baseIp = "192.168.42.28";
const port = 9000;

const api = create({
  baseURL: "https://student.nkumbauniversity.ac.ug/bridge",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/11.10 Chromium/27.0.1453.93 Chrome/27.0.1453.93 Safari/537.36",
    "Content-Type": "text/plain",
    Cookie:
      "ai=36346137303632376436356530643264346332373531666564643336356336347C7C6E6B756D6261; as=36396435303764646230333563353530336232373136663363653737643566627C7C32303030313031303431; asc=6c5d3b7d671fd0794f857ae9c42fe6c0; ast=35fe8a51-cebc-458f-879d-b19056b158d5-1669662571",
  },
});
const authApi = create({
  baseURL: "https://student.nkumbauniversity.ac.ug/bridge",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/11.10 Chromium/27.0.1453.93 Chrome/27.0.1453.93 Safari/537.36",
    "Content-Type": "text/plain",
    Cookie:
      "ai=64613931303335623536653534396262636331343863323936663839363631327C7C6E6B756D6261; as=64663037386462636238303562333039623633633438646634366537633031367C7C32303030313031303431; asc=92dbca2fc1052703619e9cfcb61bc810; ast=f5e8aeaa-9a31-45a3-af67-f76b97311779-1669651773",
  },
});

module.exports = {
  baseIp,
  port,
  api,
  authApi,
};
