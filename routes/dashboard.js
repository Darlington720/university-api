const express = require("express");
const router = express.Router();
const moment = require("moment");
const { database, baseIp, port } = require("../config");

//dina
router.post("/saveDinaTableDetails", (req, res) => {
  // const { name, percentage } = req.body;
  console.log("Received Data", req.body);
  database("dina_taken_tables")
    .insert({
      name: req.body.name,
      payment_mode: req.body.paymentMode,
      table_no: req.body.tableNo,
      table_id: req.body.id,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

router.get(`/numOfStaffClockIn`, (req, res) => {
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

router.get(`/studentsPerSchool/:school`, (req, res) => {
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

router.get("/getFees", (req, res) => {
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

router.post("/addConstraint", (req, res) => {
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

router.post("/updateConstraint/", (req, res) => {
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

router.get("/weeklyChartData", (req, res) => {
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

router.get("/weeklyLectureData", (req, res) => {
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

router.post("/getCustomReports/", (req, res) => {
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

router.get("/studentsToday", (req, res) => {
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

router.get("/studentsTotalBySchool/:school", (req, res) => {
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

//dashboard
router.get("/todaysLectures/:school", (req, res) => {
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

//dashboard
router.get("/numOftodaysLectures/:school", (req, res) => {
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

router.get("/num0fstudentsToday", (req, res) => {
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

router.get("/staffToday", (req, res) => {
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

router.get("/numOfstaffToday", (req, res) => {
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

router.get("/allstaffdetails/:staff_id", (req, res) => {
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

router.get("/studentData", (req, res) => {
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

router.post("/allstudentdetails/", (req, res) => {
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

router.get("/allstudentdetails/:studentNo", (req, res) => {
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

router.post("/addRoom", (req, res) => {
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

router.post("/api/exams", (req, res) => {
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

router.post("/api/invigilatorData", (req, res) => {
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

router.post("/api/updateRoomStatus", (req, res) => {
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

router.post("/api/saveExemption", (req, res) => {
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

router.get("/api/getExamInfo/:course_unit_name", (req, res) => {
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

router.post("/api/addInvigilator", (req, res) => {
  const { room, invigilators, session, date, status, assigned_by } = req.body;
  // console.log("Date received", date);
  console.log("data got here", req.body);
  const d = new Date(date);
  const formatedDate =
    d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  console.log("Formated", formatedDate);

  const d2 = new Date();
  const time = d2.getHours() + ":" + d2.getMinutes() + ":" + d2.getSeconds();
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
            time_start: time,
          })
          .then((data) => {
            const fieldsToInsert = invigilators.map((invigilator) => ({
              lecturer_id: invigilator.value,
              room_id: room.value,
              assigned_date: formatedDate,
              session_id: session.value,
              status,
              assigned_by,
              time_start: time,
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
          time_start: time,
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

router.post("/api/removeInvigilator", (req, res) => {
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
});

router.get("/invigilators/", (req, res) => {
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

router.get("/invigilator_sammary/", (req, res) => {
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

router.get("/invigilator_details/", (req, res) => {
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

module.exports = router;
