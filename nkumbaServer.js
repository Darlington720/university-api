const express = require("express");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");
const knex = require("knex");
const cors = require("cors");
const { cookie } = require("express/lib/response");
const req = require("express/lib/request");
const moment = require("moment");
const { sendPushNotifications } = require("./pushNotifications");
var { baseIp, port } = require("./config");
const { finished } = require("stream");

const upload = multer();
const app = express();
const secret = "mySecret";

var range = function (start, end, step) {
  var range = [];
  var typeofStart = typeof start;
  var typeofEnd = typeof end;

  if (step === 0) {
    throw TypeError("Step cannot be zero.");
  }

  if (typeofStart == "undefined" || typeofEnd == "undefined") {
    throw TypeError("Must pass start and end arguments.");
  } else if (typeofStart != typeofEnd) {
    throw TypeError("Start and end arguments must be of same type.");
  }

  typeof step == "undefined" && (step = 1);

  if (end < start) {
    step = -step;
  }

  if (typeofStart == "number") {
    while (step > 0 ? end >= start : end <= start) {
      range.push(start);
      start += step;
    }
  } else if (typeofStart == "string") {
    if (start.length != 1 || end.length != 1) {
      throw TypeError("Only strings with one character are supported.");
    }

    start = start.charCodeAt(0);
    end = end.charCodeAt(0);

    while (step > 0 ? end >= start : end <= start) {
      range.push(String.fromCharCode(start));
      start += step;
    }
  } else {
    throw TypeError("Only string and number types are supported");
  }

  return range;
};

//Each member should have a name, room, user_id, status_if_logged_in
let members = [];

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(upload.any());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

const database = knex({
  client: "mysql",
  connection: {
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "nkumba",
  },
});

const data = [
  "students",
  "students_biodata",
  "gates",
  "students_signin_book",
  "visitors",
  "campus",
  "staff_signin",
  "non_teaching_staff",
  "stu_signin",
  "constraints",
  "staff",
  "timetable",
  "lectures",
  "course_units",
  "users",
  "constraints",
  "Voters",
  "rooms",
  "exam_sessions",
  "modules",
  "study_time",
  "schools",
];

data.map((item) =>
  app.get(`/${item}`, (req, res) => {
    database
      // .orderBy("id")
      .select("*")
      .from(item)
      .then((data) => {
        res.send(data);
      });
  })
);

data.map((item) =>
  app.get(`/numof${item}`, (req, res) => {
    database
      // .orderBy("id")
      .select("*")
      .from(item)
      .then((data) => {
        res.send(`${data.length}`);
      });
  })
);

