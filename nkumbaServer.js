const express = require("express");

const multer = require("multer");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const gate = require("./routes/gate");
const auth = require("./routes/auth");
const student = require("./routes/student");
const dashboard = require("./routes/dashboard");
const lecturer = require("./routes/lecturer");
const admin = require("./routes/admin");
const voting = require("./routes/voting");
const lectures = require("./routes/lectures");
const exams = require("./routes/exams");
const uploadRouter = require("./routes/upload");
const timetable = require("./routes/timetable");
const cors = require("cors");
const moment = require("moment");
const { sendPushNotifications } = require("./pushNotifications");
var { baseIp, port, database } = require("./config");

const fileUpload = require("express-fileupload");

const upload = multer();
const app = express();
const secret = "mySecret";

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(fileUpload());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

if (app.get("env") === "development") {
  app.use(morgan("tiny"));
  console.log("Morgan Enabled...");
}
app.use("/api/gate", gate);
app.use("/api/auth", auth);
app.use("/api/student", student);
app.use("/api/lecturer", lecturer);
app.use("/api/admin", admin);
app.use("/api/voting", voting);
app.use("/api/lecture", lectures);
app.use("/api/upload", uploadRouter);
app.use("/api/timetable", timetable);
app.use("/api/dashboard", dashboard);
app.use("/", exams);
// console.log("my name is", new Date("2022-12-04T23:31:53.000Z").getDate());

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
  // "constraints",
  "staff",
  "timetable",
  "lectures",
  "course_units",
  "users",
  "voters",
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

        // database
        //   .select("*")
        //   .from("timetable")
        //   // .join("lectures", "timetable.tt_id", "=", "lectures.tt_id")
        //   .where("day_id", "=", msg.day_id)
        //   .andWhere("timetable.tt_id", "=", msg.timetable_id)
        //   // .andWhere("timetable.study_time", "=", req.body.study_time)
        //   // .where("day_id", "=", req.body.day)

        //   //.join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
        //   .join(
        //     "stu_selected_course_units",
        //     "timetable.c_unit_id",
        //     "=",
        //     "stu_selected_course_units.course_id"
        //   )
        //   .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
        //   .join("schools", "timetable.school_id", "=", "schools.school_id")
        //   .leftJoin("lectures", function () {
        //     this.on("timetable.tt_id", "=", "lectures.l_tt_id")
        //       .andOn("lectures.l_year", "=", parseInt(d.getFullYear()))
        //       .andOn("lectures.l_month", "=", parseInt(d.getMonth() + 1))
        //       .andOn("lectures.l_date", "=", parseInt(d.getDate()));
        //   })
        //   // .where("lectures.date", "=", req.body.date)
        //   .andWhere("stu_selected_course_units.stu_id", "=", msg.stdno)
        //   .andWhere("timetable.c_unit_id", "=", msg.course_unit_id)
        //   .orderBy("start_time")

        database
          .from("lecture_timetable")
          .where("day_id", "=", msg.day_id)
          .andWhere("lecture_timetable.tt_id", "=", msg.timetable_id)
          .join(
            "lecture_sessions",
            "lecture_timetable.session_id",
            "lecture_sessions.ls_id "
          )
          .leftJoin(
            "timetable_groups",
            "lecture_timetable.timetable_group_id",
            "timetable_groups.tt_gr_id "
          )
          .join(
            "study_time",
            "timetable_groups.study_time_id",
            "study_time.st_id"
          )
          .join("rooms", "lecture_timetable.room_id", "rooms.room_id")
          .join("schools", "timetable_groups.school_id", "schools.school_id")

          .leftJoin(
            "staff",
            "lecture_timetable.lecturer_id",
            "=",
            "staff.staff_id"
          )
          .join(
            "stu_selected_course_units",
            "lecture_timetable.c_unit_id",
            "=",
            "stu_selected_course_units.course_id"
          )
          .leftJoin("lectures", function () {
            this.on("lecture_timetable.tt_id", "=", "lectures.l_tt_id")
              .andOn("lectures.l_year", "=", parseInt(d.getFullYear()))
              .andOn("lectures.l_month", "=", parseInt(d.getMonth() + 1))
              .andOn("lectures.l_date", "=", parseInt(d.getDate()));
          })
          // .where("lectures.date", "=", req.body.date)
          .andWhere("stu_selected_course_units.stu_id", "=", msg.stdno)
          .andWhere("lecture_timetable.c_unit_id", "=", msg.course_unit_id)
          .select(
            "lecture_timetable.tt_id",
            "lecture_timetable.day_id",
            "lecture_sessions.start_time",
            "lecture_sessions.end_time",
            "rooms.room_name",
            "lecture_timetable.c_unit_id",
            "lecture_timetable.course_unit_name",
            "lecture_timetable.lecturer_id",
            "schools.alias",
            "schools.school_id",
            "study_time.study_time_name",
            "staff.*",
            "stu_selected_course_units.*",
            "lectures.*"
          )
          .then((myData) => {
            // newArr.push(data);
            // console.log("another response herer", data);
            let lectureDetails = [];
            const fetch_3 = myData.map((lecture, index) => {
              return database
                .select("*")
                .from("users")
                .join(
                  "class_reps",
                  "users.stu_no",
                  "=",
                  "class_reps.class_rep_id"
                )
                .where("class_reps.for_wc_cu", "=", msg.course_unit_id)
                .then((classRepInfo) => {
                  // console.log("Index", index);
                  lectureDetails.push({ ...lecture, classRepInfo });

                  // return lectureDetails;
                });
            });

            Promise.all(fetch_3).then(() => {
              // console.log("Resulting array", lectureDetails);
              const sortedAsc = lectureDetails.sort(
                (objA, objB) =>
                  moment(objA.start_time, "h:mmA") -
                  moment(objB.start_time, "h:mmA")
              );

              let finalArr = [];

              sortedAsc.map((l) => {
                finalArr.push({
                  ...l,
                  fullSelectedDate: date,
                });
              });

              // res.send(finalArr);
              //send notifications
              database("stu_selected_course_units")
                .join(
                  "users",
                  "stu_selected_course_units.stu_id",
                  "=",
                  "users.stu_no"
                )
                .select("*")

                .where({
                  course_id: msg.course_unit_id,
                })
                .then((stuData) => {
                  // console.log("Enrolled students here", stuData);
                  let c_data = [];
                  stuData.forEach((student) => {
                    if (student.token) {
                      sendPushNotifications(
                        `${student.token}`,
                        `The lecture has ended, Would you wish to rate this lecture?`,
                        `${student.course_name}`,
                        {
                          ...finalArr[0],
                          navigateTo: "lectureDetails",
                          endLecture: true,
                        }
                      );
                    }
                    // });
                  });

                  //res.send(data);
                });
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

                database("stu_selected_course_units")
                  .join(
                    "users",
                    "stu_selected_course_units.stu_id",
                    "=",
                    "users.stu_no"
                  )
                  .select("*")

                  .where({
                    course_id: data.lecture_id,
                    stu_id: data.stdno,
                  })
                  .then((student) => {
                    // console.log("Enrolled students here", stuData);
                    let c_data = [];
                    // stuData.forEach((student) => {
                    if (student.token) {
                      sendPushNotifications(
                        `${student[0].token}`,
                        `Thank you for rating this lecture!!`,
                        `${student[0].course_name}`,
                        { navigateTo: "todaysLectures" }
                      );
                    }
                    // });
                    // });

                    //res.send(data);
                    // res.end();
                  });

                io.in(`${socket.id}`).emit("endedLectureDetails", {
                  memberData: memberData[0],
                  lectureData: lectureData[0],
                });
              });
          })
          .catch((err) => {
            console.log("Error in updating lecture rating", err);
          });
      })
      .catch((err) => {
        console.log("Error in updating lecture rating", err);
      });
  });

  socket.on("replyToSserver", (data) => {
    console.log("Just received a message from a happy client", data);
  });

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
              .orderBy("joined_at")
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
          })
          .catch((err) => {
            console.log("Error in adding student to class", err);
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
          io.in(`${data.course_id}`).emit(
            "studentAlreadyInClass",
            "student already in class"
          );

          members[indexOfObject].status = "true";
        } else {
          //student not in the list
          members.push(normalStudent);
          console.log("student not in the list, am dding him there");
        }
      })

      .catch((err) => {
        console.log("Error in updating lecture rating", err);
      });

    // database("lecture_members")
    //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
    //   .select("*")

    //   .where({
    //     lecture_id: data.course_id,
    //     day_id: data.day_id,
    //     date: date,
    //   })
    //   .orderBy("joined_at")
    //   .then((data8) => {
    //     //res.send([...data, data8]);
    //     //  console.log("updatedMembersList", data8);
    //     // io.in(`${room}`).emit("updatedMembersList", data8);

    //     io.in(`${data.course_id}`).emit("updatedMembersList", data8);
    //     io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
    //   });
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
      })
      .catch((err) => {
        console.log("Error in updating lecture rating", err);
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

  socket.on("lectureHasStarted", async (data) => {
    const d = new Date();
    const date = `${data.l_year}-${data.l_month}-${data.selectedDate}`;
    console.log("lectureHasStarted", data);
    let room;

    await database
      .from("lecture_timetable")
      .join(
        "lecture_sessions",
        "lecture_timetable.session_id",
        "lecture_sessions.ls_id "
      )
      .leftJoin(
        "timetable_groups",
        "lecture_timetable.timetable_group_id",
        "timetable_groups.tt_gr_id "
      )
      .join("study_time", "timetable_groups.study_time_id", "study_time.st_id")
      .join("rooms", "lecture_timetable.room_id", "rooms.room_id")
      .join("schools", "timetable_groups.school_id", "schools.school_id")

      .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")
      .select(
        "lecture_timetable.tt_id",
        "lecture_timetable.day_id",
        "lecture_sessions.start_time",
        "lecture_sessions.end_time",
        "rooms.room_name",
        "lecture_timetable.c_unit_id",
        "lecture_timetable.course_unit_name",
        "lecture_timetable.lecturer_id",
        "schools.alias",
        "schools.school_id",
        "study_time.study_time_name",
        "staff.*"
      )
      .where("lecture_timetable.tt_id", "=", data.timetable_id)
      .then(async (lec) => {
        const data2 = lec.map((obj) => {
          const newObj = Object.assign({}, obj, {
            school: obj.alias,
            study_time: obj.study_time_name,
          });

          delete newObj.alias;
          delete newObj.study_time_name;
          return newObj;
        });

        const roomToLeave = [...socket.rooms][1];
        if (roomToLeave) {
          socket.leave(roomToLeave);
        }
        console.log("room", data2[0].c_unit_id);
        socket.join(`${data2[0].c_unit_id}`);

        room = [...socket.rooms][1];

        const lecture = await addLecture(data, data2, date);

        const membersInLecture = await updateLectureMembers(
          data,
          data2,
          members,
          date
        );
        //console.log("THe lecture", lecture);

        membersInLecture.map((m) => {
          if (m.is_class_rep) {
            io.in(`${room}`).emit("lectureHasStartedFromServer", {
              start_time: lecture.started_at,
              course_id: lecture.c_unit_id,
              started: true,
              class_rep_id: m.stu_no,
              lectureMode: data.lectureMode,
              link: data.link,
              meetingId: data.meetingId,
              passcode: data.passcode,
            });
          }
        });
        //console.log("members", membersInLecture);
        io.in(`${room}`).emit("updatedMembersList", membersInLecture);

        //console.log("lecture details", lectureDetails);
      });

    const lectureDetails = await getLectureDetails(data, date);

    const enrolledStudents = await database("stu_selected_course_units")
      .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
      .where({
        course_id: data.lecture_id,
      })
      .select("*");

    //console.log("All the enrolled students", enrolledStudents);

    enrolledStudents.map((student) => {
      if (student.token) {
        sendPushNotifications(
          `${student.token}`,
          `The lecture has started`,
          `${student.course_name}`,
          { ...lectureDetails[0], navigateTo: "todaysLectures" }
        );
      }
    });
  });
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

const addMember = async (
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
    .then(async (data8) => {
      console.log("Member added sucessfully", data8);
      await database("lecture_members")
        .join("users", "lecture_members.member_id", "=", "users.stu_no")
        .select("*")

        .where({
          lecture_id: lecture_id,
          day_id: day_id,
          date: date,
        })
        .then((data) => {
          //res.send([...data, data8]);
          // console.log("updatedMembersListfromLecturer", data);
          io.in(`${lecture_id}`).emit("updatedMembersList", data);
        })
        .catch((err) => console.log(err));
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

async function addLecture(data, data2, date) {
  const existingLecture = await database("lectures")
    .where("l_tt_id", "=", data.timetable_id)
    .andWhere("l_date", "=", data.l_date)
    .andWhere("l_month", "=", data.l_month)
    .andWhere("l_year", "=", data.l_year)
    .first();

  if (!existingLecture) {
    try {
      const newLecture = {
        l_tt_id: data.timetable_id,
        l_day_id: data.day_id,
        course_unit_id: data2[0].c_unit_id,
        date,
        l_date: data.l_date,
        l_month: data.l_month,
        l_year: data.l_year,
        has_started: data.started,
        lecture_mode: data.lectureMode,
        lecture_link: data.link,
        meeting_id: data.meetingId,
        passcode: data.passcode,
        started_at: new Date().toLocaleTimeString(),
      };
      await database("lectures").insert(newLecture);
      console.log("Lecture added successfully");
      const lecture = await database("lectures")
        .select("*")
        .where({
          course_unit_id: data.lecture_id,
          l_year: data.l_year,
          date,
        })
        .first();

      return lecture;
    } catch (err) {
      console.error("Error adding lecture", err);
    }
  } else {
    return existingLecture;
  }
}

async function updateLectureMembers(data, data2, members, date) {
  const lectureData = await database("lectures")
    .where({
      l_tt_id: data.timetable_id,
      l_date: data.l_date,
      l_month: data.l_month,
      l_year: data.l_year,
    })
    .first();

  if (!lectureData) return;

  const updateMembers = async (member) => {
    if (member.room !== `${data2[0].c_unit_id}`) return;
    if (member.role === "Student") return;

    member.status = "true";
    let memberData = await database("lecture_members")
      .where({ member_id: member.id, lecture_id: member.room, date: date })
      .first();
    if (!memberData) {
      await addMember(
        member.id,
        data.day_id,
        date,
        data2[0].c_unit_id,
        1,
        0,
        new Date().toLocaleTimeString()
      );
    }
    const updatedMembersList = await database("lecture_members")
      .join("users", "lecture_members.member_id", "=", "users.stu_no")
      .select("*")
      .where({ lecture_id: data.lecture_id, day_id: data.day_id, date: date });

    // io.in(`${room}`).emit("updatedMembersList", updatedMembersList);
  };

  await Promise.all(members.map(updateMembers));

  if (data.lectureMode !== 1) return;
  let memberData = await database("lecture_members")
    .where({ member_id: data.stu_no, lecture_id: data.lecture_id, date: date })
    .first();
  if (!memberData) {
    await addMember(
      data.stu_no,
      data.day_id,
      date,
      data.lecture_id,
      1,
      1,
      new Date().toLocaleTimeString()
    );
  }
  const updatedMembersList = await database("lecture_members")
    .join("users", "lecture_members.member_id", "=", "users.stu_no")
    .select("*")
    .where({ lecture_id: data.lecture_id, day_id: data.day_id, date: date });

  return updatedMembersList;
}

async function getLectureDetails(data, date) {
  const myData = await database
    .from("lecture_timetable")
    .where("day_id", "=", data.day_id)
    .andWhere("lecture_timetable.tt_id", "=", data.timetable_id)
    .join(
      "lecture_sessions",
      "lecture_timetable.session_id",
      "lecture_sessions.ls_id "
    )
    .leftJoin(
      "timetable_groups",
      "lecture_timetable.timetable_group_id",
      "timetable_groups.tt_gr_id "
    )
    .join("study_time", "timetable_groups.study_time_id", "study_time.st_id")
    .join("rooms", "lecture_timetable.room_id", "rooms.room_id")
    .join("schools", "timetable_groups.school_id", "schools.school_id")

    .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")
    .join(
      "stu_selected_course_units",
      "lecture_timetable.c_unit_id",
      "=",
      "stu_selected_course_units.course_id"
    )
    .leftJoin("lectures", function () {
      this.on("lecture_timetable.tt_id", "=", "lectures.l_tt_id")
        .andOn("lectures.l_year", "=", parseInt(new Date().getFullYear()))
        .andOn("lectures.l_month", "=", parseInt(new Date().getMonth() + 1))
        .andOn("lectures.l_date", "=", parseInt(new Date().getDate()));
    })
    // .where("lectures.date", "=", req.body.date)
    .andWhere("lecture_timetable.c_unit_id", "=", data.lecture_id)
    .select(
      "lecture_timetable.tt_id",
      "lecture_timetable.day_id",
      "lecture_sessions.start_time",
      "lecture_sessions.end_time",
      "rooms.room_name",
      "lecture_timetable.c_unit_id",
      "lecture_timetable.course_unit_name",
      "lecture_timetable.lecturer_id",
      "schools.alias",
      "schools.school_id",
      "study_time.study_time_name",
      "staff.*",
      "stu_selected_course_units.*",
      "lectures.*"
    );

  let lectureDetails = [];

  const fetchData = myData.map(async (lecture, index) => {
    const classRepInfo = await database
      .select("*")
      .from("users")
      .join("class_reps", "users.stu_no", "=", "class_reps.class_rep_id")
      .where("class_reps.for_wc_cu", "=", data.lecture_id);

    lectureDetails.push({ ...lecture, classRepInfo });
  });

  await Promise.all(fetchData);

  const sortedAsc = lectureDetails.sort((objA, objB) =>
    moment(objA.start_time, "h:mmA").diff(moment(objB.start_time, "h:mmA"))
  );

  let finalArr = [];

  sortedAsc.map((l) => {
    finalArr.push({
      ...l,
      fullSelectedDate: date,
    });
  });

  return [{ ...finalArr[0] }];
}

const getStudentGateStatus2de = async (stuNo) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  const data3 = await database
    .select("*")
    .from("students_biodata")
    .join("stu_signin", "students_biodata.stdno", "=", "stu_signin.stu_id")
    .where("students_biodata.stdno", "=", stuNo)
    .andWhere("stu_signin.signin_date", "=", date);

  let todaysStatus;

  if (data3.length > 0) {
    if (data3[data3.length - 1].signout_time !== null) {
      todaysStatus = "not new";
    } else {
      todaysStatus = true;
    }
  } else {
    const data2 = await database.select("*").from("students_biodata").where({
      stdno: stuNo,
    });

    if (data2[0]) {
      todaysStatus = false;
    } else {
      todaysStatus = "invalid";
    }
  }

  return todaysStatus;
};
