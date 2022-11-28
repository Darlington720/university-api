const { create } = require("apisauce");
const baseIp = "192.168.1.101";
const port = 9000;

const api = create({
  baseURL: "https://student.nkumbauniversity.ac.ug/bridge",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/11.10 Chromium/27.0.1453.93 Chrome/27.0.1453.93 Safari/537.36",
    "Content-Type": "text/plain",
    Cookie:
      "ai=37346430653966623537323235646561643261613335396262333266356365657C7C6E6B756D6261; as=30643632313836336434626131663065613437656462656365663031353666617C7C32303030313031303431; asc=98c893896b3c54cb033c6a10922f0113; ast=455f7c6e-4822-4d11-8c04-d41c1f2fc5d6-1669651298",
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