app.get(`/gates/:campus`, (req, res) => {
  const { campus } = req.params;
  console.log(req.params);
  database
    // .orderBy("id")
    .select("*")
    .from("gates")
    .join("campus", "gates.campus_id", "=", "campus.cam_id")
    .where({
      campus_id: campus,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get(`/studentBiodata/:stdno`, (req, res) => {
  const { stdno } = req.params;
  console.log(req.params);
  database
    // .orderBy("id")
    .select("*")
    .from("students_biodata")
    // .join("campus", "gates.campus_id", "=", "campus.cam_id")
    .where({
      stdno,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get(`/allCourseUnits/:course_code`, (req, res) => {
  const { course_code } = req.params;
  database
    // .orderBy("id")
    .select("*")
    .from("modules")
    .where({
      course_code: course_code,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get(`/numOfStaffClockIn`, (req, res) => {
  database
    // .orderBy("id")
    .select("*")
    .from("staff")
    .leftJoin("staff_signin", "staff.staff_id", "staff_signin.staff_id")
    // .count("staff_signin.staff_id")
    .then((data) => {
      // console.log("result againt", data);
      res.send(data);
    });
});

app.get(`/voters/:campus_id`, (req, res) => {
  const { campus_id } = req.params;
  database
    // .orderBy("id")
    .select(
      "name",
      "stdno",
      "r_time",
      "campus.campus_name",
      "voter_stdno",
      "userfull_name",
      "cam_id"
    )
    .from("voters")
    .leftJoin(
      "students_biodata",
      "voters.voter_stdno",
      "students_biodata.stdno"
    )
    .join("users", "voters.registered_by", "users.id")
    .join("campus", "voters.campus", "campus.campus_name")
    .where("campus.cam_id", "=", campus_id)
    .then((data) => {
      // console.log("result againt", data);
      res.send(data);
    });
});

app.get(`/studentsPerSchool/:school`, (req, res) => {
  const { school } = req.params;
  database
    // .orderBy("id")
    .select("*")
    .from("students_biodata")
    .where({
      facultycode: school,
    })
    .then((data) => {
      res.send(`${data.length}`);
    });
});

// app.post("/api/auth", (req, res) => {
//   const { username, email, password } = req.body;
//   console.log(username, password);
//   database
//     .select("*")
//     .where({
//       email: username,
//       password: password,
//     })
//     .from("users")
//     .then((user) => {
//       console.log(user[0]);
//       const token = jwt.sign(
//         {
//           id: user[0].id,
//           email: user[0].email,
//           name: user[0].username,
//           address: user[0].address,
//           fullName: user[0].fullname,
//           image: user[0].image,
//         },
//         secret
//       );
//       return res.json(token);
//     })
//     .catch((err) => {
//       return res.status(400).json({ error: "Invalid email or password" });
//     });
// });

app.get("/image/:id", (req, res) => {
  const { id } = req.params;
  //console.log("Id", id);
  console.log("Current directory", __dirname);
  // res.send("http://10.7.0.22:9000/assets/jacket.jpg");

  fs.readFile(
    __dirname + `/public/assets/${id.toUpperCase()}.jpg`,
    (err, data) => {
      if (err) {
        res.sendFile(__dirname + `/public/assets/ph2.jpg`);
      } else {
        res.sendFile(__dirname + `/public/assets/${id.toUpperCase()}.jpg`);
      }
    }
  );
  // try {
  //   res.sendFile(__dirname + `/public/assets/${id}.jpg`);
  // } catch (error) {
  //   res.sendFile(__dirname + `/public/assets/akampa.jpg`);
  // }
});

app.get("/getFees", (req, res) => {
  database
    // .orderBy("id")
    .select("*")
    .from("fees_structure")
    .join(
      "nationality",
      "fees_structure.nationality_id",
      "=",
      "nationality.nationality_id"
    )
    .join("sessions", "fees_structure.session_id", "=", "sessions.session_id")
    .join("schools", "fees_structure.school_id", "=", "schools.school_id")
    .join("levels", "fees_structure.levels_id", "=", "levels.level_id")
    .then((data) => {
      res.send(data);
    });
});

app.post("/addAllMyCourseUnits", (req, res) => {
  const { stu_no, course_id, course_name, course_code } = req.body;
  let status = false;
  // console.log("sent course unit", req.body);
  database
    // .orderBy("id")
    .select("*")
    .from("stu_selected_course_units")
    // .join(
    //   "modules",
    //   "stu_selected_course_units.course_id",
    //   "=",
    //   "modules.course_id"
    // )
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })
    .then((data) => {
      data.forEach((item) => {
        if (item.course_id == course_id) {
          res.send(
            `${item.course_name} already added, Please Choose another one`
          );
          status = true;
        }
      });
      if (status == false) {
        if (data.length >= 8) {
          // console.log("the course units", data);
          // console.log("length of selected course units", data.length);
          res.send("Maximum number of course units selected");
        } else {
          database("stu_selected_course_units")
            .insert({
              stu_id: stu_no,
              course_id: course_id,
              course_name: course_name,
              course: course_code,
            })
            .then((data) => {
              res.send("Course Unit added Successfully");
            })
            .catch((err) => res.send(err));
        }
      }
    });

  // res.send("Received the data");
});

app.post("/removeSelectedCourseUnit", (req, res) => {
  const { stu_id, course_id } = req.body;
  // console.log("data", req.body);
  database("stu_selected_course_units")
    .where("stu_id", stu_id)
    .andWhere("course_id", course_id)
    .del()
    .then((data) => {
      res.send("Course Unit deleted Successfully");
    });
});

app.post("/addConstraint", (req, res) => {
  const { name, percentage } = req.body;
  database("constraints")
    .insert({
      c_name: name,
      c_percentage: percentage,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

app.post("/updateConstraint/", (req, res) => {
  const { c_id, c_name, c_percentage } = req.body;
  // console.log(req.body);

  database("constraints")
    .where(function () {
      this.where("c_id", "=", c_id);
    })
    .update({
      c_name: c_name,
      c_percentage: c_percentage,
    })
    .then((data) => {
      res.send("updated the data");
      console.log("Data here", data);
    })
    .catch((err) => res.send(err));
});

app.get("/mySelectedCourseUnits/:stu_no", (req, res) => {
  const { stu_no } = req.params;
  // console.log("new", stu_no);

  database
    .select("*")
    .from("stu_selected_course_units")
    .join("modules", function () {
      this.on(
        "stu_selected_course_units.course_id",
        "=",
        "modules.course_id"
      ).andOn("stu_selected_course_units.course", "=", "modules.course_code");
    })
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })

    .then((data) => {
      res.send(data);
    });
  // database
  //   // .orderBy("id")
  //   .select("*")
  //   .from("stu_selected_course_units")
  //   .join(
  //     "modules",
  //     "stu_selected_course_units.course_id",
  //     "=",
  //     "modules.course_id"
  //   )
  //   .where(function () {
  //     this.where("stu_id", "=", stu_no);
  //   })

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.post("/myCourseUnitsTodayDashboard/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  // console.log(Array.isArray(req.body));
  // console.log("received data", req.body);
  // console.log("from the client ", req.body.my_array);
  // console.log("from the client ", req.body.day);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //console.log(d.getDay());
  let newArr = [];

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    // .join("lectures", "timetable.tt_id", "=", "lectures.tt_id")
    .where("day_id", "=", req.body.day)
    .andWhere("timetable.school", "=", req.body.school)
    .andWhere("timetable.study_time", "=", req.body.study_time)
    // .where("day_id", "=", req.body.day)

    //.join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join(
      "stu_selected_course_units",
      "timetable.c_unit_id",
      "=",
      "stu_selected_course_units.course_id"
    )
    .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    .andWhere("stu_selected_course_units.stu_id", "=", req.body.stu_no)
    // .join("modules", function () {
    //   this.on("timetable.course_unit_name", "=", "modules.course_name");
    //   //.andOn("stu_selected_course_units.course", "=", "modules.course_code");
    // })
    // .where("c_unit_id", "=", 1)
    .orderBy("start_time")
    .then((data) => {
      // newArr.push(data);
      // console.log("response here", data);
      data.forEach((item) => {
        req.body.my_array.forEach((reqItem) => {
          if (item.c_unit_id == reqItem) {
            //console.log(item.c_unit_id, reqItem);
            newArr.push(item);
          } else {
            // console.log("else " + item.c_unit_id, reqItem);
          }
        });
      });
      // console.log("New array", newArr);
      res.send(newArr);

      // });
    });

  // res.send(newArr);
});

app.post("/myCourseUnitsToday/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  // console.log(Array.isArray(req.body));
  //console.log("Data received", req.body);
  // console.log("from the client ", req.body.day);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // console.log(d.getDay());

  // console.log("from the client ", req.body.my_array);
  // console.log("date ", date);
  let currentTime = new Date().toLocaleTimeString();

  var m1 = moment(`${date} 7:00AM`, "YYYY-MM--DD h:mmA");
  // var m1 = moment();

  var moment1 = moment(`${date}`, "YYYY-MM--DD");
  // var moment1 = moment();
  let newArr = [];
  let lectureDetails = [];
  let counter = 0;

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    // .join("lectures", "timetable.tt_id", "=", "lectures.tt_id")
    .where("day_id", "=", req.body.day)
    .andWhere("timetable.school", "=", req.body.school)
    .andWhere("timetable.study_time", "=", req.body.study_time)
    // .where("day_id", "=", req.body.day)

    //.join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join(
      "stu_selected_course_units",
      "timetable.c_unit_id",
      "=",
      "stu_selected_course_units.course_id"
    )
    .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    // .leftJoin("users", "timetable.c_unit_id", "=", "users.for_wc_cu")
    // .leftJoin("lectures", "timetable.tt_id", "lectures.l_tt_id")
    // .join("modules", function () {
    //   this.on("timetable.course_unit_name", "=", "modules.course_name");
    //   //.andOn("stu_selected_course_units.course", "=", "modules.course_code");
    // })

    .leftJoin("lectures", function () {
      this.on("timetable.tt_id", "=", "lectures.l_tt_id")
        .andOn(
          "lectures.l_year",
          "=",
          parseInt(
            req.body.selectedYear ? req.body.selectedYear : d.getFullYear()
          )
        )
        .andOn(
          "lectures.l_month",
          "=",
          parseInt(
            req.body.selectedMonth ? req.body.selectedMonth : d.getMonth() + 1
          )
        )
        .andOn(
          "lectures.l_date",
          "=",
          parseInt(req.body.selected ? req.body.selected : d.getDate())
        );
    })
    // .where("lectures.date", "=", req.body.date)
    .andWhere("stu_selected_course_units.stu_id", "=", req.body.stu_no)
    .orderBy("start_time")
    .then((data) => {
      // newArr.push(data);
      // console.log("another response herer", data);

      data.forEach((item) => {
        // database
        //   .select("*")
        //   .from("lectures")
        //   .where({
        //     date: req.body.date,
        //     l_tt_id: item.tt_id,
        //     // lecturer_id,
        //   })
        //   .then((data3) => {
        req.body.my_array.forEach((reqItem, index) => {
          if (item.c_unit_id == reqItem) {
            var m2 = moment(
              `${req.body.date} ${item.end_time}`,
              "YYYY-MM--DD h:mmA"
            );

            var moment2 = moment(
              `${req.body.date} ${item.end_time}`,
              "YYYY-MM--DD"
            );
            if (moment.duration(moment2.diff(moment1))._data.days > 0) {
              // console.log(moment.duration(moment2.diff(moment1))._data.days);
              // console.log("Lecture is not supposed to be taught now");
              newArr.push({ ...item, status: "not now" });
              // console.log({ ...item, status: "not now" });
            } else {
              if (m1.isBefore(m2)) {
                // console.log({ ...item, status: "on" });
                newArr.push({ ...item, status: "on" });
                // console.log("Lecture is still on");
              } else {
                // console.log({ ...item, status: "off" });
                newArr.push({ ...item, status: "off" });
                // console.log("Lecture is supposed to have ended");
              }
            }

            // newArr.push(item);

            // console.log({ ...item, ...data3[0] });

            // console.log(item.c_unit_id, reqItem);
          } else {
            // console.log("else " + item.c_unit_id, reqItem);
          }
        });
        // })

        return true;
      });

      database
        .select("*")
        .from("lecture_members")
        .where("date", "=", req.body.date)
        .andWhere("member_id", "=", req.body.stu_no)
        .then((data10) => {
          // console.log("attended students", data10);
          data10.forEach((member) => {
            newArr.forEach((lecture, i) => {
              if (lecture.has_ended && member.lecture_id == lecture.c_unit_id) {
                // console.log(
                //   "He atttended the lecture jkdjdjkdjkjkdjkd",
                //   newArr.length
                // );
                // newArr.push({ ...lecture, attendedLecture: "true" });
                newArr[i].attendedLecture = true;
              } else if (lecture.has_ended) {
                // console.log("He diddnt atttended the lecture jkdjdjkdjkjkdjkd");
                // newArr.push({ ...lecture, attendedLecture: "false" });
                newArr[i].attendedLecture = false;
              }
            });

            // console.log("bjdfjdfjdfjfdj", newArr.length);
            //console.log("data", newArr);
          });
        });

      if (newArr.length === 0) {
        res.send(newArr);
      }

      // console.log("length start2", newArr.length);
      newArr.forEach((lecture, index) => {
        // console.log("new arr inside loop", newArr);
        // console.log("lecture class Reps", classRepInfo);
        database
          .select("*")
          .from("users")
          .join("class_reps", "users.stu_no", "=", "class_reps.class_rep_id")
          // .where({
          //   // day_id: 1,
          //   for_wc_cu: lecture.c_unit_id,
          // })
          .where("class_reps.for_wc_cu", "=", lecture.c_unit_id)
          .then((classRepInfo) => {
            counter++;

            // console.log("Index", index);
            lectureDetails.push({ ...lecture, classRepInfo });

            return lectureDetails;
          })
          .then((data) => {
            // console.log(`loop through ${counter}, ${newArr.length}`);
            if (newArr.length === counter) {
              const sortedAsc = data.sort(
                (objA, objB) =>
                  moment(objA.start_time, "h:mmA") -
                  moment(objB.start_time, "h:mmA")
              );
              res.send(sortedAsc);
              // console.log("new arr", sortedAsc);
              // res.send(sortedAsc);
            }
          });
      });
      // console.log("Done");
      // console.log("length2333333", newArr.length);

      // res.send(newArr);

      let arr = [];
    });

  // res.send(newArr);
});

app.get("/weeklyChartData", (req, res) => {
  let arr = [];
  const d = new Date();
  const myDateToday = new Date();
  const firstDate = new Date(d.setDate(d.getDate() - d.getDay()));
  // console.log("Sunday", firstDate.getDate());
  const dateToday =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const testDate = new Date("2022-09-22");
  // console.log(
  //   "The day is ",
  //   myDateToday.getDay() === 0 ? 7 : myDateToday.getDay()
  // );
  // console.log("full date today", myDateToday);
  let toady = myDateToday.getDay() === 0 ? 7 : myDateToday.getDay();
  let done = false;
  let count = toady;

  let date = new Date(myDateToday.setDate(myDateToday.getDate()));

  for (let i = toady; i > 0; i--) {
    let resDate =
      date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

    // setTimeout(() => {
    date = new Date(myDateToday.setDate(myDateToday.getDate() - 1));
    // }, 2);

    // console.log("Result date ", date);
    let ans;
    //to be changed for the dashboard
    let data = async (callback) => {
      await database

        .from("students_biodata")

        .join(
          "student_signin",
          "students_biodata.stdno",
          "=",
          "student_signin.stu_id"
        )
        .join("users", "student_signin.signed_in_by", "=", "users.id")
        // .where("students.stu_id", "=", studentNo)
        .andWhere("student_signin.signin_date", "=", resDate)
        .select("*")
        .then((result) => {
          // return result;
          // console.log("result ", result);
          callback(result);
          // res = result;
        });
      // return res;
      // .then((result) => {
      //   // console.log(result);
      //   return result;
      // });
      // return 0;
    };

    // .count("*")
    // .orderBy("signin_time")
    // .then((data) => {

    data(function (result) {
      // console.log("authenticated");

      result.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });

      // res.send(`${result.length}`);

      // comment 1
      arr[--count] = result.length;
      // console.log(`The count is  ${count}, ${i}, [${arr}], ${resDate}`);
      if (count === 0) res.send(arr);

      // console.log(`length for ${i} = ${result.length}`);
      // res.send(data);
      // count--;
      // date = new Date(myDateToday.setDate(myDateToday.getDate() - 1));
      // return 0;
      // console.log(result);
      // return res.send(`${result.length}`);
    });

    // console.log("arr", arr);
  }
});

app.get("/weeklyLectureData", (req, res) => {
  const d = new Date();
  const currentDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  var first = d.getDate() - d.getDay();
  const firstDate = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + first;
  let mon = 0;
  let tue = 0;
  let wed = 0;
  let thur = 0;
  let fri = 0;
  let sat = 0;
  let sun = 0;

  let days = [1, 2, 3, 4, 5, 6, 0];

  let chartData = [];
  let arr = [];

  //   console.log(num);

  database
    .select("*")
    .from("timetable")
    .whereBetween("day_id", [1, 2])
    .leftJoin("lectures", "timetable.c_unit_id", "=", "lectures.course_unit_id")
    // .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    // .where("lectures.date", "=", "2022-09-21")
    // .where({
    //   day_id: 3,
    //   date: "2022-09-21",
    // })

    .then((result) => {
      range(1, 2).forEach((num) => {
        console.log(new Date(d.setDate(d.getDate() - (d.getDay() - num))));

        const weeklyDate = new Date(
          d.setDate(d.getDate() - (d.getDay() - num))
        );

        // if ()
        // res.send(result);
        arr.push(result);

        // console.log(result);
      });
      res.send(arr);
    });
});

app.post("/lecturerCourseunits/", (req, res) => {
  const { lecturer_id, day, l_date } = req.body;
  //console.log("data from ", req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //  console.log(req.body);
  let newArr = [];
  let lectureDetails = [];
  let counter2 = 0;

  let currentTime = new Date().toLocaleTimeString();

  var m1 = moment(`${date} 7:00AM`, "YYYY-MM--DD h:mmA");
  // var m1 = moment();

  var moment1 = moment(`${date}`, "YYYY-MM--DD");
  // var moment1 = moment();

  database
    .select("*")
    .from("timetable")
    .where({
      day_id: day,
      // lecturer_id,
    })
    //.join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    //.join("lecturers", "timetable.lecturer_id", "=", "lecturers.lecturer_id")
    .join("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    // .leftJoin("users", "timetable.c_unit_id", "=", "users.for_wc_cu")
    // .leftJoin("lectures", "timetable.tt_id", "lectures.l_tt_id")
    .leftJoin("lectures", function () {
      this.on("timetable.tt_id", "=", "lectures.l_tt_id")
        .andOn(
          "lectures.l_year",
          "=",
          parseInt(
            req.body.selectedYear ? req.body.selectedYear : d.getFullYear()
          )
        )
        .andOn(
          "lectures.l_month",
          "=",
          parseInt(
            req.body.selectedMonth ? req.body.selectedMonth : d.getMonth() + 1
          )
        )
        .andOn(
          "lectures.l_date",
          "=",
          parseInt(req.body.selected ? req.body.selected : d.getDate())
        );
    })
    .orderBy("start_time")

    .then((data) => {
      // console.log("lectures of teacher", data);
      database
        .select("*")
        .from("staff")
        .where({
          // day_id: 1,
          staff_id: lecturer_id,
        })
        .then((lecturer) => {
          // console.log("lecturer", lecturer);
          data.forEach((lecture) => {
            try {
              if (lecturer[0].staff_id == lecture.lecturer_id) {
                var m2 = moment(
                  `${req.body.l_date} ${lecture.end_time}`,
                  "YYYY-MM--DD h:mmA"
                );

                var moment2 = moment(
                  `${req.body.l_date} ${lecture.end_time}`,
                  "YYYY-MM--DD"
                );

                if (moment.duration(moment2.diff(moment1))._data.days > 0) {
                  // console.log(moment.duration(moment2.diff(moment1))._data.days);
                  // console.log("Lecture is not supposed to be taught now");
                  newArr.push({ ...lecture, status: "not now" });
                  // console.log({ ...item, status: "not now" });
                } else {
                  if (m1.isBefore(m2)) {
                    // console.log({ ...item, status: "on" });
                    newArr.push({ ...lecture, status: "on" });
                    // console.log("Lecture is still on");
                  } else {
                    // console.log({ ...item, status: "off" });
                    newArr.push({ ...lecture, status: "off" });
                    // console.log("Lecture is supposed to have ended");
                  }
                }
                // newArr.push(lecture);
              }
            } catch (error) {}
          });
          // res.send(newArr);
          // console.log("REsult", newArr);

          if (newArr.length === 0) {
            res.send(newArr);
          }
          newArr.map((lecture, index) => {
            database
              .select("*")
              .from("users")
              .join(
                "class_reps",
                "users.stu_no",
                "=",
                "class_reps.class_rep_id"
              )
              // .where({
              //   // day_id: 1,
              //   for_wc_cu: lecture.c_unit_id,
              // })
              .where("class_reps.for_wc_cu", "=", lecture.c_unit_id)
              .orderBy("id")
              .then((classRepInfo) => {
                counter2++;
                //  console.log("lecture class Reps", classRepInfo);

                lectureDetails.push({ ...lecture, classRepInfo });
                // return { ...lecture, classRepInfo };

                return lectureDetails;
              })
              .then((data) => {
                // console.log(`loop through ${counter2}, ${newArr.length}`);
                if (newArr.length === counter2) {
                  const sortedAsc = data.sort(
                    (objA, objB) =>
                      moment(objA.start_time, "h:mmA") -
                      moment(objB.start_time, "h:mmA")
                  );
                  res.send(sortedAsc);
                  // console.log("new arr", sortedAsc);
                  // res.send(sortedAsc);
                }
              });
          });

          // console.log(newArr);
          // res.send(newArr);
        });

      // });
    });

  // res.send(newArr);
});

app.post("/updateClassRepInfo", (req, res) => {
  const { id, stu_no, course_id } = req.body;
  //console.log(req.body);

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
    })
    .then((enrolledStudents) => {
      //console.log("Enrolled students here", data);
      database
        .select("*")
        .from("class_reps")
        // .join(
        //   "class_reps",
        //   "users.stu_no",
        //   "=",
        //   "class_reps.class_rep_id"
        // )
        // .where({
        //   // day_id: 1,
        //   for_wc_cu: lecture.c_unit_id,
        // })
        .where("class_reps.for_wc_cu", "=", course_id)
        // .where({
        //   // day_id: 1,
        //   is_class_rep: 1,
        //   for_wc_cu: course_id,
        // })
        .then((classReps) => {
          if (classReps.length < 3) {
            database("users")
              .where(function () {
                this.where("stu_no", "=", stu_no);
              })
              .update({
                is_class_rep: 1,
              })
              .then((data) => {
                // res.send("Success");
                database("class_reps")
                  .insert({
                    class_rep_id: stu_no,
                    for_wc_cu: course_id,
                  })
                  .then((data) => {
                    res.send("Success");
                  });
              })
              // database("users")
              //   .where(function () {
              //     this.where("stu_no", "=", stu_no);
              //   })
              //   .update({
              //     is_class_rep: 1,
              //     for_wc_cu: course_id,
              //   })
              //   .then((data) => {
              //     res.send("Success");
              //   })
              .catch(
                (err) => {
                  console.log("error", err);
                }
                // res.send(err)
              );
          } else {
            // res.send(
            //   `Maximum number of class Reps reached ${classReps.length}`
            // );

            return res.status(200).json({
              error: `Maximum number of class Reps reached ${classReps.length}`,
            });
            // return res
            //   .status(400)
            //   .send(`Maximum number of class Reps reached ${classReps.length}`);
          }
        });
    });
});

app.get("/getClassRepInfo/:course_id", (req, res) => {
  const { course_id } = req.params;
  console.log(req.params);

  //console.log("Enrolled students here", data);
  database
    .select("*")
    .from("users")
    .join("class_reps", "users.stu_no", "=", "class_reps.class_rep_id")
    // .where({
    //   stu_no: stuno,
    // })
    .where("class_reps.for_wc_cu", "=", course_id)
    .then((data) => {
      console.log("response", data);
      res.send(data);
    });
});

app.get("/getAllClassReps/:course_id", (req, res) => {
  const { course_id } = req.params;
  //console.log(req.params);

  database
    .select("*")
    .from("users")
    .join("class_reps", "users.stu_no", "=", "class_reps.class_rep_id")
    // .where({
    //   stu_no: stuno,
    // })
    .where("class_reps.for_wc_cu", "=", course_id)
    // .where({
    //   // day_id: 1,
    //   is_class_rep: 1,
    //   for_wc_cu: course_id,
    // })
    .then((classReps) => {
      res.send(classReps);
    });
});

app.post("/getCustomReports/", (req, res) => {
  // to be changed for the dashboard
  const { date, requiredData } = req.body;
  // console.log(req.body);
  if (requiredData && date) {
    if (requiredData == "students") {
      database
        .select("*")
        .from("students")

        .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")
        .join("users", "student_signin.signed_in_by", "=", "users.id")
        // .where("students.stu_id", "=", studentNo)
        .andWhere("student_signin.signin_date", "=", date)
        .orderBy("signin_time")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.signin_date);
            const date2 = ` ${d2.getFullYear()}-0${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.signin_date = date2;
          });
          res.send(data);
        });
    } else if (requiredData == "visitors") {
      database("users")
        .join(
          "visitors",
          "users.id",

          "=",
          "visitors.signed_in_by"
        )
        .where("visitors.date", "=", date)
        .orderBy("time")
        .select("*")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.date);
            const date2 = ` ${d2.getFullYear()}-${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.date = date2;
          });
          res.send(data);
        });
    }
  }
});

app.get("/studentsToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(data);
    });
});

app.get("/studentsTotalBySchool/:school", (req, res) => {
  const { school } = req.params;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .andWhere("students_biodata.facultycode", "=", school)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(`${data.length}`);
    });
});

app.get("/todaysLectures/:school", (req, res) => {
  const { school } = req.params;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(`${d.getDay()}, ${school}`);

  database
    .select("*")
    .from("timetable")
    .leftJoin("lectures", "timetable.c_unit_id", "=", "lectures.course_unit_id")
    .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    .where({
      day_id: d.getDay() === 0 ? 7 : d.getDay(),
      school: school,
    })
    .then((result) => {
      res.send(result);
    });
});

app.get("/numOftodaysLectures/:school", (req, res) => {
  const { school } = req.params;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(`${d.getDay()}, ${school}`);

  database
    .select("*")
    .from("timetable")
    .leftJoin("lectures", "timetable.c_unit_id", "=", "lectures.course_unit_id")
    .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
    .where({
      day_id: d.getDay() === 0 ? 7 : d.getDay(),
      school: school,
    })
    .then((result) => {
      res.send(`${result.length}`);
    });
});

app.get("/studentsTodayTotal", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(`${data.length}`);
    });
});

//Number of students 2de for the given campus
app.get("/studentsTodayTotalByCampus/:campus", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const { campus } = req.params;
  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    .join("gates", "student_signin.gate_id", "=", "gates.id")
    .where("gates.campus_id", "=", campus)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(`${data.length}`);
    });
});

