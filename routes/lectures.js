const express = require("express");
const router = express.Router();
const { database } = require("../config");
const { sendPushNotifications } = require("../pushNotifications");

//get the data about lectures that already started
router.post("/getLectureData/", (req, res) => {
  const { course_id, tt_id, day_id, selectedDate, stu_id } = req.body;
  // console.log(req.body);
  const d = new Date(selectedDate);
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // console.log("Loooking for date", date)

  database
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
    .join(
      "study_time",
      "timetable_groups.study_time_id",
      "study_time.study_time_code"
    )
    .join("rooms", "lecture_timetable.room_id", "rooms.room_id")
    .join("schools", "timetable_groups.school_id", "schools.school_id")

    .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")

    // .where("lecture_timetable.tt_id", "=", lecture_id)
    // .then((lec) => {
    //   const lectures = lec.map((obj) => {
    //     const newObj = Object.assign({}, obj, {
    //       school: obj.alias,
    //       study_time: obj.study_time_name,
    //     });

    //     delete newObj.alias;
    //     delete newObj.study_time_name;
    //     return newObj;
    //   });
    //   res.send(lectures);
    // });

    // database
    //   .select("*")
    //   .from("timetable")

    .andWhere("lecture_timetable.tt_id", "=", tt_id)
    // .join(
    //   "stu_selected_course_units",
    //   "timetable.c_unit_id",
    //   "=",
    //   "stu_selected_course_units.course_id"
    // )
    // .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")
    // .join("schools", "lecture_timetable.school_id", "=", "schools.school_id")

    .leftJoin("lectures", function () {
      this.on("lecture_timetable.tt_id", "=", "lectures.l_tt_id")
        .andOn("lectures.course_unit_id", "=", database.raw("?", [course_id]))
        .andOn("lectures.l_day_id", "=", database.raw("?", [day_id]))
        .andOn("lectures.date", "=", database.raw("?", [date]));
    })

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
      "lectures.*"
    )
    // .leftJoin("lectures", "timetable.tt_id", "=", "lectures.l_tt_id")
    // .where({
    //   course_unit_id: course_id,
    //   l_day_id: day_id,
    //   // date: "2023-01-30",
    // })
    .then((data) => {
      // res.send(data);

      database("lecture_members")
        .join("users", "lecture_members.member_id", "=", "users.stu_no")
        .leftJoin(
          "students_biodata",
          "lecture_members.member_id",
          "=",
          "students_biodata.stdno"
        )
        .select(
          "lecture_members.id",
          "lecture_members.date",
          "lecture_members.lecture_id",
          "lecture_members.is_class_rep",
          "lecture_members.status",
          "lecture_members.joined_at",
          "lecture_members.rating",
          "users.role",
          "users.userfull_name",
          "users.stu_no",
          "students_biodata.progcode"
        )
        .orderBy("lecture_members.joined_at")
        .where({
          lecture_id: course_id,
          day_id,
          date: selectedDate,
          // member_id: stu_id,
        })
        .then((data8) => {
          // let classReps = [];
          // data8.forEach((student) => {
          //   if (student.is_class_rep == 1) {
          //     classReps.push(student);
          //   }
          // });
          let lectureInfo = { ...data[0] };

          database
            .select("*")
            .from("lecture_members")
            .where("date", "=", selectedDate)
            .andWhere("member_id", "=", stu_id)
            .andWhere("lecture_id", "=", course_id)
            .then((data10) => {
              // console.log("attended students", data10);
              if (data10.length > 0) {
                if (
                  data[0].has_ended &&
                  data10[0].lecture_id == data[0].c_unit_id
                ) {
                  //Attended the lecture
                  console.log("Attended the lecture");
                  lectureInfo = { ...data[0], attendedLecture: true };
                } else if (data[0].has_ended) {
                  //didnt attend the lecture
                  console.log("Didnt attend the lecture");
                  lectureInfo = { ...data[0], attendedLecture: false };
                }
              } else {
                console.log("The lecture has not yet started");
                lectureInfo = {
                  ...data[0],
                  attendedLecture: "Not yet started",
                };
              }

              database
                .select("*")
                .from("users")
                .join(
                  "class_reps",
                  "users.stu_no",
                  "=",
                  "class_reps.class_rep_id"
                )
                .where("class_reps.for_wc_cu", "=", course_id)
                .then((classRepInfo) => {
                  // console.log("response data", {
                  //   lecture: lectureInfo,
                  //   classReps: classRepInfo,
                  //   members: data8,
                  // });
                  res.send({
                    success: true,
                    data: {
                      lecture: lectureInfo,
                      classReps: classRepInfo,
                      members: data8,
                    },
                  });
                });
            });
        })
        .catch((err) =>
          res.send({
            result: "fail",
            message: "error in retrieving the lecture data",
          })
        );
    });

  // database("lectures")
  //   .join("timetable", "lectures.l_tt_id", "=", "timetable.tt_id")
  //   .leftJoin("staff", "timetable.lecturer_id", "=", "staff.staff_id")
  //   .select("*")
  //   .where({
  //     course_unit_id: course_id,
  //     l_tt_id: tt_id,
  //     l_day_id: day_id,
  //     date: "2023-01-30",
  //   })
  //   .then((data) => {
  //     database("lecture_members")
  //       .join("users", "lecture_members.member_id", "=", "users.stu_no")
  //       .leftJoin(
  //         "students_biodata",
  //         "lecture_members.member_id",
  //         "=",
  //         "students_biodata.stdno"
  //       )
  //       .select(
  //         "lecture_members.id",
  //         "lecture_members.date",
  //         "lecture_members.lecture_id",
  //         "lecture_members.is_class_rep",
  //         "lecture_members.status",
  //         "lecture_members.joined_at",
  //         "lecture_members.rating",
  //         "users.role",
  //         "users.userfull_name",
  //         "users.stu_no",
  //         "students_biodata.progcode"
  //       )

  //       .where({
  //         lecture_id: course_id,
  //         day_id,
  //         date: "2023-01-30",
  //         // member_id: stu_id,
  //       })
  //       .then((data8) => {
  //         let classReps = [];
  //         data8.forEach((student) => {
  //           if (student.is_class_rep == 1) {
  //             classReps.push(student);
  //           }
  //         });
  //         res.send({
  //           success: true,
  //           data: {
  //             lecture: data[0],
  //             classReps: classReps,
  //             members: data8,
  //           },
  //         });
  //       })
  //       .catch((err) =>
  //         res.send({
  //           result: "fail",
  //           message: "error in retrieving the lecture data",
  //         })
  //       );
  //   });
});

