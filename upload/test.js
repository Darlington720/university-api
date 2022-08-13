var moment = require("moment");

var m = moment("2022-08-08", "YYYY-MM--DD");

// m.add(2, "h");

var m2 = moment("2022-08-8", "YYYY-MM--DD");
// moment("2010-10-20").isBefore("2010-10-21");
console.log(moment.duration(m2.diff(m))._data);
// console.log(m2.is);

// console.log(m2.toString());
