var moment = require("moment");

// var m = moment("2022-08-08", "YYYY-MM--DD");

// // m.add(2, "h");

// var m2 = moment("2022-08-8", "YYYY-MM--DD");
// // moment("2010-10-20").isBefore("2010-10-21");
// console.log(moment.duration(m2.diff(m))._data);
// // console.log(m2.is);

// console.log(m2.toString());

// var stu_id = "hfhfhdghxgh cghghjhdghdgh2100101531";

// var enhanced = stu_id.replace("http://", "");

// var enhanced2 = stu_id.replace(/[^\d]+/g, "");

// console.log(stu_id);
// console.log("Enhanced2", enhanced2);

var a = moment("11:31:04PM", "h:mm:ssA");
var b = moment("4:50:41PM", "h:mm:ssA");
// const result = b.diff(a, "minutes");
// console.log("result =", result);
const result2 = b.diff(a);
console.log("result2 =", moment.duration(result2).humanize());