router.get("/lecture/:lecture_id", (req, res) => {
  const { lecture_id } = req.params;
  const userId = 1;
  //console.log("number", lecture_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
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
    .join(
      "study_time",
      "timetable_groups.study_time_id",
      "study_time.study_time_code"
    )
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
    .where("lecture_timetable.tt_id", "=", lecture_id)
    .then((lec) => {
      const lectures = lec.map((obj) => {
        const newObj = Object.assign({}, obj, {
          school: obj.alias,
          study_time: obj.study_time_name,
        });

        delete newObj.alias;
        delete newObj.study_time_name;
        return newObj;
      });
      res.send(lectures);
    });

  // database
  //   .select("*")
  //   .from("timetable")

  //   // .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

  //   .where("timetable.tt_id", "=", lecture_id)
  //   // .andWhere("student_signin.signin_date", "=", date)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

router.get("/getEnrolledStudents/:course_id", (req, res) => {
  const { course_id } = req.params;
  //console.log("enrollment sent records", req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")

    .leftJoin(
      "students_biodata",
      "stu_selected_course_units.stu_id",
      "=",
      "students_biodata.stdno"
    )
    // .leftJoin(
    //   "class_reps",
    //   "stu_selected_course_units.stu_id",
    //   "=",
    //   "class_reps.class_rep_id"
    // )
    .select(
      "stu_selected_course_units.c_id",
      "stu_selected_course_units.stu_id",
      // "lecture_members.is_class_rep",
      "students_biodata.progcode",
      "users.userfull_name",
      "users.role"
    )
    // .select("*")
    // .select(
    //   "lecture_members.id",
    //   "lecture_members.date",
    //   "lecture_members.lecture_id",
    //   "lecture_members.is_class_rep",
    //   "lecture_members.status",
    //   "lecture_members.joined_at",
    //   "lecture_members.rating",
    //   "users.role",
    //   "users.userfull_name",
    //   "users.stu_no",
    //   "students_biodata.progcode"
    // )

    .where({
      course_id,
    })
    .then(async (data) => {
      //console.log("Enrolled students here", data);

      const fetch_1 = async () => {
        const classReps = await database("class_reps").select("*").where({
          for_wc_cu: course_id,
        });

        const result = data.map((enrolledStu) => {
          const itemA = classReps.find(
            (cr) => enrolledStu.stu_id === cr.class_rep_id
          );
          if (itemA) {
            return { ...enrolledStu, is_class_rep: 1 };
          }
          return enrolledStu;
        });

        return result;
      };

      const result = await fetch_1();

      res.send(result);

      // database("class_reps")
      //   .select("*")
      //   .where({
      //     for_wc_cu: course_id,
      //   })
      //   .then((data2) => {
      //     let arr = [];

      //     if (data2.length == 0) {
      //       res.send(data);
      //     } else {
      //       for (let i = 0; i < data2.length; i++) {
      //         let foundIndex = data.findIndex(
      //           (student) => student.stu_id === data2[i].class_rep_id
      //         );
      //         if (foundIndex !== -1) {
      //           // data[foundIndex] = { ...data[foundIndex], ...data2[i] };
      //           data[foundIndex] = { ...data[foundIndex], is_class_rep: 1 };
      //         } else {
      //           data.push(data2[i]);
      //         }
      //       }
      //       res.send(data);
      //     }
      //   })
      //   .catch((err) => {
      //     console.log("Error in getting enrolled students", err);
      //   });

      // res.send(data);
    })
    .catch((err) => {
      console.log("Error in getting enrolled students", err);
    });
});

router.post("/updateClassRepInfo", (req, res) => {
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
                  .then((result) => {
                    // console.log("Result from ")
                    database("stu_selected_course_units")
                      .join(
                        "users",
                        "stu_selected_course_units.stu_id",
                        "=",
                        "users.stu_no"
                      )
                      .where(function () {
                        this.where("users.stu_no", "=", stu_no);
                      })
                      .andWhere(function () {
                        this.where(
                          "stu_selected_course_units.course_id",
                          "=",
                          course_id
                        );
                      })
                      .then((student) => {
                        // console.log("The student ", student);
                        sendPushNotifications(
                          `${student[0].token}`,
                          `You have successfully been made the class rep of this unit!!!`,
                          `${student[0].course_name}`,
                          {
                            navigateTo: "todaysLectures",
                            endLecture: true,
                          }
                        );
                      });
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

router.get("/getClassRepInfo/:course_id", (req, res) => {
  const { course_id } = req.params;
  console.log(req.params);

  //console.log("Enrolled students here", data);
  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")

    .leftJoin(
      "students_biodata",
      "stu_selected_course_units.stu_id",
      "=",
      "students_biodata.stdno"
    )
    .select(
      "stu_selected_course_units.c_id",
      "stu_selected_course_units.stu_id",
      // "lecture_members.is_class_rep",
      "students_biodata.progcode",
      "users.userfull_name",
      "users.stu_no",
      "users.role"
    )
    .where({
      course_id,
    })
    .then((data) => {
      //console.log("Enrolled students here", data);

      database("class_reps")
        .join("users", "class_reps.class_rep_id", "=", "users.stu_no")
        .select("*")
        .where({
          for_wc_cu: course_id,
        })
        .then((data2) => {
          let arr = [];

          if (data2.length == 0) {
            res.send(data);
          } else {
            for (let i = 0; i < data2.length; i++) {
              let foundIndex = data.findIndex(
                (student) => student.stu_id === data2[i].class_rep_id
              );
              if (foundIndex !== -1) {
                // data[foundIndex] = { ...data[foundIndex], ...data2[i] };
                // data[foundIndex] = { ...data[foundIndex], is_class_rep: 1 };
                arr.push({
                  ...data[foundIndex],
                  is_class_rep: 1,
                  for_wc_cu: course_id,
                });
              }
              // else {
              //   data.push(data2[i]);
              // }
            }
            // console.log("Sending this", arr);
            res.send(arr);
          }
        })
        .catch((err) => {
          console.log("Error in getting enrolled students", err);
        });

      // res.send(data);
    })
    .catch((err) => {
      console.log("Error in getting enrolled students", err);
    });

  // database("class_reps")
  //   .join("users", "class_reps.class_rep_id", "=", "users.stu_no")
  //   .select("*")
  //   .where({
  //     for_wc_cu: course_id,
  //   })
  //   .then((data2) => {
  //     let arr = [];

  //     if (data2.length == 0) {
  //       res.send(data);
  //     } else {
  //       for (let i = 0; i < data2.length; i++) {
  //         let foundIndex = data.findIndex(
  //           (student) => student.stu_id === data2[i].class_rep_id
  //         );
  //         if (foundIndex !== -1) {
  //           // data[foundIndex] = { ...data[foundIndex], ...data2[i] };
  //           data[foundIndex] = { ...data[foundIndex], is_class_rep: 1 };
  //         } else {
  //           data.push(data2[i]);
  //         }
  //       }
  //       res.send(data);
  //     }
  //   })
  //   .catch((err) => {
  //     console.log("Error in getting the class reps", err);
  //   });

  // database
  //   // .select("*")
  //   .from("lecture_members")
  //   .join("users", "lecture_members.member_id", "=", "users.stu_no")
  //   .join(
  //     "class_reps",
  //     "lecture_members.member_id",
  //     "=",
  //     "class_reps.class_rep_id"
  //   )
  //   // .where({
  //   //   stu_no: stuno,
  //   // })
  //   .where("class_reps.for_wc_cu", "=", course_id)
  //   .select(
  //     // "lecture_members.id",
  //     // "lecture_members.date",
  //     // "lecture_members.lecture_id",
  //     "lecture_members.is_class_rep",
  //     // "lecture_members.status",
  //     // "lecture_members.joined_at",
  //     // "lecture_members.rating",
  //     "class_reps.for_wc_cu",
  //     "class_reps.cr_id",
  //     "users.role",
  //     "users.userfull_name",
  //     "users.stu_no"
  //   )
  //   .then((data) => {
  //     console.log("response", data);
  //     res.send(data);
  //   });
});

router.get("/getAllClassReps/:course_id", (req, res) => {
  const { course_id } = req.params;
  //console.log(req.params);

  database
    // .select("*")
    .from("class_reps")
    .join(
      "lecture_members",
      "class_reps.class_rep_id",
      "=",
      "lecture_members.member_id"
    )

    .join("users", "class_reps.class_rep_id", "=", "users.stu_no")
    .leftJoin(
      "students_biodata",
      "class_reps.class_rep_id",
      "=",
      "students_biodata.stdno"
    )
    .select(
      // "lecture_members.id",
      // "lecture_members.date",
      // "lecture_members.lecture_id",
      "lecture_members.is_class_rep",
      // "lecture_members.status",
      // "lecture_members.joined_at",
      // "lecture_members.rating",
      "class_reps.cr_id",
      "users.role",
      "users.userfull_name",
      "users.stu_no",
      "students_biodata.progcode"
    )
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

router.post("/lectureHasEnded", (req, res) => {
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

          // database
          //   .select("*")
          //   .from("timetable")
        });
    });
});

//watch out for this one: checking to see if the student is subscribed for the given lecture
router.post("/checkStudentSubscription/", async (req, res) => {
  const { course_id, stu_id, date } = req.body;
  //console.log(req.body);
  const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  const actualStudent = await database("students_biodata")
    .select("*")
    .where({
      stdno: stu_id,
    })
    .first();

  //first, lets check if the lecture is still on!!!
  const data = await database("lectures").select("*").where({
    course_unit_id: course_id,
    date,
  });
  //checking if the lecture actually exists
  if (data.length === 0) {
    res.status(400).send({
      success: false,
      message: "This lecture has not yet started",
    });
    return;
  }

  if (data[0].has_ended) {
    //the lecture has already ended
    res.status(400).send({
      success: false,
      message: "This lecture has already ended, No student is allowed to join!",
    });

    return;
  }

  if (data[0].has_started) {
    const enrolledStudent = await database("stu_selected_course_units")
      .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
      .select("*")
      .where({
        course_id,
        stu_id,
      });

    if (enrolledStudent.length == 0) {
      //student with stdno is not enrolled
      res.send({
        success: false,
        message: `student with student no ${stu_id} is not yet enrolled in this unit`,
      });

      return;
    }

    //after proving enrollment, we need to know if he is already in the lecture
    const studentInLecture = await database("lecture_members")
      .where(function () {
        this.where("member_id", "=", stu_id);
      })
      .andWhere("lecture_id", course_id)
      .andWhere("date", date)
      .select("*");

    if (studentInLecture[0]) {
      res.send({
        success: false,
        message:
          `student already in lecture, ${actualStudent.name} has already joined this lecture`.toUpperCase(),
      });
      return;
    }

    res.send({
      success: true,
      data: {
        studentName: actualStudent.name,
        course_id: course_id,
        stu_id: stu_id,
      },
    });
    return;
  }

  // database("lectures")
  //   .select("*")
  //   .where({
  //     course_unit_id: course_id,
  //     date,
  //   })
  //   .then((data) => {
  //     if (data[0].has_ended) {
  //       res.status(500).send({
  //         success: false,
  //         message:
  //           "This lecture has already ended, No student is allowed to join!",
  //       });
  //     } else {
  //       database("stu_selected_course_units")
  //         .join(
  //           "users",
  //           "stu_selected_course_units.stu_id",
  //           "=",
  //           "users.stu_no"
  //         )
  //         .select("*")

  //         .where({
  //           course_id,
  //           stu_id,
  //         })
  //         .then((data) => {
  //           database("lecture_members")
  //             .where(function () {
  //               this.where("member_id", "=", stu_id);
  //             })
  //             .andWhere("lecture_id", course_id)
  //             .andWhere("date", date)
  //             .then((data8) => {
  //               res.send([...data, data8]);
  //             });
  //         });
  //     }
  //   });
});

router.post("/lectureInfo/", async (req, res) => {
  const { startDate, endDate, school, campus, studyTime } = req.body;

  const d = new Date(startDate);
  const s_date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  const d1 = new Date(endDate);
  const e_date =
    d1.getFullYear() + "-" + (d1.getMonth() + 1) + "-" + d1.getDate();

  // console.log("start day", `${d.getDay()} ${d}`);
  // console.log("end day", `${d1.getDay()} ${d1}`);

  // console.log("The date", date);

  // const dateArray = [];
  // const currentDate = new Date(d);
  // while (currentDate <= d1) {
  //   dateArray.push(new Date(currentDate));
  //   currentDate.setDate(currentDate.getDate() + 1);
  // }

  const dateArray = [];

  let currentDate = d;

  while (currentDate <= d1) {
    dateArray.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // console.log("THe date array", dateArray);

  //first considering one day
  const attended = await database("lectures")
    .join("lecture_timetable", "lectures.l_tt_id", "lecture_timetable.tt_id")
    .join(
      "timetable_groups",
      "lecture_timetable.timetable_group_id",
      "timetable_groups.tt_gr_id"
    )
    .join("schools", "timetable_groups.school_id", "schools.school_id")
    .join("campus", "timetable_groups.campus", "campus.cam_id")
    .join(
      "lecture_sessions",
      "lecture_timetable.session_id",
      "lecture_sessions.ls_id "
    )
    .join(
      "study_time",
      "timetable_groups.study_time_id",
      "study_time.study_time_code"
    )
    .leftJoin("rooms", "lecture_timetable.room_id", "rooms.room_id")

    .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")

    .where("schools.alias", school)
    // .andWhere("date", date)
    .whereBetween("date", [s_date, e_date])
    .andWhere("campus.campus_name", campus)
    .select("*");

  let allLectures = [];
  const f = dateArray.map(async (date) => {
    const dayId = date.getDay();

    // console.log("Currently on date", `${date} ${dayId}`);

    const lecturesForThatDay = await database("lecture_timetable")
      .join(
        "timetable_groups",
        "lecture_timetable.timetable_group_id",
        "timetable_groups.tt_gr_id"
      )

      .join("schools", "timetable_groups.school_id", "schools.school_id")
      .join("campus", "timetable_groups.campus", "campus.cam_id")
      .join(
        "lecture_sessions",
        "lecture_timetable.session_id",
        "lecture_sessions.ls_id "
      )
      .join(
        "study_time",
        "timetable_groups.study_time_id",
        "study_time.study_time_code"
      )
      .leftJoin("rooms", "lecture_timetable.room_id", "rooms.room_id")

      .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")

      .where("schools.alias", school)
      .andWhere("day_id", dayId)
      .andWhere("campus.campus_name", campus)
      .select("*");

    // const lecturesForThatDay = await database("lecture_timetable")
    //   .join(
    //     "timetable_groups",
    //     "lecture_timetable.timetable_group_id",
    //     "timetable_groups.tt_gr_id"
    //   )
    //   .join("schools", "timetable_groups.school_id", "schools.school_id")
    //   .join("campus", "timetable_groups.campus", "campus.cam_id")
    //   .join(
    //     "lecture_sessions",
    //     "lecture_timetable.session_id",
    //     "lecture_sessions.ls_id "
    //   )
    //   .join(
    //     "study_time",
    //     "timetable_groups.study_time_id",
    //     "study_time.study_time_code"
    //   )
    //   .join("rooms", "lecture_timetable.room_id", "rooms.room_id")
    //   .leftJoin("staff", "lecture_timetable.lecturer_id", "=", "staff.staff_id")
    //   .where("schools.alias", school)
    //   .andWhere("day_id", dayId)
    //   .andWhere("campus.campus_name", campus)
    //   .select("*");

    const lecturesWithDate = lecturesForThatDay.map((lecture) => ({
      ...lecture,
      date: date.toISOString(),
    }));

    allLectures.push(...lecturesWithDate);
  });

  let attendedLectures = [];

  const x = attended.map(async (lecture) => {
    // let index = lecture.course_unit_id.lastIndexOf("-");
    // let trimmedStr = lecture.course_unit_id.slice(0, index);
    // console.log("The trimmed string", trimmedStr);

    const members = await database("lecture_members")
      .join("users", "lecture_members.member_id", "=", "users.stu_no")
      .leftJoin(
        "students_biodata",
        "lecture_members.member_id",
        "=",
        "students_biodata.stdno"
      )
      .select(
        "lecture_members.id",
        "lecture_members.date",
        "lecture_members.lecture_id",
        "lecture_members.is_class_rep",
        "lecture_members.status",
        "lecture_members.joined_at",
        "lecture_members.rating",
        "users.role",
        "users.userfull_name",
        "users.stu_no",
        "students_biodata.progcode"
      )
      .orderBy("lecture_members.joined_at")
      .where({
        lecture_id: lecture.course_unit_id,
        date: lecture.date,
        // member_id: stu_id,
      });

    const data = await database("stu_selected_course_units")
      .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")

      .leftJoin(
        "students_biodata",
        "stu_selected_course_units.stu_id",
        "=",
        "students_biodata.stdno"
      )

      .select(
        "stu_selected_course_units.c_id",
        "stu_selected_course_units.stu_id",
        // "lecture_members.is_class_rep",
        "students_biodata.progcode",
        "users.userfull_name",
        "users.role"
      )

      .where({
        course_id: lecture.course_unit_id,
      });

    const fetch_1 = async () => {
      const classReps = await database("class_reps").select("*").where({
        for_wc_cu: lecture.course_unit_id,
      });

      const result = data.map((enrolledStu) => {
        const itemA = classReps.find(
          (cr) => enrolledStu.stu_id === cr.class_rep_id
        );
        if (itemA) {
          return { ...enrolledStu, is_class_rep: 1 };
        }
        return enrolledStu;
      });

      return result;
    };

    const result = await fetch_1();

    attendedLectures.push({ ...lecture, members, enrolledStudents: result });

    return attendedLectures;
  });

  Promise.all([...x, ...f]).then(() => {
    // console.log("Attended lectures", attendedLectures);
    const attendedLectureIds = attended.map((attendedLecture) => ({
      tt_id: attendedLecture.l_tt_id,
      date: attendedLecture.date,
    }));

    const missed = allLectures.filter((lecture) => {
      return !attendedLectureIds.some((attendedLecture) => {
        // console.log(
        //   "comparison",
        //   `${attendedLecture.tt_id} ${new Date(
        //     attendedLecture.date
        //   ).toDateString()}, ${new Date(lecture.date).toDateString()}`
        // );
        return (
          attendedLecture.tt_id === lecture.tt_id &&
          new Date(attendedLecture.date).toDateString() ===
            new Date(lecture.date).toDateString()
        );
      });
    });
    res.send({
      attended: attendedLectures,
      // allLectures: allLectures.length,
      missedLectures: missed,
    });
  });
  //console.log(req.body);
});

module.exports = router;