//Number of students all for the given campus
app.get("/numOfStudentsByCampus/:campus", (req, res) => {
  // let camp = "Main campus";
  const { campus } = req.params;
  database
    .select("*")
    .from("students_biodata")
    .join("campus", "campus.campus_name", "=", "students_biodata.campus")
    .where("campus.cam_id", "=", campus)
    .then((data) => {
      res.send(`${data.length}`);
    });
});

app.get("/num0fstudentsToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(`${data.length}`);
    });
});

app.get("/staffToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("staff_signin")
    .join(
      "staff",
      "staff.staff_id",

      "=",
      "staff_signin.staff_id"
    )
    .join("users", "staff_signin.signed_in_by", "=", "users.id")
    .where("staff_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(data);
    });
});

app.get("/numOfstaffToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  //to be changed for the dashboard
  database
    .select("*")
    .from("staff_signin")
    .join(
      "staff",
      "staff.staff_id",

      "=",
      "staff_signin.staff_id"
    )
    .join("users", "staff_signin.signed_in_by", "=", "users.id")
    .where("staff_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(`${data.length}`);
    });
});

app.get("/allstaffdetails/:staff_id", (req, res) => {
  const { staff_id } = req.params;
  const userId = 1;
  // console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  let modifiedData = [];
  let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  //to be changed for the dashboard
  database
    .select("*")
    .from("staff")

    .join("staff_signin", "staff.staff_id", "=", "staff_signin.staff_id")
    // .join("users", "staff_signin.signed_in_by", "=", "users.id")

    .where("staff_signin.staff_id", "=", staff_id)
    .andWhere("staff_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("staff")
        .join(
          "staff_signin_details",
          "staff.staff_id",
          "=",
          "staff_signin_details.staff_id"
        )
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("staff.staff_id", "=", staff_id)
        .andWhere("staff_signin_details.signin_date", "=", date)
        .then((data3) => {
          var m1 = moment(`${data3[0].signin_time}`, "h:mm");
          const date5 = new Date(m1);
          var m2 = null;

          if (data3[0].signout_time) {
            m2 = moment(`${data3[0].signout_time}`, "h:mm");
          }
          const date6 = new Date(m2);
          res.send([
            ...data3,
            // {
            //   // modifiedSigninTime: date5.toLocaleTimeString(),
            //   // modifiedSignoutTime: m2 ? date6.toLocaleTimeString() : null,
            // },

            // {
            //   imageUrl: data3[0]
            //     ? `http://${baseIp}:${port}/assets/${data3[0].image}`
            //     : "http://${baseIp}:${port}/assets/jacket.jpg",
            // },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/visitorData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("users")
    .join(
      "visitors",
      "users.id",

      "=",
      "visitors.signed_in_by"
    )
    .where("visitors.date", "=", date)
    .orderBy("time")
    .select("*")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.date = date2;
      });
      res.send(data);
    });
});

app.get("/numOfvisitors2de", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("users")
    .join(
      "visitors",
      "users.id",

      "=",
      "visitors.signed_in_by"
    )
    .where("visitors.date", "=", date)
    .orderBy("time")
    .select("*")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.date);
        const date2 = ` ${d2.getFullYear()}-${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.date = date2;
      });
      res.send(`${data.length}`);
    });
});

app.get("/myVisitors/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("visitors")
    .join(
      "users",
      "visitors.signed_in_by",

      "=",
      "users.id"
    )
    .where("visitors.date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/myStudents/:user_id", (req, res) => {
  const { user_id } = req.params;
  //console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("student_signin")
    // .join(
    //   "users",
    //   "students_signin_book.signed_in_by",

    //   "=",
    //   "users.id"
    // )
    // .where("student_signin.signin_date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      signin_date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/myRegisteredStudents/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("voters")
    .select("*")
    .where({
      registered_by: user_id,
      r_date: date,
    })
    .then((data) => {
      res.send(`${data.length}`);
    });
});

app.get("/myStaffMembers/:user_id", (req, res) => {
  const { user_id } = req.params;
  //console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("staff_signin")
    // .join(
    //   "users",
    //   "students_signin_book.signed_in_by",

    //   "=",
    //   "users.id"
    // )
    // .where("student_signin.signin_date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      signin_date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/studentData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // to be changed for the dashboard

  database("students")
    .join(
      "students_signin_book",
      "students.stu_id",

      "=",
      "students_signin_book.stu_id"
    )

    .join(
      "students_signout_book",
      "students_signin_book.signin_date",
      "=",
      "students_signout_book.signin_date"
    )
    .where("students_signin_book.signin_date", "=", date)

    .select("*")
    .then((data) => {
      res.send(data);
    });
});

// app.get("/student/:studentNo", (req, res) => {
//   const { studentNo } = req.params;
//   console.log(studentNo);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

//   database
//     .select("*")
//     .from("students_signin_book")
//     .where({
//       stu_id: studentNo,
//       signin_date: date,
//     })
//     .then((data) => {
//       // res.send(data);
//       if (data.length > 0) {
//         database
//           .select("*")
//           .from("students")

//           .join(
//             "students_signin_book",
//             "students.stu_id",
//             "=",
//             "students_signin_book.stu_id"
//           )

//           .join(
//             "students_signout_book",
//             "students.stu_id",
//             "=",
//             "students_signout_book.stu_id"
//           )
//           .where("students.stu_id", "=", studentNo)
//           .andWhere("students_signout_book.signin_date", "=", date)
//           .then((data3) => {
//             // res.send(data3);
//             if (data3[0].sign_out !== null) {
//               res.send("Already registered");
//             } else {
//               res.send([
//                 data3[0],
//                 {
//                   todaysStatus: true,
//                   imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
//                 },
//               ]);
//             }
//           });
//       } else {
//         database
//           .select("*")
//           .from("students")
//           .where({
//             stu_id: studentNo,
//           })
//           .then((data2) => {
//             res.send([
//               ...data2,
//               {
//                 todaysStatus: false,
//                 imageUrl: data2[0]
//                   ? `http://${baseIp}:${port}/assets/${data2[0].image}`
//                   : "http://${baseIp}:${port}/assets/jacket.jpg",
//               },
//             ]);
//           });
//       }
//     });

//   // database("students")
//   //   .join(
//   //     "students_signin_book",
//   //     "students.stu_id",
//   //     "=",
//   //     "students_signin_book.stu_id"
//   //   )
//   //   .select("*")
//   //   // .where("quantity", ">", 0)

//   //   .then((data) => {
//   //     res.send(data);
//   //   });
// });

app.post("/allstudentdetails/", (req, res) => {
  const { studentNo, date } = req.body;
  // console.log(req.body);
  const userId = 1;
  //console.log(studentNo);
  // const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // let modifiedData = [];
  // let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  //To be changed for the dashboard
  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          res.send([
            ...data3,
            {
              imageUrl: data3[0]
                ? `http://${baseIp}:${port}/assets/${data3[0].image}`
                : "http://${baseIp}:${port}/assets/jacket.jpg",
            },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});
app.get("/allstudentdetails/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  // console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  let modifiedData = [];
  let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  //to be changed for the dashboard
  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )

    .where("students_biodata.stdno", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students_biodata")

        .join("stu_signin", "students_biodata.stdno", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students_biodata.stdno", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          var m1 = moment(`${data3[0].signin_time}`, "h:mm");
          const date5 = new Date(m1);
          var m2 = null;

          if (data3[0].signout_time) {
            m2 = moment(`${data3[0].signout_time}`, "h:mm");
          }
          const date6 = new Date(m2);
          res.send([
            ...data3,
            // {
            //   // modifiedSigninTime: date5.toLocaleTimeString(),
            //   // modifiedSignoutTime: m2 ? date6.toLocaleTimeString() : null,
            // },

            // {
            //   imageUrl: data3[0]
            //     ? `http://${baseIp}:${port}/assets/${data3[0].image}`
            //     : "http://${baseIp}:${port}/assets/jacket.jpg",
            // },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/student/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  //console.log("number", studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students_biodata")

    .join(
      "student_signin",
      "students_biodata.stdno",
      "=",
      "student_signin.stu_id"
    )

    .where("students_biodata.stdno", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data2) => {
      // res.send(data3);

      database
        .select("*")
        .from("students_biodata")

        .join("stu_signin", "students_biodata.stdno", "=", "stu_signin.stu_id")

        .where("students_biodata.stdno", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)

        .then((data3) => {
          if (data3.length > 0) {
            // res.send(data3);
            if (data3[data3.length - 1].signout_time !== null) {
              // res.send("Already registered");
              database
                .select("*")
                .from("students_biodata")
                // .join("finance", "students.stu_id", "=", "finance.stu_no")
                .where({
                  stdno: studentNo,
                })
                .then((data2) => {
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        ...data2,
                        {
                          todaysStatus: "not new",
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          requiredPercentage: data6[0].c_percentage,
                        },
                      ]);
                    });
                });
            } else {
              database
                .select("*")
                .from("constraints")
                .then((data6) => {
                  res.send([
                    data3[data3.length - 1],
                    {
                      todaysStatus: true,
                      imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
                      requiredPercentage: data6[0].c_percentage,
                    },
                  ]);
                });
            }
          } else {
            database
              .select("*")
              .from("students_biodata")
              // .join("finance", "students.stu_id", "=", "finance.stu_no")
              .where({
                stdno: studentNo,
              })
              .then((data2) => {
                if (data2[0]) {
                  // database
                  //   // .orderBy("id")
                  //   .select("*")
                  //   .from("fees_structure")
                  //   .join(
                  //     "nationality",
                  //     "fees_structure.nationality_id",
                  //     "=",
                  //     "nationality.nationality_id"
                  //   )
                  //   .join(
                  //     "sessions",
                  //     "fees_structure.session_id",
                  //     "=",
                  //     "sessions.session_id"
                  //   )
                  //   .join(
                  //     "schools",
                  //     "fees_structure.school_id",
                  //     "=",
                  //     "schools.school_id"
                  //   )
                  //   .join(
                  //     "levels",
                  //     "fees_structure.levels_id",
                  //     "=",
                  //     "levels.level_id"
                  //   )
                  //   .where("sessions.session_name", "=", data2[0].study_time)
                  //   // .andWhere("schools.school_id", "=", data2[0].school_id)
                  //   .andWhere(
                  //     "nationality.nationality_id",
                  //     "=",
                  //     data2[0].nationality_id
                  //   )
                  //   .andWhere("levels.levels", "=", data2[0].level)
                  //   .then((data4) => {
                  //     // database
                  //     //   .select("*")
                  //     //   .from("finance")
                  //     //   // .where("finance.stu_no", "=", studentNo)
                  //     //   .then((data5) => {

                  //     //   });

                  //   });
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        ...data2,
                        {
                          todaysStatus: false,
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          // feesStructure: data4,
                          // paid: data5,
                          // percentage:
                          //   data2[0] && data5[0]
                          //     ? (data5[0].amount / data4[0].tuition) * 100
                          //     : 0,
                          requiredPercentage: data6[0].c_percentage,
                          // paidAmt: data5[0] ? data5[0].amount : 0,
                          // reachedPercentage:
                          //   data2[0] && data5[0]
                          //     ? (data5[0].amount / data4[0].tuition) *
                          //         100 >=
                          //       data6[0].c_percentage
                          //     : 0 >= data6[0].c_percentage,
                        },
                      ]);
                    });
                } else {
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        {
                          todaysStatus: false,
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          requiredPercentage: data6[0].c_percentage,
                        },
                      ]);
                    });
                }
              });
          }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/voter/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  console.log("number", studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("voters")
    .where({
      voter_stdno: studentNo,
      r_date: date,
    })
    .then((result) => {
      database
        .select("*")
        .from("constraints")
        .where("c_name", "=", "Voting")
        .then((result2) => {
          if (result.length) {
            console.log("true------");
            res.send({
              alreadyVoted: "true",
              requiredPercentage: result2[0].c_percentage,
            });
          } else {
            console.log("False-----");
            res.send({
              alreadyVoted: "false",
              requiredPercentage: result2[0].c_percentage,
            });
          }
          console.log("The percentage ", result2[0].c_percentage);
        });
    });
});

app.post("/addVoter", (req, res) => {
  const { studentNo, registered_by, campus } = req.body;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  //console.log(req.body);

  //first checking if voter exists
  database
    .select("*")
    .from("voters")
    .where({
      voter_stdno: studentNo,
      r_date: date,
    })
    .then((result) => {
      if (result.length === 0) {
        //No voter with such credentials
        //adding him
        database("voters")
          .insert({
            voter_stdno: studentNo,
            registered_by,
            r_time: time,
            r_date: date,
            campus: campus,
          })
          .then((data) => res.status(200).send("Received voter data"))
          .catch((err) =>
            res.status(400).send("Failed to send the data " + err)
          );
      } else {
        res.send("Voter already voted");
      }
    });
});

