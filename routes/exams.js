const express = require("express");
const router = express.Router();
const { database } = require("../config");

// Configure multer to store uploaded files in a desired location
const storage = multer.diskStorage({
  destination: path.resolve(__dirname, "..", "upload/evidence"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.get("/student/:stdno", async (req, res) => {
  const { stdno } = req.params;
  let year;
  let sem;
  let student_cus = [];
  let registration_status = "Not Registered";
  const student = await database.select("*").from("students_biodata").where({
    stdno,
  });

  if (!student[0]) {
    return res.send({
      success: false,
      message: `Unknown Student ${stdno}`,
    });
  }

  year = student[0].study_yr;
  sem = student[0].current_sem;

  const payments = await database.select("*").from("student_paid_fess").where({
    stu_no: stdno,
  });

  // active payments - pick the current yr and sem
  if (payments.length > 0) {
    year = payments[payments.length - 1].study_yr;
    sem = payments[payments.length - 1].sem;
    registration_status = payments[payments.length - 1].reg_status;
  }

  // booklet numbers for the student
  const course_units_did_by_student = await database
    .select("*")
    .from("students_in_exam_room")
    .join(
      "courseunits_in_exam_rooms",
      "students_in_exam_room.cu_in_ex_id",
      "=",
      "courseunits_in_exam_rooms.cunit_in_ex_room_id"
    )
    .join(
      "exam_details",
      "courseunits_in_exam_rooms.ed_id",
      "=",
      "exam_details.ed_id"
    )
    .andWhere("students_in_exam_room.stu_no", "=", stdno);
  // .groupBy("course_unit_code");

  //exemptions
  const studentExemptions = await database
    .select("*")
    .from("exemptions")
    .where("stdno", "=", stdno);

  if (!course_units_did_by_student[0]) {
    return res.send({
      success: true,
      result: {
        biodata: student[0],
        payments,
        study_yr: year,
        current_sem: sem,
        registration_status,
        student_cus: studentExemptions,
      },
    });
  }
  const x = course_units_did_by_student.map(async (cu) => {
    const booklets = await database
      .select("*")
      .from("student_registered_booklets")
      .where({
        stu_in_ex_room_id: cu.se_id,
      });

    return student_cus.push({ ...cu, booklets });
  });

  Promise.all(x)
    .then(() => {
      res.send({
        success: true,
        result: {
          biodata: student[0],
          payments,
          study_yr: year,
          current_sem: sem,
          registration_status,
          student_cus: [...student_cus, ...studentExemptions],
        },
      });
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

router.post("/api/saveRegisteredModule", (req, res) => {
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

router.post("/api/examHandin", (req, res) => {
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

router.post("/api/addStudentBookletNos", (req, res) => {
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

router.get("/api/getStudentRegBookletNos/:moduleRegId", (req, res) => {
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

router.get("/api/getStudentRegisteredModules/:studentNo", (req, res) => {
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

router.post("/api/examsDidInRoom", (req, res) => {
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

module.exports = router;