app.get("/staff/:staffNo", (req, res) => {
  const { staffNo } = req.params;
  const userId = 1;
  //console.log("staff number", staffNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("staff")

    .join(
      "staff_signin_details",
      "staff.staff_id",
      "=",
      "staff_signin_details.staff_id"
    )

    .where("staff.staff_id", "=", staffNo)
    .andWhere("staff_signin_details.signin_date", "=", date)

    .then((data3) => {
      if (data3.length > 0) {
        // res.send(data3);
        if (data3[data3.length - 1].signout_time !== null) {
          // res.send("Already registered");
          database
            .select("*")
            .from("staff")
            // .join("finance", "students.stu_id", "=", "finance.stu_no")
            .where({
              staff_id: `${staffNo}`,
            })
            .then((data2) => {
              res.send([
                ...data2,
                {
                  todaysStatus: "not new",
                  imageUrl: data2[0]
                    ? `http://${baseIp}:${port}/image/${data2[0].staff_id.replace(
                        /\s/g,
                        ""
                      )}`
                    : "http://${baseIp}:${port}/assets/jacket.jpg",
                },
              ]);
            });
        } else {
          database
            .select("*")
            .from("staff")
            // .join("finance", "students.stu_id", "=", "finance.stu_no")
            .where({
              staff_id: `${staffNo}`,
            })
            .then((data2) => {
              res.send([
                data3[data3.length - 1],
                {
                  todaysStatus: true,
                  imageUrl: data2[0]
                    ? `http://${baseIp}:${port}/image/${data2[0].staff_id.replace(
                        /\s/g,
                        ""
                      )}`
                    : "http://${baseIp}:${port}/assets/jacket.jpg",
                },
              ]);
            });
        }
      } else {
        database
          .select("*")
          .from("staff")
          // .join("finance", "students.stu_id", "=", "finance.stu_no")
          .where({
            staff_id: `${staffNo}`,
          })
          .then((data2) => {
            //console.log("shdgghsdghd", data2);
            if (data2[0]) {
              res.send([
                ...data2,
                {
                  todaysStatus: false,
                  imageUrl: data2[0]
                    ? `http://${baseIp}:${port}/image/${data2[0].staff_id.replace(
                        /\s/g,
                        ""
                      )}`
                    : "http://10.7.0.22:9000/image/NUA083",
                },
              ]);
            } else {
              res.send([
                {
                  todaysStatus: false,
                  imageUrl: data2[0]
                    ? `http://${baseIp}:${port}/image/${data2[0].staff_id.replace(
                        /\s/g,
                        ""
                      )}`
                    : "http://${baseIp}:${port}/assets/jacket.jpg",
                },
              ]);
            }
          });
      }
      // });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/lecture/:lecture_id", (req, res) => {
  const { lecture_id } = req.params;
  const userId = 1;
  //console.log("number", lecture_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("timetable")

    // .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("timetable.tt_id", "=", lecture_id)
    // .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
  if (0 <= d && d < 10) return "0" + d.toString();
  if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
  return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function () {
  return (
    this.getUTCFullYear() +
    "-" +
    twoDigits(1 + this.getUTCMonth()) +
    "-" +
    twoDigits(this.getUTCDate()) +
    " " +
    twoDigits(this.getUTCHours()) +
    ":" +
    twoDigits(this.getUTCMinutes()) +
    ":" +
    twoDigits(this.getUTCSeconds())
  );
};

app.post("/gateReg", (req, res) => {
  const { gate_id, user_id } = req.body;
  // console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  // console.log(
  //   "time",
  //   d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  // );

  database("assigned_gates")
    .insert({
      gate_id,
      user_id,
      date,
      time,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

// app.post("/studentReg", (req, res) => {
//   const { stu_id, temp, signed_in_by } = req.body;
//   console.log(req.body);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
//   const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
//   console.log(
//     "time",
//     d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
//   );

//   database("students_signin_book")
//     .insert({
//       stu_id: stu_id,
//       temperature: temp,
//       signin_date: date,
//       signin_time: time,
//       signed_in_by,
//     })
//     .then((data) => {
//       database("students_signout_book")
//         .insert({
//           stu_id: stu_id,
//           signin_date: date,
//         })
//         .then((data2) => {
//           res.send("Received the data");
//         });
//     })
//     .catch((err) => res.send(err));
// });

app.post("/studentReg", (req, res) => {
  const {
    stu_id,
    temp,
    signed_in_by,
    signed_in,
    signin_gate,
    studentBioData,
    gate_id,
  } = req.body;
  //console.log("reg data", req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  // console.log(
  //   "time",
  //   d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  // );

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", stu_id)
    .andWhere("student_signin.signin_date", "=", date)
    .then((data) => {
      if (data.length > 0) {
        database("stu_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signined_in_by: signed_in,
            signin_gate,
          })
          .then((data) => {
            database("users")
              .where(function () {
                this.where("stu_no", "=", stu_id);
              })
              .update({
                stu_status: 1,
              })
              .then((data) => {
                // res.send("updated the data");
              })
              .catch(
                (err) => {}
                // res.send(err)
              );
            res.send("Received the data");
            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => {
            console.log("incurred an error", err);
            res.send(err);
          });
      } else {
        database("student_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signed_in_by,
            gate_id: gate_id,
          })
          .then((data) => {
            database("stu_signin")
              .insert({
                stu_id: stu_id,
                temperature: temp,
                signin_date: date,
                signin_time: time,
                signined_in_by: signed_in,
                signin_gate,
              })
              .then((data) => {
                res.send("Received the data");

                database
                  .select("*")
                  .from("users")
                  .where("users.stu_no", "=", stu_id)
                  .then((data) => {
                    // res.send(data);
                    if (data.length == 0) {
                      database("users")
                        .insert({
                          userfull_name: studentBioData.name,
                          username: stu_id,
                          password: stu_id,
                          email: `${studentBioData.name.replace(
                            /\s/g,
                            ""
                          )}@gmail.com`,
                          gendar: studentBioData.sex,
                          phoneNo: stu_id,
                          DOB: null,
                          Address: null,
                          user_image: "jacket.jpg",
                          role: "Student",
                          stu_no: stu_id,
                          stu_status: 1,
                          is_class_rep: 0,
                        })
                        .then((data4) => {});
                    }
                  });

                // database("students_signout_book")
                //   .insert({
                //     stu_id: stu_id,
                //     signin_date: date,
                //   })
                //   .then((data2) => {
                //     res.send("Received the data");
                //   });
              })
              .catch((err) => {
                console.log("incurred an error", err);
                res.send(err);
              });

            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => {
            console.log("incurred an error", err);
            res.send(err);
          });
      }
    });

  database
    .select("*")
    .from("students_biodata")
    .where("students_biodata.stdno", "=", stu_id)
    .then((stuData) => {
      if (stuData.length == 0) {
        database("students_biodata")
          .insert({
            stdno: studentBioData.stdno,
            regno: studentBioData.regno,
            name: studentBioData.name,
            admissions_form_no: studentBioData.admissions_form_no,
            sex: studentBioData.sex,
            telno: studentBioData.telno,
            entry_ac_yr: studentBioData.entry_ac_yr,
            entry_study_yr: studentBioData.entry_study_yr,
            nationality: studentBioData.nationality,
            facultycode: studentBioData.facultycode,
            progtitle: studentBioData.progtitle,
            progcode: studentBioData.progcode,
            prog_alias: studentBioData.prog_alias,

            programlevel: studentBioData.programlevel,
            progduration: studentBioData.progduration,
            facultytitle: studentBioData.facultytitle,
            intake: studentBioData.intake,
            campus: studentBioData.campus,
            sponsorship: studentBioData.sponsorship,
            residence_status: studentBioData.residence_status,
            current_sem: studentBioData.current_sem,
            study_yr: studentBioData.study_yr,
            study_time: studentBioData.study_time,
            collegetitle: studentBioData.collegetitle,
            std_status: studentBioData.std_status,
            progversion: studentBioData.progversion,
          })
          .then((result) => {
            console.log("Added a new student to our db");
          });
      }
    });
});

app.post("/staffReg", (req, res) => {
  const { staff_id, temp, signed_in_by, signed_in, signin_gate } = req.body;
  //console.log("reg data", req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  // console.log(
  //   "time",
  //   d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  // );

  database
    .select("*")
    .from("staff")

    .join("staff_signin", "staff.staff_id", "=", "staff_signin.staff_id")

    .where("staff.staff_id", "=", staff_id)
    .andWhere("staff_signin.signin_date", "=", date)
    .then((data) => {
      //console.log("Joined User", data);
      if (data.length > 0) {
        database("staff_signin_details")
          .insert({
            staff_id: staff_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signed_in_by: signed_in,
            signin_gate,
          })
          .then((data) => {
            database("users")
              .where(function () {
                this.where("stu_no", "=", staff_id);
              })
              .update({
                stu_status: 1,
              })
              .then((data) => {
                // res.send("updated the data");
              })
              .catch(
                (err) => {}
                // res.send(err)
              );
            res.send("Received the data");
            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => res.send(err));
      } else {
        database("staff_signin")
          .insert({
            staff_id: staff_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signed_in_by,
          })
          .then((data) => {
            console.log("Recevid staff members");
            database("staff_signin_details")
              .insert({
                staff_id: staff_id,
                temperature: temp,
                signin_date: date,
                signin_time: time,
                signed_in_by: signed_in,
                signin_gate,
              })
              .then((data) => {
                res.send("Received the data");
                console.log("Received the data");

                database
                  .select("*")
                  .from("staff")
                  // .join("finance", "students.stu_id", "=", "finance.stu_no")
                  .where({
                    staff_id: `${staff_id}`,
                  })
                  .then((data8) => {
                    database
                      .select("*")
                      .from("users")
                      .where("users.stu_no", "=", staff_id)
                      .then((data) => {
                        // res.send(data);
                        if (data.length == 0) {
                          const staffID = data8[0].staff_id.replace(/\s/g, "");
                          database("users")
                            .insert({
                              userfull_name: data8[0].staff_name,
                              username: staffID,
                              password: staffID,
                              email: `${data8[0].staff_name.replace(
                                /\s/g,
                                ""
                              )}@gmail.com`,
                              gendar: null,
                              phoneNo: null,
                              DOB: null,
                              Address: null,
                              user_image: staffID,
                              role: data8[0].role,
                              stu_no: staffID,
                              stu_status: 1,
                              is_class_rep: 0,
                            })
                            .then((data4) => {});
                        }
                      });
                  });
              })
              .catch((err) => console.log("errrr", err));
          })
          .catch((err) => res.send(err));
      }
    });
});

app.post("/studentSignout/", (req, res) => {
  const { studentNo, signed_in_by, signed_out_by, signin_time, signout_gate } =
    req.body;
  // console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

  database("stu_signin")
    // .where("stu_id", "=", studentNo)
    .where(function () {
      this.where("stu_id", "=", studentNo);
    })
    .andWhere(function () {
      this.where("signin_date", "=", date);
    })
    .andWhere(function () {
      this.where("signined_in_by", "=", signed_in_by);
    })
    .andWhere(function () {
      this.where("signin_time", "=", signin_time);
    })
    .select("*")
    .update({
      signed_out_by: signed_out_by,
      signout_time: time,
      signout_gate,
    })
    .then((data) => {
      database("users")
        .where(function () {
          this.where("stu_no", "=", studentNo);
        })
        .update({
          stu_status: 0,
        })
        .then((data) => {
          // res.send("updated the data");
        })
        .catch(
          (err) => {}
          // res.send(err)
        );
      res.send("received the data");
    });
});

app.post("/staffSignout/", (req, res) => {
  const { staff_id, signed_in_by, signed_out_by, signin_time, signout_gate } =
    req.body;
  //console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

  database("staff_signin_details")
    // .where("stu_id", "=", studentNo)
    .where(function () {
      this.where("staff_id", "=", staff_id);
    })
    .andWhere(function () {
      this.where("signin_date", "=", date);
    })
    .andWhere(function () {
      this.where("signed_in_by", "=", signed_in_by);
    })
    .andWhere(function () {
      this.where("signin_time", "=", signin_time);
    })
    .select("*")
    .update({
      signed_out_by: signed_out_by,
      signout_time: time,
      signout_gate,
    })
    .then((data) => {
      database("users")
        .where(function () {
          this.where("stu_no", "=", staff_id);
        })
        .update({
          stu_status: 0,
        })
        .then((data) => {
          // res.send("updated the data");
        })
        .catch(
          (err) => {}
          // res.send(err)
        );
      res.send("received the data");
    });
});

//check out which students subscribed for a particular lecture
app.post("/checkStudentSubscription/", (req, res) => {
  const { course_id, stu_id, date } = req.body;
  //console.log(req.body);
  const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
      stu_id,
    })
    .then((data) => {
      database("lecture_members")
        .where(function () {
          this.where("member_id", "=", stu_id);
        })
        .andWhere("lecture_id", course_id)
        .andWhere("date", date)
        .then((data8) => {
          res.send([...data, data8]);
        });
    });
});

//get the data about lectures that already started
app.post("/getLectureData/", (req, res) => {
  const { course_id, tt_id, day_id, selectedDate } = req.body;
  //console.log(req.body);
  const d = new Date(selectedDate);
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // console.log("Loooking for date", date);

  database("lectures")
    // .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_unit_id: course_id,
      l_tt_id: tt_id,
      l_day_id: day_id,
      date,
    })
    .then((data) => {
      database("lecture_members")
        .join("users", "lecture_members.member_id", "=", "users.stu_no")
        .select("*")

        .where({
          lecture_id: course_id,
          day_id,
          date,
        })
        .then((data8) => {
          res.send([...data, data8]);
        });
    });
});

app.get("/getEnrolledStudents/:course_id", (req, res) => {
  const { course_id } = req.params;
  //console.log("enrollment sent records", req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
    })
    .then((data) => {
      //console.log("Enrolled students here", data);
      res.send(data);
    });
});

app.get("/getEnrolledStudents/:course_id", (req, res) => {
  const { course_id } = req.params;
  //console.log("enrollment sent records", req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
    })
    .then((data) => {
      //console.log("Enrolled students here", data);
      res.send(data);
    });
});

app.post("/api/login", (req, res) => {
  const { username, password, token } = req.body;
  // console.log(req.body);
  database
    .select("*")
    .where({
      username: username,
      password: password,
    })
    .from("users")
    .then((user) => {
      // console.log(user);
      if (!user[0]) {
        return res.status(400).json({ error: "Invalid email or password " });
      } else {
        database
          .select("*")
          .from("users")
          .where({
            username: username,
            password: password,
          })
          .update({
            token: token,
          })
          .then((data2) => {
            console.log(`Updated ${username}'s push token`, data2);
          })
          .catch((err) => {
            console.log("error in storing token", err);
          });
        if (user[0].role == "Student") {
          database
            // .orderBy("id")
            .select("*")
            .from("students_biodata")
            .where(function () {
              this.where("stdno", "=", user[0].stu_no);
            })
            .then((studentData) => {
              database
                // .orderBy("id")
                .select("*")
                .from("stu_selected_course_units")
                .join("modules", function () {
                  this.on(
                    "stu_selected_course_units.course_id",
                    "=",
                    "modules.course_id"
                  ).andOn(
                    "stu_selected_course_units.course",
                    "=",
                    "modules.course_code"
                  );
                })
                // .join(
                //   "course_units",
                //   "stu_selected_course_units.course_id",
                //   "=",
                //   "course_units.course_id"
                // )
                .where(function () {
                  this.where("stu_id", "=", user[0].stu_no);
                })
                .then((courseUnitsData) => {
                  return res.send({
                    ...user[0],
                    otherData: studentData,
                    imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
                    studentCourseUnits: courseUnitsData,
                  });
                });
            });
        } else {
          return res.send({
            ...user[0],
            imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
          });
        }
      }
      // const token = jwt.sign(
      //   {
      //     id: user[0].id,
      //     email: user[0].email,
      //     name: user[0].username,
      //     address: user[0].address,
      //     fullName: user[0].fullname,
      //     image: user[0].image,
      //   },
      //   secret
      // );
    })
    .catch((err) => {
      return res.status(400).json({ error: "Invalid email or password" });
    });
});

app.post("/api/removeToken", (req, res) => {
  const { username, password, token } = req.body;
  // console.log("user info", req.body);
  database
    .select("*")
    .from("users")
    .where({
      username: username,
      password: password,
    })
    .update({
      token: null,
    })
    .then((data2) => {
      // console.log(`removed ${username}'s push token`);
    });
});

app.post("/api/addRoom", (req, res) => {
  const { roomName } = req.body;
  // console.log("Data", req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  //console.log(req.body);
  database("rooms")
    .insert({
      room_name: roomName,
    })
    .then((data) => res.status(200).send("success"))
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.post("/api/addVisitor", (req, res) => {
  const { full_name, reason, office, signed_in_by, signin_gate } = req.body;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  //console.log(req.body);
  database("visitors")
    .insert({
      v_full_name: full_name,
      reason,
      office,
      signed_in_by,
      date,
      signin_gate,
    })
    .then((data) => res.status(200).send("Received the data"))
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.post("/api/addExamTimetable", (req, res) => {
  const { headers, timetable } = req.body;
  // console.log("Data received", req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  //inserting into the exams group
  database
    .select("*")
    .where({
      school_id: headers.school.value,
      study_time_id: headers.studyTime.value,
      month: headers.month.value,
      year: headers.year.value,
    })
    .from("exam_groups")
    .then((d) => {
      if (d.length == 0) {
        database("exam_groups")
          .insert({
            school_id: headers.school.value,
            study_time_id: headers.studyTime.value,
            month: headers.month.value,
            year: headers.year.value,
          })
          .then((data) => {
            console.log("Finished storing data in exam groups");

            database
              .select("*")
              .where({
                school_id: headers.school.value,
                study_time_id: headers.studyTime.value,
                month: headers.month.value,
                year: headers.year.value,
              })
              .from("exam_groups")
              .then((data2) => {
                console.log("data here", data2);
                const fieldsToInsert = timetable.map((field) => ({
                  exam_group_id: data2[0].exam_group_id,
                  date:
                    new Date(field.date).getFullYear() +
                    "-" +
                    (new Date(field.date).getMonth() + 1) +
                    "-" +
                    new Date(field.date).getDate(),
                  session_id: field.session.value,
                  room_id: field.room.value,
                  course_unit_code: field.courseUnit.value,
                  course_unit_name: field.courseUnit.label,
                }));

                database("exam_timetable")
                  .insert(fieldsToInsert)
                  .then(() => {
                    res.status(200).send("Success");
                  })
                  .catch((err) => {
                    console.log("Failed to save the data", err);
                    res.status(400).send("fail");
                  });
              });

            // res.status(200).send("Received the data");
          })
          .catch((err) => {
            console.log("Fail", err);
            res.status(400).send("Failed to send the data " + err);
          });
      } else {
        database
          .select("*")
          .where({
            school_id: headers.school.value,
            study_time_id: headers.studyTime.value,
            month: headers.month.value,
            year: headers.year.value,
          })
          .from("exam_groups")
          .then((data2) => {
            console.log("data here", data2);
            const fieldsToInsert = timetable.map((field) => ({
              exam_group_id: data2[0].exam_group_id,
              date:
                new Date(field.date).getFullYear() +
                "-" +
                (new Date(field.date).getMonth() + 1) +
                "-" +
                new Date(field.date).getDate(),
              session_id: field.session.value,
              room_id: field.room.value,
              course_unit_code: field.courseUnit.value,
              course_unit_name: field.courseUnit.label,
            }));

            database("exam_timetable")
              .insert(fieldsToInsert)
              .then(() => {
                res.status(200).send("Success");
              })
              .catch((err) => {
                console.log("Failed to save the data", err);
                res.status(400).send("fail");
              });
          });
      }
    });
});

app.post("/api/examTT", (req, res) => {
  // const { date, room, session } = req.body;
  console.log("Received this", req.body);

  // const d =
  //   new Date(date).getFullYear() +
  //   "-" +
  //   (new Date(date).getMonth() + 1) +
  //   "-" +
  //   new Date(date).getDate();
  // console.log("Data got", req.body);
  database
    .select("*")
    // .where({
    //   assigned_date: date,
    //   room_id: room,
    //   session_id: session,
    // })
    .from("exam_groups")
    .join(
      "exam_timetable",
      "exam_groups.exam_group_id",
      "=",
      "exam_timetable.exam_group_id"
    )
    .join("schools", "exam_groups.school_id", "=", "schools.school_id")
    .join("rooms", "exam_timetable.room_id", "=", "rooms.room_id")
    .join(
      "exam_sessions",
      "exam_timetable.session_id",
      "=",
      "exam_sessions.s_id"
    )
    .where("exam_groups.month", "=", req.body.month.value)
    .andWhere("exam_groups.year", "=", req.body.year.value)
    .andWhere("exam_groups.study_time_id", "=", req.body.studyTime.value)
    .andWhere("schools.alias", "=", req.body.school)
    // .join("exam_timetable", function () {
    //   this.on("invigilators.assigned_date", "=", "exam_timetable.date")
    //     .andOn("invigilators.room_id", "=", "exam_timetable.room_id")
    //     .andOn("invigilators.session_id", "=", "exam_timetable.session_id");
    // })
    // .where(function () {
    //   this.where("invigilators.assigned_date", "=", date)
    //     .andWhere("invigilators.room_id", "=", room)
    //     .andWhere("invigilators.session_id", "=", session);
    // })
    .then((exData) => {
      res.send(exData);
    })
    .catch((err) => console.log("error ", err));
});

app.post("/api/exams", (req, res) => {
  const { date, room, session } = req.body;
  // console.log("Data got", req.body);
  database
    .select("course_unit_code", "course_unit_name")
    .where({
      date:
        new Date(date).getFullYear() +
        "-" +
        (new Date(date).getMonth() + 1) +
        "-" +
        new Date(date).getDate(),
      room_id: room.value,
      session_id: session.value,
    })
    .from("exam_timetable")
    .then((data) => {
      res.send(data);
    })
    .catch((err) => console.log("error ", err));
});

app.post("/api/invigilatorData", (req, res) => {
  const { date, room, session } = req.body;

  const d =
    new Date(date).getFullYear() +
    "-" +
    (new Date(date).getMonth() + 1) +
    "-" +
    new Date(date).getDate();
  console.log("Data got", req.body);
  database
    .select("*")
    // .where({
    //   assigned_date: date,
    //   room_id: room,
    //   session_id: session,
    // })
    .from("invigilators")
    .join("staff", "invigilators.lecturer_id", "=", "staff.staff_id")
    .join("rooms", "invigilators.room_id", "=", "rooms.room_id")
    .join("exam_sessions", "invigilators.session_id", "=", "exam_sessions.s_id")

    .where("invigilators.room_id", "=", room)
    .andWhere("invigilators.assigned_date", "=", d)
    .andWhere("invigilators.session_id", "=", session)
    // .join("exam_timetable", function () {
    //   this.on("invigilators.assigned_date", "=", "exam_timetable.date")
    //     .andOn("invigilators.room_id", "=", "exam_timetable.room_id")
    //     .andOn("invigilators.session_id", "=", "exam_timetable.session_id");
    // })
    // .where(function () {
    //   this.where("invigilators.assigned_date", "=", date)
    //     .andWhere("invigilators.room_id", "=", room)
    //     .andWhere("invigilators.session_id", "=", session);
    // })
    .then((invData) => {
      database
        .select("*")
        .where({
          date: d,
          room_id: room,
          session_id: session,
        })
        .from("exam_timetable")
        .then((exData) => {
          const data = {
            invigilators: invData,
            exams: exData,
          };
          res.send(data);
        });
    })
    .catch((err) => console.log("error ", err));
});

app.post("/api/updateRoomStatus", (req, res) => {
  const { lecturerId, roomId, assignedDate, sessionId } = req.body;

  const d = new Date(assignedDate);
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log("Room DATA", req.body);

  const currentDate = new Date();
  database
    .select("*")
    .from("invigilators")
    .where({
      room_id: roomId,
      assigned_date: date,
      session_id: sessionId,
      // lecturer_id: lecturerId,
    })
    .update({
      status: 1,
      time_start: currentDate.toLocaleTimeString(),
    })
    .then((data2) => {
      database
        .select("*")
        .from("invigilators_sammary")
        .where({
          room_id: roomId,
          assigned_date: date,
          session_id: sessionId,
        })
        .update({
          status: 1,
          time_start: currentDate.toLocaleTimeString(),
        })
        .then((data) => {
          console.log("Updated the sammary as well");
        });
      res.send(`updated room id ${roomId} status to started`);
    });
});

app.post("/api/endRoomSession", (req, res) => {
  const { lecturerId, roomId, assignedDate, sessionId } = req.body;

  const d = new Date(req.body.assigned_date);
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log("Room DATA", req.body);
  const currentDate = new Date();
  database
    .select("*")
    .from("invigilators")
    .where({
      room_id: req.body.room_id,
      assigned_date: date,
      session_id: req.body.session_id,
      // lecturer_id: req.body.staff_id,
    })
    .update({
      status: 2,
      time_end: currentDate.toLocaleTimeString(),
    })
    .then((data2) => {
      database
        .select("*")
        .from("invigilators_sammary")
        .where({
          room_id: req.body.room_id,
          assigned_date: date,
          session_id: req.body.session_id,
        })
        .update({
          status: 2,
          time_end: currentDate.toLocaleTimeString(),
        })
        .then((data) => {
          console.log("Updated the sammary to end as well");
        });
      res.send(`ended`);
    });
});

app.post("/api/getMyAssignedExams", (req, res) => {
  const { date, lecturer_id } = req.body;

  const d =
    new Date(date).getFullYear() +
    "-" +
    (new Date(date).getMonth() + 1) +
    "-" +
    new Date(date).getDate();

  let newArr = [];

  console.log("Data got", req.body);
  const dd = new Date("2022-11-24");
  const current_date =
    dd.getFullYear() + "-" + (dd.getMonth() + 1) + "-" + dd.getDate();

  console.log("Today is ", current_date);
  var m1 = moment(`${current_date} 7:00AM`, "YYYY-MM--DD h:mmA");
  // var m1 = moment();

  var moment1 = moment(`${current_date}`, "YYYY-MM--DD");
  // var moment1 = moment();
  database
    .select("*")
    // .where({
    //   assigned_date: date,
    //   room_id: room,
    //   session_id: session,
    // })
    .from("invigilators")
    .join("staff", "invigilators.lecturer_id", "=", "staff.staff_id")
    .join("rooms", "invigilators.room_id", "=", "rooms.room_id")
    .join("exam_sessions", "invigilators.session_id", "=", "exam_sessions.s_id")

    .where("invigilators.lecturer_id", "=", lecturer_id)
    .andWhere("invigilators.assigned_date", "=", d)
    // .andWhere("invigilators.session_id", "=", session)
    // .join("exam_timetable", function () {
    //   this.on("invigilators.assigned_date", "=", "exam_timetable.date")
    //     .andOn("invigilators.room_id", "=", "exam_timetable.room_id")
    //     .andOn("invigilators.session_id", "=", "exam_timetable.session_id");
    // })
    // .where(function () {
    //   this.where("invigilators.assigned_date", "=", date)
    //     .andWhere("invigilators.room_id", "=", room)
    //     .andWhere("invigilators.session_id", "=", session);
    // })
    .then((invData) => {
      invData.forEach((invigilatorData, index) => {
        var m2 = moment(`${d} `, "YYYY-MM--DD h:mmA");

        var moment2 = moment(`${d}`, "YYYY-MM--DD");
        console.log(
          "duration here",
          moment.duration(moment2.diff(moment1))._data.days
        );

        if (moment.duration(moment2.diff(moment1))._data.days > 0) {
          // console.log(moment.duration(moment2.diff(moment1))._data.days);
          // console.log("Lecture is not supposed to be taught now");
          newArr.push({ ...invigilatorData, inv_status: "not now" });
          // console.log({ ...item, status: "not now" });
        } else {
          if (moment.duration(moment2.diff(moment1))._data.days == 0) {
            newArr.push({ ...invigilatorData, inv_status: "on" });
          } else if (m1.isBefore(m2)) {
            // console.log({ ...item, status: "on" });
            newArr.push({ ...invigilatorData, inv_status: "off" });
            // console.log("Lecture is still on");
          } else {
            // console.log({ ...item, status: "off" });
            newArr.push({ ...invigilatorData, inv_status: "off" });
            // console.log("Lecture is supposed to have ended");
          }
        }

        // newArr.push(item);

        // console.log({ ...item, ...data3[0] });

        // console.log(item.c_unit_id, reqItem);
      });

      console.log("invData", newArr);

      res.send(newArr);
    })
    .catch((err) => console.log("error ", err));
});

app.post("/api/saveRegisteredModule", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  // console.log("Data Received", req.body);

  const d1 = new Date(req.body.assigned_date);
  const assignedDate =
    d1.getFullYear() + "-" + (d1.getMonth() + 1) + "-" + d1.getDate();

  const d = new Date();
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  console.log("Formated", formatedDate);
  console.log("Formated time", d.toLocaleTimeString());

  database("modules_registered")
    .insert({
      module_code: req.body.module_code,
      module_title: req.body.module_title,
      module_sem: req.body.module_sem,
      module_status: req.body.module_status,
      module_year: req.body.module_year,
      yrsem: req.body.yrsem,
      credit_units: req.body.credit_units,
      stdno: req.body.stdno,
      registered_by: req.body.registered_by,
      time_in: d.toLocaleTimeString(),
      date_start: formatedDate,
    })
    .then((data) => {
      //checking if any student has already come for the specified unit
      database
        .select("*")
        .from("courseunits_in_exam_rooms")
        .where({
          course_unit_code: req.body.module_code,
          course_unit_name: req.body.module_title,
          room_id: req.body.room_id,
          session_id: req.body.session_id,
          assigned_date: assignedDate,
        })
        .then((data) => {
          if (data.length == 0) {
            database("courseunits_in_exam_rooms")
              .insert({
                course_unit_code: req.body.module_code,
                course_unit_name: req.body.module_title,
                room_id: req.body.room_id,
                session_id: req.body.session_id,
                assigned_date: assignedDate,
              })
              .then((data) => {
                console.log("Saved that course unit");
              });
          }
        });

      res.status(200).send("received the data");
    })
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.post("/api/saveExemption", (req, res) => {
  // const d1 = new Date(req.body.assigned_date);
  // const assignedDate =
  //   d1.getFullYear() + "-" + (d1.getMonth() + 1) + "-" + d1.getDate();

  // const d = new Date();
  // const formatedDate =
  //   d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // console.log("Formated", formatedDate);
  // console.log("Formated time", d.toLocaleTimeString());

  // console.log("Data received here", req.body);

  //checking if any student has already come for the specified unit
  database
    .select("*")
    .from("exemptions")
    .where({
      module_code: req.body.courseCode,
      module_title: req.body.courseName,
      stdno: req.body.stuNo,
      exemption_status: req.body.exemptionStatus,
    })
    .then((data) => {
      if (data.length == 0) {
        database("exemptions")
          .insert({
            module_code: req.body.courseCode,
            module_title: req.body.courseName,
            exemption_status: req.body.exemptionStatus,
            stdno: req.body.stuNo,
            exempted_by: "AR",
          })
          .then((data) => {
            console.log("Saved that course unit");
            res.status(200).send("received the data");
          });
      }
    })
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.post("/api/examsDidInRoom", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  console.log("Data Received in room", req.body);

  let count = 0;
  const d1 = new Date(req.body.assigned_date);
  const assignedDate =
    d1.getFullYear() + "-" + (d1.getMonth() + 1) + "-" + d1.getDate();

  database
    .select("*")
    .from("courseunits_in_exam_rooms")
    .where({
      room_id: req.body.room_id,
      session_id: req.body.session_id,
      assigned_date: assignedDate,
    })
    .then((data) => {
      console.log("ney data", data);
      let newArr = [];

      if (data.length == 0) {
        res.send(data);
      } else {
        data.forEach((exam, index) => {
          let d4 = async (callback) => {
            await database
              .select("*")
              .from("modules_registered")
              .where({
                module_title: exam.course_unit_name,
              })
              .then((data4) => {
                // res.send(data);
                let data = async (callback) => {
                  await database
                    .select("*")
                    .from("modules_registered")
                    .join(
                      "students_handin",
                      "modules_registered.cunit_reg_id",
                      "=",
                      "students_handin.module_reg_id"
                    )

                    .where(
                      "modules_registered.module_title",
                      "=",
                      exam.course_unit_name
                    )
                    .then((data2) => {
                      // return result;
                      // console.log("result ", result);
                      let obj = {
                        registered: data4.length,
                        handed_in: data2.length,
                        didnt_handin: data4.length - data2.length,
                      };
                      newArr.push({ ...exam, ...obj });
                      callback(newArr);
                      // res = result;
                    });
                };

                data(function (result) {
                  // console.log("Call back result", result);
                  callback(result);
                });
              });
          };

          d4(function (result) {
            if (data.length - 1 == index) {
              res.send(result);
            }
            // console.log("Call back in loop now", result);
            // callback(result)
          });
        });
      }
    });
});

app.get("/api/getExamInfo/:course_unit_name", (req, res) => {
  const { course_unit_name } = req.params;

  databaseß
    .select("*")
    .from("modules_registered")
    .where({
      module_title: course_unit_name,
    })
    .then((data) => {
      // res.send(data);
      database
        .select("*")
        .from("modules_registered")
        .join(
          "students_handin",
          "modules_registered.cunit_reg_id",
          "=",
          "students_handin.module_reg_id"
        )

        .where("modules_registered.module_title", "=", course_unit_name)
        .then((data2) => {
          let obj = {
            registered: data.length,
            handed_in: data2.length,
            didnt_handin: data.length - data2.length,
          };

          newArr.p;

          res.send(obj);
        });
    });
});

app.post("/api/examHandin", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  console.log("Data Received for handin", req.body);
  const d = new Date();
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  console.log("Formated", formatedDate);
  console.log("Formated time", d.toLocaleTimeString());

  database("students_handin")
    .insert({
      module_reg_id: req.body.moduleRegId,
      time_handin: d.toLocaleTimeString(),
      date_handin: formatedDate,
    })
    .then((data) => {
      res.status(200).send("received the data");
    })
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.post("/api/addStudentBookletNos", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  console.log("Data Received", req.body);
  let finished = false;
  const d = new Date();
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  console.log("Formated", formatedDate);
  console.log("Formated time", d.toLocaleTimeString());

  const fieldsToInsert = req.body.bookletNos.map((b) => ({
    module_reg_id: req.body.module_reg_id,
    booklet_no: b.booklet_no,
  }));

  // console.log("Fields to insert", fieldsToInsert);

  // const query = database("student_registered_booklets")
  //   .insert(fieldsToInsert)
  //   .toSQL();
  // const sql = query.sql.replace("insert", "insert ignore");
  // database
  //   .raw(sql, query.bindings)
  //   .then((data) => res.status(200).send("Received the data"))
  //   .catch((err) => res.status(400).send("Failed to send the data " + err));
  req.body.bookletNos.map((b) => {
    database
      .select("*")
      .from("student_registered_booklets")
      .where({
        module_reg_id: req.body.module_reg_id,
        booklet_no: b.booklet_no,
      })
      .then((data) => {
        if (data.length == 0) {
          database("student_registered_booklets")
            .insert({
              module_reg_id: req.body.module_reg_id,
              booklet_no: b.booklet_no,
            })
            .then((data) => console.log("Saved", b.booklet_no));
          // .catch((err) =>
          //   res.status(400).send("Failed to send the data " + err)
          // );
        }
      });
  });

  res.send("Received the data");
  // database
  //   .select("*")
  //   .from("student_registered_booklets")
  //   .where({
  //     module_reg_id: 7,
  //     booklet_no: "6000",
  //   })
  //   .then((data) => {
  //     if (data.length == 0) {
  //       database("student_registered_booklets")
  //         .insert(fieldsToInsert)
  //         .then((data) => res.status(200).send("Received the data"))
  //         .catch((err) =>
  //           res.status(400).send("Failed to send the data " + err)
  //         );
  //     } else {
  //       res.status(200).send("Received the data");
  //     }
  //   });

  // database("student_registered_booklets")
  //   .insert(fieldsToInsert)
  //   .then((data) => res.status(200).send("Received the data"))
  //   .catch((err) => res.status(400).send("Failed to send the data " + err));

  // database("modules_registered")
  //   .insert({
  //     module_code: req.body.module_code,
  //     module_title: req.body.module_title,
  //     module_sem: req.body.module_sem,
  //     module_status: req.body.module_status,
  //     module_year: req.body.module_year,
  //     yrsem: req.body.yrsem,
  //     credit_units: req.body.credit_units,
  //     stdno: req.body.stdno,
  //     registered_by: req.body.registered_by,
  //     time_in: d.toLocaleTimeString(),
  //     date_start: formatedDate,
  //   })
  //   .then((data) => {
  //     res.status(200).send("received the data");
  //     // const fieldsToInsert = invigilators.map((invigilator) => ({
  //     //   lecturer_id: invigilator.value,
  //     //   room_id: room.value,
  //     //   assigned_date: formatedDate,
  //     //   session_id: session.value,
  //     //   status,
  //     //   assigned_by,
  //     // }));
  //     // //console.log(req.body);

  //     // database("invigilators")
  //     //   .insert(fieldsToInsert)
  //     //   .then((data) => res.status(200).send("Received the data"))
  //     //   .catch((err) => res.status(400).send("Failed to send the data " + err));
  //   })
  //   .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.get("/api/getStudentRegBookletNos/:moduleRegId", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  const { moduleRegId } = req.params;
  console.log("Data Received", req.params);
  const d = new Date();
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("student_registered_booklets")
    .where({
      module_reg_id: moduleRegId,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/api/getStudentRegisteredModules/:studentNo", (req, res) => {
  const { studentNo } = req.params;

  console.log("Student data", studentNo);
  database
    .select("*")
    .from("modules_registered")
    .leftJoin(
      "students_handin",
      "modules_registered.cunit_reg_id",
      "=",
      "students_handin.module_reg_id"
    )

    .where("modules_registered.stdno", "=", studentNo)

    .then((data) => {
      database
        .select("*")
        .from("exemptions")
        .where({
          stdno: studentNo,
        })
        .then((data2) => {
          res.send([...data, ...data2]);
        });
    });
});

app.post("/api/addInvigilator", (req, res) => {
  const { room, invigilators, session, date, status, assigned_by } = req.body;
  // console.log("Date received", date);
  console.log("data got here", req.body);
  const d = new Date(date);
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  console.log("Formated", formatedDate);

  const d2 = new Date();

  database
    .select("*")
    .where({
      lecturer_id: invigilators[0].value,
      room_id: room.value,
      assigned_date: formatedDate,
      session_id: session.value,
      status,
      assigned_by,
      // time_start: d2.toLocaleTimeString(),
    })
    .from("invigilators_sammary")
    .then((invigilatoData) => {
      if (invigilatoData.length == 0) {
        database("invigilators_sammary")
          .insert({
            lecturer_id: invigilators[0].value,
            room_id: room.value,
            assigned_date: formatedDate,
            session_id: session.value,
            status,
            assigned_by,
            time_start: d2.toLocaleTimeString(),
          })
          .then((data) => {
            const fieldsToInsert = invigilators.map((invigilator) => ({
              lecturer_id: invigilator.value,
              room_id: room.value,
              assigned_date: formatedDate,
              session_id: session.value,
              status,
              assigned_by,
              time_start: d2.toLocaleTimeString(),
            }));
            //console.log(req.body);

            database("invigilators")
              .insert(fieldsToInsert)
              .then((data) => res.status(200).send("Received the data"))
              .catch((err) =>
                res.status(400).send("Failed to send the data " + err)
              );
          })
          .catch((err) =>
            res.status(400).send("Failed to send the data " + err)
          );
      } else {
        const fieldsToInsert = invigilators.map((invigilator) => ({
          lecturer_id: invigilator.value,
          room_id: room.value,
          assigned_date: formatedDate,
          session_id: session.value,
          status,
          assigned_by,
          time_start: d2.toLocaleTimeString(),
        }));
        //console.log(req.body);

        database("invigilators")
          .insert(fieldsToInsert)
          .then((data) => res.status(200).send("Received the data"))
          .catch((err) =>
            res.status(400).send("Failed to send the data " + err)
          );
      }
    });
});

app.post("/api/removeInvigilator", (req, res) => {
  // const { room, invigilators, session, date, status, assigned_by } = req.body;
  // console.log("Date received", date);
  console.log("data got here remove", req.body);
  // const d = new Date(date);
  // const formatedDate =
  //   d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // console.log("Formated", formatedDate);

  // const d2 = new Date();

  database("invigilators")
    .where("i_id", req.body.i_id)
    .del()
    .then((data) => {
      res.send("success");
    });

  // database
  //   .select("*")
  //   .where({
  //     lecturer_id: invigilators[0].value,
  //     room_id: room.value,
  //     assigned_date: formatedDate,
  //     session_id: session.value,
  //     status,
  //     assigned_by,
  //     // time_start: d2.toLocaleTimeString(),
  //   })
  //   .from("invigilators_sammary")
  //   .then((invigilatoData) => {
  //     if (invigilatoData.length == 0) {
  //       database("invigilators_sammary")
  //         .insert({
  //           lecturer_id: invigilators[0].value,
  //           room_id: room.value,
  //           assigned_date: formatedDate,
  //           session_id: session.value,
  //           status,
  //           assigned_by,
  //           time_start: d2.toLocaleTimeString(),
  //         })
  //         .then((data) => {
  //           const fieldsToInsert = invigilators.map((invigilator) => ({
  //             lecturer_id: invigilator.value,
  //             room_id: room.value,
  //             assigned_date: formatedDate,
  //             session_id: session.value,
  //             status,
  //             assigned_by,
  //             time_start: d2.toLocaleTimeString(),
  //           }));
  //           //console.log(req.body);

  //           database("invigilators")
  //             .insert(fieldsToInsert)
  //             .then((data) => res.status(200).send("Received the data"))
  //             .catch((err) =>
  //               res.status(400).send("Failed to send the data " + err)
  //             );
  //         })
  //         .catch((err) =>
  //           res.status(400).send("Failed to send the data " + err)
  //         );
  //     } else {
  //       const fieldsToInsert = invigilators.map((invigilator) => ({
  //         lecturer_id: invigilator.value,
  //         room_id: room.value,
  //         assigned_date: formatedDate,
  //         session_id: session.value,
  //         status,
  //         assigned_by,
  //         time_start: d2.toLocaleTimeString(),
  //       }));
  //       //console.log(req.body);

  //       database("invigilators")
  //         .insert(fieldsToInsert)
  //         .then((data) => res.status(200).send("Received the data"))
  //         .catch((err) =>
  //           res.status(400).send("Failed to send the data " + err)
  //         );
  //     }
  //   });
});

app.get("/invigilators/", (req, res) => {
  const userId = 1;
  //console.log("number", lecture_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("invigilators")
    .join("staff", "invigilators.lecturer_id", "=", "staff.id")
    .join("rooms", "invigilators.room_id", "=", "rooms.room_id")
    .join("exam_sessions", "invigilators.session_id", "=", "exam_sessions.s_id")

    // .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

app.get("/invigilator_sammary/", (req, res) => {
  database
    .select(
      "staff_name",
      "room_name",
      "assigned_date",
      "session_name",
      "status",
      "assigned_by",
      "invigilators_sammary.room_id",
      "invigilators_sammary.session_id"
    )
    .from("invigilators_sammary")
    .join("staff", "invigilators_sammary.lecturer_id", "=", "staff.staff_id")
    .join("rooms", "invigilators_sammary.room_id", "=", "rooms.room_id")
    .join(
      "exam_sessions",
      "invigilators_sammary.session_id",
      "=",
      "exam_sessions.s_id"
    )
    .orderBy("i_id")

    // .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

app.get("/invigilator_details/", (req, res) => {
  const { room_id, date, session_id } = req.body;
  const userId = 1;
  //console.log("number", lecture_id);
  const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("invigilators")
    // .where({
    //   // room_id: room_id,
    //   assigned_date: date,
    //   session_id: session_id,
    // })
    .join("staff", "invigilators.lecturer_id", "=", "staff.staff_id")
    .join("rooms", "invigilators.room_id", "=", "rooms.room_id")
    .join("exam_sessions", "invigilators.session_id", "=", "exam_sessions.s_id")

    .where("invigilators.room_id", "=", room_id)
    .andWhere("invigilators.assigned_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

app.post("/lectureHasEnded", (req, res) => {
  const data = req.body;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(req.body);

  database
    .select("*")
    .from("lecture_members")
    .where({
      member_id: data.stdno,
      date: data.date,
      lecture_id: data.lecture_id,
      // day_id: msg.day_id,
    })
    .then((memberData) => {
      database
        .select("*")
        .from("lectures")
        .where({
          // lecture_id: data.lecture_id,
          l_tt_id: data.tt_id,
          course_unit_id: data.lecture_id,
          l_day_id: data.day_id,
          date: data.date,
        })
        .then((lectureData) => {
          // console.log({
          //   memberData: memberData[0],
          //   lectureData: lectureData[0],
          // });
          res.send({
            memberData: memberData[0],
            lectureData: lectureData[0],
          });
          // io.in(`${socket.id}`).emit("endedLectureDetails", );
        });
    });
});

// app.post("/virtualLectureHasStarted", (req, res) => {
//   const d = new Date();
//   const date =
//     d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + data.selectedDate;

//   console.log("Data abt the virtual lecture", req.body);
//   database
//     .select("*")
//     .from("timetable")
//     .where("timetable.tt_id", "=", req.body.timetable_id)
//     .then((data2) => {
//       // res.send(data);
//       database("lectures")
//         .where(function () {
//           this.where("l_tt_id", "=", req.body.timetable_id)
//             .andWhere("l_date", "=", req.body.l_date)
//             .andWhere("l_month", "=", req.body.l_month)
//             .andWhere("l_year", "=", req.body.l_year);
//         })
//         .then((data5) => {
//           if (data5.length == 0) {
//             database("lectures")
//               .insert({
//                 l_tt_id: req.body.timetable_id,
//                 l_day_id: req.body.day_id,
//                 course_unit_id: data2[0].c_unit_id,
//                 date: req.body.date,
//                 l_date: req.body.l_date,
//                 l_month: req.body.l_month,
//                 l_year: req.body.l_year,
//                 has_started: req.body.started,
//                 started_at: new Date().toLocaleTimeString(),
//               })
//               .then((data) => {
//                 // res.send("lecture added Successfully");
//                 console.log("Virtual lecture added Successfully");
//               })
//               .catch((err) => console.log("error in adding lecture", err));
//           }
//         });

//       const roomToLeave = [...socket.rooms][1];
//       if (roomToLeave) {
//         socket.leave(roomToLeave);
//       }
//       console.log(data2[0].c_unit_id);
//       socket.join(`${data2[0].c_unit_id}`);

//       const room = [...socket.rooms][1];
//       io.in(`${room}`).emit("lectureHasStartedFromServer", {
//         course_id: data2[0].c_unit_id,
//         started: true,
//       });

//       database("lecture_members")
//       .insert({
//         member_id: req.body.member_id,
//         day_id: req.body.day_id,
//         date: req.body.date,
//         lecture_id: req.body.lecture_id,
//         status: 1,
//         is_class_rep: req.body.isClassRep,
//         joined_at: joinedAt,
//       })
//       .then((data8) => {
//         console.log("Virtual Member added sucessfully");
//       });

//       members.forEach((member) => {
//         if (member.room == `${data2[0].c_unit_id}`) {
//           if (member.role == "Lecturer") {
//             member.status = "true";
//             //inserting the lecturer in the lecture members table
//             database("lecture_members")
//               .where(function () {
//                 this.where("member_id", "=", member.id);
//               })
//               .andWhere("lecture_id", member.room)
//               .andWhere("date", data.date)
//               .then((data10) => {
//                 console.log("Member in database", data10);
//                 if (data10.length == 0) {
//                   //user is not there, so we a adding the student
//                   addMember(
//                     member.id,
//                     data.day_id,

//                     data.date,
//                     data2[0].c_unit_id,
//                     1,
//                     0,
//                     new Date().toLocaleTimeString()
//                   );
//                 }
//               });
//           } else if (member.is_class_rep == "1") {
//             member.status = "true";

//             database("lecture_members")
//               .where(function () {
//                 this.where("member_id", "=", member.id);
//               })
//               .andWhere("lecture_id", member.room)
//               .andWhere("date", data.date)
//               .then((data10) => {
//                 console.log("Member in database", data10);
//                 if (data10.length == 0) {
//                   //user is not there, so we a adding the student
//                   addMember(
//                     member.id,
//                     data.day_id,

//                     data.date,
//                     data2[0].c_unit_id,
//                     1,
//                     1,
//                     new Date().toLocaleTimeString()
//                   );
//                 }
//               });
//           }
//         }
//       });

//       // console.log("Data to be got", data);

//       const membersInRoom = getMembersInRoom(data2[0].c_unit_id);
//       io.in(`${room}`).emit("updatedMembersList", membersInRoom);
//       // const membersInRoom = getMembersInRoom(data);

//       //     database("lecture_members")
//       // .where(function () {
//       //   this.where("day_id", "=", data.day_id);
//       // })
//       // .andWhere("lecture_id", data.lecture_id)
//       // .andWhere("date", data.date)
//       // .then((data12) => {
//       //   console.log("Returned the following members", data12);
//       //   io.in(`${room}`).emit("updatedMembersList", data12);
//       // });

//       // console.log("Memebers in the room ", membersInRoom);

//       // console.log("rooms", socket.rooms);
//       let customList = [];
//       // members.forEach((member) => {
//       //   if (member.room == `${data2[0].c_unit_id}`) {
//       //     customList.push(member);
//       //   }
//       // });

//       // io.in(`${room}`).emit("updatedMembersList", {
//       //   members: customList,
//       //   count: members.length,
//       // });

//       // console.log("Updated Members", members);
//       checkMembers("/", room);

//       // database
//       //   .select("*")
//       //   .from("stu_selected_course_units")
//       //   .where("stu_selected_course_units.course_id", "=", 9)
//       //   .then((data3) => {
//       //     console.log("students enrolled in the unit", data3);
//       //     data3.forEach((student) => {
//       //       socket.join(student.stu_id);
//       //     });
//       //   });
//     });
// });

const expressServer = app.listen(port, baseIp, () =>
  console.log(`App is running on port ${port}`)
);

const io = socketio(expressServer);

io.on("connection", (socket) => {
  // console.log(`[${socket.id}] socket connected`);

  // io.emit("welcome", "Welcome to the socket io server");

  // const clients = await io.in("9").allSockets();
  // console.log("Clients", clients);

  socket.on("thanks", (msg) => {
    console.log(msg);
  });

  socket.on("lectureHasEnded", (msg) => {
    const d = new Date();
    const date = msg.year + "-" + msg.month + "-" + data.selectedDate;

    console.log("lecture has ended", msg);

    database
      .select("*")
      .from("lectures")
      .where({
        //lecture_id: msg.lecture_id,
        l_tt_id: msg.timetable_id,
        course_unit_id: msg.course_unit_id,
        l_day_id: msg.day_id,
        date: msg.fullDate,
      })
      .update({
        has_ended: 1,
        ended_At: new Date().toLocaleTimeString(),
      })
      .then((data2) => {
        console.log("Updated lecture ended");
      })
      .then((result) => {
        database
          .select("*")
          .from("lectures")
          .where({
            //lecture_id: msg.lecture_id,
            l_tt_id: msg.timetable_id,
            course_unit_id: msg.course_unit_id,
            l_day_id: msg.day_id,
            date: msg.fullDate,
          })
          .then((res) => {
            io.in(`${msg.course_unit_id}`).emit("lectureHasEndedToClients", {
              course_id: msg.course_unit_id,
              lecture_id: msg.lecture_id,
              ended: true,
              timetable_id: msg.timetable_id,
              lecturer_id: msg.lecturer_id,
              lectureData: res[0],
            });
          });
      })
      .catch((err) => {
        console.log("Error in updating lecture ended", err);
      });
  });

  socket.on("rateTheLecture", (msg) => {
    console.log("Rate the lecture", msg);

    io.in(`${socket.id}`).emit("rateTheLectureToClient", "rate please");
  });

  socket.on("saveMyRating", (data) => {
    // console.log("My rating", data);
    // console.log(socket.id);
    // console.log([...socket.rooms]);
    io.in(socket.id).emit("testingToMeOnly", "Am send as me ");
    database
      .select("*")
      .from("lecture_members")
      .where({
        member_id: data.stdno,
        date: data.date,
        lecture_id: data.lecture_id,
        // day_id: msg.day_id,
      })
      .update({
        rating: data.rating,
        // ended_At: new Date().toLocaleTimeString(),
      })
      .then((data2) => {
        console.log("Updated lecture rating for ", data.stdno);
      })
      .catch((err) => {
        console.log("Error in updating lecture rating", err);
      });

    database
      .select("*")
      .from("lecture_members")
      .where({
        member_id: data.stdno,
        date: data.date,
        lecture_id: data.lecture_id,
        // day_id: msg.day_id,
      })
      .then((memberData) => {
        database
          .select("*")
          .from("lectures")
          .where({
            // lecture_id: data.lecture_id,
            l_tt_id: data.tt_id,
            course_unit_id: data.lecture_id,
            l_day_id: data.day_id,
            date: data.date,
          })
          .then((lectureData) => {
            // console.log({
            //   memberData: memberData[0],
            //   lectureData: lectureData[0],
            // });

            io.in(`${socket.id}`).emit("endedLectureDetails", {
              memberData: memberData[0],
              lectureData: lectureData[0],
            });
          });
      });
  });

  socket.on("replyToSserver", (data) => {
    console.log("Just received a message from a happy client", data);
  });

  // socket.on("addStudentToClass", (data) => {
  //   const d = new Date();
  //   // const date =
  //   //   d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + data.selectedDate;
  //   const date = data.year + "-" + data.month + "-" + data.selectedDate;
  //   // console.log(`Adding ${data.stu_no} to class ${data.course_id}`);

  //   database("users")
  //     .where(function () {
  //       this.where("stu_no", "=", data.stu_no);
  //     })

  //     .then((data2) => {
  //       const normalStudent = addUser(
  //         data2[0].stu_no,
  //         data2[0].userfull_name,
  //         `${data.course_id}`,
  //         "true",
  //         data2[0].role,
  //         `${data2[0].is_class_rep}`,
  //         new Date().toLocaleTimeString()
  //       );

  //       //check in the databse to see if the student is already there
  //       database("lecture_members")
  //         .where(function () {
  //           this.where("member_id", "=", data.stu_no);
  //         })
  //         // .andWhere("course_id", course_id)
  //         .andWhere("lecture_id", data.course_id)
  //         .andWhere("date", "=", data.date)
  //         .then((data10) => {
  //           console.log("Member in database", data10);
  //           if (data10.length == 0) {
  //             //user is not there, so we a adding the student
  //             addMember(
  //               data.stu_no,
  //               data.day_id,
  //               date,
  //               data.course_id,
  //               1,
  //               0,
  //               new Date().toLocaleTimeString()
  //             );
  //           }
  //         })
  //         .then((result) => {
  //           // const membersInRoom = getMembersInRoom(data);
  //           // io.in(`${room}`).emit("updatedMembersList", membersInRoom);
  //           // database("lecture_members")
  //           //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
  //           //   .where(function () {
  //           //     this.where("day_id", "=", data.day_id);
  //           //   })
  //           //   .andWhere("lecture_id", data.course_id)
  //           //   .andWhere("date", "=", data.date)
  //           //   .then((data10) => {
  //           //     console.log("Returned the following members", data10);
  //           //     //io.in(`${room}`).emit("updatedMembersList", data10);
  //           //     io.in(`${data.course_id}`).emit("updatedMembersList", data10);
  //           //     io.in(`${data.course_id}`).emit(
  //           //       "addStudentToClassFromServer",
  //           //       data
  //           //     );
  //           //     //customList.push(data10);
  //           //   });
  //           // database
  //           //   .select("*")
  //           //   .from("lecture_members")
  //           //   .then((allData) => {
  //           //     console.log("All data from DB", allData);
  //           //   });
  //         });
  //       // console.log(normalStudent);
  //       // console.log(
  //       //   `Adding ${data.stu_no} to class ${data.course_id} in database block`
  //       // );
  //       // console.log(members);

  //       const indexOfObject = members.findIndex((object) => {
  //         return object.id === `${data.stu_no}`;
  //       });
  //       members.splice(indexOfObject, 1);

  //       console.log("indexOfObject", indexOfObject);
  //       if (indexOfObject !== -1) {
  //         //student already in the list
  //         // members.splice(indexOfObject, 1)
  //         console.log(
  //           "student already in the list, am just updating the status"
  //         );
  //         io.in(`${data.course_id}`).emit(
  //           "studentAlreadyInClass",
  //           "student already in class"
  //         );

  //         members[indexOfObject].status = "true";

  //         const membersInRoom = getMembersInRoom(data);

  //         console.log("Memebers in the room 555555", membersInRoom);

  //         io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);
  //         io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
  //       } else {
  //         //student not in the list
  //         members.push(normalStudent);
  //         console.log("student not in the list, am dding him there");
  //         const membersInRoom = getMembersInRoom(data);

  //         console.log("Memebers in the room 89787787", membersInRoom);

  //         io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);

  //         io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
  //       }
  //     })

  //     .catch(
  //       (err) => {}
  //       // res.send(err)
  //     );
  // });

  socket.on("addStudentToClass", (data) => {
    const d = new Date();
    const date = data.year + "-" + data.month + "-" + data.selectedDate;
    // console.log(`Adding ${data.stu_no} to class ${data.course_id}`);

    database("users")
      .where(function () {
        this.where("stu_no", "=", data.stu_no);
      })

      .then((data2) => {
        const normalStudent = addUser(
          data2[0].stu_no,
          data2[0].userfull_name,
          `${data.course_id}`,
          "true",
          data2[0].role,
          `${data2[0].is_class_rep}`,
          new Date().toLocaleTimeString()
        );

        //check in the database to see if the student is already there
        database("lecture_members")
          .where(function () {
            this.where("member_id", "=", data.stu_no);
          })
          // .andWhere("course_id", course_id)
          .andWhere("lecture_id", data.course_id)
          .andWhere("date", data.date)
          .then((data10) => {
            // console.log("Member in database", data10);
            if (data10.length == 0) {
              //user is not there, so we a adding the student
              addMember(
                data2[0].stu_no,
                data.day_id,
                date,
                data.course_id,
                1,
                0,
                new Date().toLocaleTimeString()
              );
            }
          })
          .then((result) => {
            database("lecture_members")
              .join("users", "lecture_members.member_id", "=", "users.stu_no")
              .select("*")

              .where({
                lecture_id: data.course_id,
                day_id: data.day_id,
                date: data.date,
              })
              .then((data8) => {
                //res.send([...data, data8]);
                //  console.log("updatedMembersList", data8);
                // io.in(`${room}`).emit("updatedMembersList", data8);

                io.in(`${data.course_id}`).emit("updatedMembersList", data8);
                io.in(`${data.course_id}`).emit(
                  "addStudentToClassFromServer",
                  data
                );
              });
          });
        // console.log(normalStudent);
        // console.log(
        //   `Adding ${data.stu_no} to class ${data.course_id} in database block`
        // );
        // console.log(members);

        const indexOfObject = members.findIndex((object) => {
          return object.id === `${data.stu_no}`;
        });
        // members.splice(indexOfObject, 1);

        //console.log("indexOfObject", indexOfObject);
        if (indexOfObject !== -1) {
          //student already in the list
          // members.splice(indexOfObject, 1)
          // console.log(
          //   "student already in the list, am just updating the status"
          // );
          io.in(`${data.course_id}`).emit(
            "studentAlreadyInClass",
            "student already in class"
          );

          members[indexOfObject].status = "true";

          //const membersInRoom = getMembersInRoom(data.course_id);

          // database("lecture_members")
          //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
          //   .select("*")

          //   .where({
          //     lecture_id: data.course_id,
          //     day_id: data.day_id,
          //     date: data.date,
          //   })
          //   .then((data8) => {
          //     //res.send([...data, data8]);
          //     console.log("updatedMembersList", data8);
          //     // io.in(`${room}`).emit("updatedMembersList", data8);

          //     io.in(`${data.course_id}`).emit("updatedMembersList", data8);
          //     io.in(`${data.course_id}`).emit(
          //       "addStudentToClassFromServer",
          //       data
          //     );
          //   });

          //console.log("Memebers in the room 555555", membersInRoom);

          // io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);
          // io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
        } else {
          //student not in the list
          members.push(normalStudent);
          console.log("student not in the list, am dding him there");
          //const membersInRoom = getMembersInRoom(data.course_id);

          // database("lecture_members")
          //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
          //   .select("*")

          //   .where({
          //     lecture_id: data.course_id,
          //     day_id: data.day_id,
          //     date: data.date,
          //   })
          //   .then((data8) => {
          //     //res.send([...data, data8]);
          //     console.log("updatedMembersList", data8);
          //     // io.in(`${room}`).emit("updatedMembersList", data8);

          //     io.in(`${data.course_id}`).emit("updatedMembersList", data8);
          //     io.in(`${data.course_id}`).emit(
          //       "addStudentToClassFromServer",
          //       data
          //     );
          //   });

          console.log("Memebers in the room 89787787", membersInRoom);

          // io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);

          // io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
        }
      })

      .catch(
        (err) => {}
        // res.send(err)
      );

    database("lecture_members")
      .join("users", "lecture_members.member_id", "=", "users.stu_no")
      .select("*")

      .where({
        lecture_id: data.course_id,
        day_id: data.day_id,
        date: date,
      })
      .then((data8) => {
        //res.send([...data, data8]);
        //  console.log("updatedMembersList", data8);
        // io.in(`${room}`).emit("updatedMembersList", data8);

        io.in(`${data.course_id}`).emit("updatedMembersList", data8);
        io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
      });
  });

  socket.on("joinRoom", (roomToJoin) => {
    const user2 = socket.handshake.query;
    console.log("user query", user2);
    // database
    //   .select("*")
    //   .from("users")
    //   .where({
    //     stu_no: user2.user_id,
    //   })
    //   .then((userInfo) => {
    //     console.log("user info", userInfo);
    //     sendPushNotifications(
    //       `${userInfo[0].token}`,
    //       `${userInfo[0].userfull_name}, We are happy to walk to see you here`,
    //       "Nkumba University"
    //     );
    //   });
    let user;
    // console.log("handshake", socket.handshake.query);
    //console.log("Socket data", roomToJoin);
    database("lecture_members")
      .where(function () {
        this.where("member_id", "=", socket.handshake.query.user_id);
      })
      .then((data10) => {
        //  console.log("Member in database", data10);
        if (data10.length == 0) {
          //user is not there, so we a adding the student
          user = addUser(
            socket.handshake.query.user_id,
            socket.handshake.query.name,
            roomToJoin,
            "false",
            socket.handshake.query.role,
            socket.handshake.query.isClassRep,
            new Date().toLocaleTimeString()
          );
        } else {
          user = addUser(
            socket.handshake.query.user_id,
            socket.handshake.query.name,
            roomToJoin,
            "true",
            socket.handshake.query.role,
            socket.handshake.query.isClassRep,
            new Date().toLocaleTimeString()
          );
        }
        //  console.log("User ", user);

        const indexOfObject = members.findIndex((object) => {
          return object.id === socket.handshake.query.user_id;
        });

        if (indexOfObject !== -1) members.splice(indexOfObject, 1);
        const roomToLeave = [...socket.rooms][1];
        if (roomToLeave) {
          socket.leave(roomToLeave);
        }

        //   console.log("Joining room");
        socket.join(roomToJoin);
        // console.log([...socket.rooms]);

        members.push(user);
        checkMembers("/", roomToJoin);
        // console.log("members so far", members);
      });

    // members.splice(indexOfObject, 1);
  });

  socket.on("joinRoomStudent", (roomToJoin) => {
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    // console.log("Joining room");
    socket.join(roomToJoin);
    // console.log([...socket.rooms]);
  });

  socket.on("joinAdminRoom", (roomToJoin) => {
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    //   console.log("Joining Admin Room");
    socket.join(roomToJoin);
    //console.log([...socket.rooms]);
  });

  socket.on("updateStudentsLoggedIn", (data) => {
    // console.log("REceiving updates");
    // console.log(data);

    // const roomToLeave = [...socket.rooms][1];
    // if (roomToLeave) {
    //   socket.leave(roomToLeave);
    // }
    // socket.join(data.stu_no);
    // const room = [...socket.rooms][1];
    // console.log("rooms", room);
    const d = new Date();
    const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    //to be changed for the dashboard
    database
      .select("*")
      .from("students_biodata")

      .join(
        "student_signin",
        "students_biodata.stdno",
        "=",
        "student_signin.stu_id"
      )
      .join("users", "student_signin.signed_in_by", "=", "users.id")
      // .where("students.stu_id", "=", studentNo)
      .andWhere("student_signin.signin_date", "=", date)
      .orderBy("signin_time")
      .then((data) => {
        data.map((item) => {
          const d2 = new Date(item.signin_date);
          const date2 = ` ${d2.getFullYear()}-0${
            d2.getMonth() + 1
          }-${d2.getDate()}`;
          item.signin_date = date2;
        });
        // res.send(data);
        io.in("admin").emit("updateStudentsLoggedIn", data);
      });

    database
      // .orderBy("id")
      .select("*")
      .from("students_biodata")
      .then((data) => {
        // res.send(data);
        io.in("admin").emit("updateAllStudentsInDB", data.length);
      });

    // io.emit("updateStudentStatus", data);
  });

  socket.on("updateStaffLoggedIn", (data) => {
    // console.log("REceiving updates");
    // console.log(data);

    // const roomToLeave = [...socket.rooms][1];
    // if (roomToLeave) {
    //   socket.leave(roomToLeave);
    // }
    // socket.join(data.stu_no);
    // const room = [...socket.rooms][1];
    // console.log("rooms", room);
    const d = new Date();
    const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    //to be changed for the dashboard
    database
      .select("*")
      .from("staff_signin")
      .where("staff_signin.signin_date", "=", date)
      .orderBy("signin_time")
      .then((data) => {
        data.map((item) => {
          const d2 = new Date(item.signin_date);
          const date2 = ` ${d2.getFullYear()}-0${
            d2.getMonth() + 1
          }-${d2.getDate()}`;
          item.signin_date = date2;
        });
        // res.send(data);
        io.in("admin").emit("updateStaffLoggedIn", data);
      });

    database
      // .orderBy("id")
      .select("*")
      .from("staff")
      .then((data) => {
        // res.send(data);
        io.in("admin").emit("updateAllStaffInDB", data.length);
      });

    // io.emit("updateStudentStatus", data);
  });

  socket.on("updateStudentStatusToServer", (data) => {
    // console.log("REceiving updates");
    // console.log(data);

    database("users")
      .where(function () {
        this.where("stu_no", "=", data.stu_no);
      })
      .update({
        stu_status: data.status ? 1 : 0,
      })
      .then((data) => {
        // res.send("updated the data");
      })
      .catch(
        (err) => {}
        // res.send(err)
      );
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    socket.join(data.stu_no);
    const room = [...socket.rooms][1];
    // console.log("rooms", room);
    io.in(`${room}`).emit("updateStudentStatus", data);
    // io.emit("updateStudentStatus", data);
  });

  socket.on("updateClassRep", (data) => {
    console.log("Requesting to change classRep", data);
    io.in(`${data.courseUnit}`).emit("updateClassRep", data);
  });

  socket.on("lectureHasStarted", (data) => {
    const d = new Date();
    const date = `${data.l_year}-${data.l_month}-${data.selectedDate}`;
    console.log("lectureHasStarted", data);
    // console.log("Used date", date);
    let room;

    database
      .select("*")
      .from("timetable")
      .where("timetable.tt_id", "=", data.timetable_id)
      .then((data2) => {
        // res.send(data);

        const roomToLeave = [...socket.rooms][1];
        if (roomToLeave) {
          socket.leave(roomToLeave);
        }
        console.log("room", data2[0].c_unit_id);
        socket.join(`${data2[0].c_unit_id}`);

        room = [...socket.rooms][1];

        database("lectures")
          .where(function () {
            this.where("l_tt_id", "=", data.timetable_id)
              .andWhere("l_date", "=", data.l_date)
              .andWhere("l_month", "=", data.l_month)
              .andWhere("l_year", "=", data.l_year);
          })
          .then((data5) => {
            if (data5.length == 0) {
              database("lectures")
                .insert({
                  l_tt_id: data.timetable_id,
                  l_day_id: data.day_id,
                  course_unit_id: data2[0].c_unit_id,
                  date: date,
                  l_date: data.l_date,
                  l_month: data.l_month,
                  l_year: data.l_year,
                  has_started: data.started,
                  lecture_mode: data.lectureMode,
                  lecture_link: data.link,
                  meeting_id: data.meetingId,
                  passcode: data.passcode,
                  started_at: new Date().toLocaleTimeString(),
                })
                .then((d) => {
                  // res.send("lecture added Successfully");
                  console.log("lecture added Successfully", d);

                  database("lectures")
                    .select("*")
                    .where({
                      course_unit_id: data.lecture_id,
                      l_year: data.l_year,
                      date: date,
                    })
                    .then((data8) => {
                      //res.send([...data, data8]);

                      io.in(`${room}`).emit("lectureHasStartedFromServer", {
                        start_time: data8[0].started_at,
                        course_id: data2[0].c_unit_id,
                        started: true,
                        lectureMode: data.lectureMode,
                        link: data.link,
                        meetingId: data.meetingId,
                        passcode: data.passcode,
                      });

                      return 0;
                    });
                })
                .catch((err) => {
                  console.log("error in adding lecture", err);
                });
            }
          })
          .then((result) => {
            // database("lectures")
            //   .select("*")
            //   .where({
            //     course_unit_id: data.lecture_id,
            //     l_year: data.l_year,
            //     date: date,
            //   })
            //   .then((data8) => {
            //     //res.send([...data, data8]);
            //     //console.log("data check", data8);
            //     if (data8.length == 0) {
            //       //meaning the fetching is early
            //       database("lectures")
            //         // .join(
            //         //   "users",
            //         //   "lecture_members.member_id",
            //         //   "=",
            //         //   "users.stu_no"
            //         // )
            //         .select("*")
            //         .where({
            //           course_unit_id: data.lecture_id,
            //           l_year: data.l_year,
            //           date: date,
            //         })
            //         .then((data10) => {
            //           io.in(`${room}`).emit("lectureHasStartedFromServer", {
            //             start_time: data10[0].started_at,
            //             course_id: data2[0].c_unit_id,
            //             started: true,
            //             lectureMode: data.lectureMode,
            //             link: data.link,
            //             meetingId: data.meetingId,
            //             passcode: data.passcode,
            //           });
            //         });
            //     } else {
            //       io.in(`${room}`).emit("lectureHasStartedFromServer", {
            //         start_time: data8[0].started_at,
            //         course_id: data2[0].c_unit_id,
            //         started: true,
            //         lectureMode: data.lectureMode,
            //         link: data.link,
            //         meetingId: data.meetingId,
            //         passcode: data.passcode,
            //       });
            //     }
            //     return 0;
            //   });

            members.forEach((member) => {
              if (member.room == `${data2[0].c_unit_id}`) {
                if (member.role == "Lecturer") {
                  member.status = "true";
                  //inserting the lecturer in the lecture members table

                  database("lecture_members")
                    .where(function () {
                      this.where("member_id", "=", member.id);
                    })
                    .andWhere("lecture_id", member.room)
                    .andWhere("date", date)
                    .then((data10) => {
                      // console.log("Members in database", data10);
                      if (data10.length == 0) {
                        //user is not there, so we a adding the student
                        addMember(
                          member.id,
                          data.day_id,

                          date,
                          data2[0].c_unit_id,
                          1,
                          0,
                          new Date().toLocaleTimeString()
                        );
                      }

                      return 0;
                    })
                    .then((result) => {
                      // if (data.lectureMode == 1) {
                      database("lecture_members")
                        .join(
                          "users",
                          "lecture_members.member_id",
                          "=",
                          "users.stu_no"
                        )
                        .select("*")

                        .where({
                          lecture_id: data.lecture_id,
                          day_id: data.day_id,
                          date: date,
                        })
                        .then((data8) => {
                          //res.send([...data, data8]);
                          console.log("updatedMembersListfromLecturer", data8);
                          io.in(`${room}`).emit("updatedMembersList", data8);
                        });

                      return 0;
                      // }
                    });
                }
              }
            });

            // if ( && data.lectureMode == 1) {
            // member.status = "true";

            database("lecture_members")
              .where(function () {
                this.where("member_id", "=", data.stu_no);
              })
              .andWhere("lecture_id", data.lecture_id)
              .andWhere("date", date)
              .then((data10) => {
                // console.log("Member in database", data10);
                if (data10.length == 0) {
                  //user is not there, so we a adding the student
                  addMember(
                    data.stu_no,
                    data.day_id,

                    date,
                    data.lecture_id,
                    1,
                    1,
                    new Date().toLocaleTimeString()
                  );
                }
                return 0;
              })
              .then((result) => {
                database("lecture_members")
                  .join(
                    "users",
                    "lecture_members.member_id",
                    "=",
                    "users.stu_no"
                  )
                  .select("*")
                  .where({
                    lecture_id: data.lecture_id,
                    day_id: data.day_id,
                    date: date,
                  })
                  .then((membersInDB) => {
                    //res.send([...data, data8]);
                    //console.log("updatedMembersList", membersInDB);
                    io.in(`${room}`).emit(
                      "updatedMembersListfromclassrep",
                      membersInDB
                    );

                    return 0;
                  });
              });
            // }
            return result;
          });
      })
      .then(() => {
        database("lecture_members")
          .join("users", "lecture_members.member_id", "=", "users.stu_no")
          .select("*")

          .where({
            lecture_id: data.lecture_id,
            day_id: data.day_id,
            date: date,
          })
          .then((updates2) => {
            //res.send([...data, data8]);
            // console.log("updatedMembersListfromoutside", updates2);
            io.in(`${room}`).emit("updatedMembersList", updates2);
            checkMembers("/", room);
          });
      });

    //send notifications
    database("stu_selected_course_units")
      .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
      .select("*")

      .where({
        course_id: data.lecture_id,
      })
      .then((stuData) => {
        console.log("Enrolled students here", stuData);
        let c_data = [];
        stuData.forEach((student) => {
          if (student.token) {
            sendPushNotifications(
              `${student.token}`,
              `The lecture has started`,
              `${student.course_name}`,
              { navigateTo: "todaysLectures" }
            );
          }
          // });
        });

        //res.send(data);
      });
  });

  // const roomTitle = [...socket.rooms];
  // console.log("rooms", roomTitle);

  // io.of("/")
  //       .to(roomToJoin)
  //       .emit("chatMessageToClients", fullMsg);
});

// io.of("/students").on("connection", (nsSocket) => {
//   console.log(`${nsSocket.id} has joined students namespace`);
// });

const getMembersInRoom = (data) => {
  let customList = [];
  // members.forEach((member) => {
  //   if (member.room == `${room}` && member.status == "true") {
  //     customList.push(member);
  //   }
  // });
  // return customList;
  // database("lecture_members")
  //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
  //   .select("*")

  //   .where({
  //     lecture_id: data.course_id,
  //     day_id: data.day_id,
  //     date: data.date,
  //   })
  //   .then((data8) => {
  //     //res.send([...data, data8]);
  //     console.log("updatedMembersList", data8);
  //     // io.in(`${room}`).emit("updatedMembersList", data8);

  //     io.in(`${data.course_id}`).emit("updatedMembersList", data8);
  //     io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
  //   });

  // console.log("custom list here", customList);

  // return customList;
};

const checkMembers = async (namespace, roomToJoin) => {
  const clients = await io.of(namespace.endpoint).in(roomToJoin).allSockets();
  // console.log("Clients connected", clients);
  // io.of(namespace.endpoint)
  //   .to(roomToJoin)
  //   .emit("currNumOfClients", clients.size);
};

const addMember = (
  member_id,
  day_id,
  date,
  lecture_id,
  status,
  is_class_rep,
  joinedAt
) => {
  let res;
  database("lecture_members")
    .insert({
      member_id,
      day_id,
      date,
      lecture_id,
      status,
      is_class_rep,
      joined_at: joinedAt,
    })
    .then((data8) => {
      console.log("Member added sucessfully", data8);
      database("lecture_members")
        .join("users", "lecture_members.member_id", "=", "users.stu_no")
        .select("*")

        .where({
          lecture_id: lecture_id,
          day_id: day_id,
          date: date,
        })
        .then((data) => {
          //res.send([...data, data8]);
          console.log("updatedMembersListfromLecturer", data);
          io.in(`${lecture_id}`).emit("updatedMembersList", data);
        });
    });

  return res;
};

const addUser = (id, name, room, status, role, isClassRep, joinedAt) => {
  const user = {
    id,
    stu_no: id,
    userfull_name: name,
    room,
    status,
    role,
    is_class_rep: isClassRep,
    joined_at: joinedAt,
  };

  return user;
};
