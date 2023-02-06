const express = require("express");
const router = express.Router();
const { database, baseIp, port } = require("../config");

router.get("/lectureTimetable", (req, res) => {
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
});

router.post("/addExamTimetable", (req, res) => {
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

router.post("/addClassTimetable", async (req, res) => {
  const { headers, timetable } = req.body;
  const d = new Date();
  const date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const existingTimetableGroup = await database
    .select("*")
    .where({
      school_id: headers.school.value,
      study_time_id: headers.studyTime.value,
      campus: headers.campus.value,
      sem: headers.sem.value,
      year: headers.year.value,
    })
    .from("timetable_groups");

  let timetableGroupId;
  if (existingTimetableGroup.length === 0) {
    const [timetableGroup] = await database("timetable_groups").insert({
      school_id: headers.school.value,
      study_time_id: headers.studyTime.value,
      campus: headers.campus.value,
      sem: headers.sem.value,
      year: headers.year.value,
    });
    timetableGroupId = timetableGroup;
  } else {
    timetableGroupId = existingTimetableGroup[0].tt_gr_id;
  }

  // console.log("timetableGroup", timetableGroupId);

  const fieldsToInsert = timetable.map((field) => ({
    timetable_group_id: timetableGroupId,
    day_id: field.day.value,
    session_id: field.session.value,
    lecturer_id: field.lecturer.value,
    room_id: field.room.value,
    c_unit_id: field.courseUnit.value.course_code,
    course_unit_name: field.courseUnit.value.course_name,
  }));

  let insertSuccess = true;
  let message;
  for (const field of fieldsToInsert) {
    const result = await database
      .raw(
        `SELECT * FROM lecture_timetable WHERE timetable_group_id = ${field.timetable_group_id} AND day_id = ${field.day_id}  AND c_unit_id = '${field.c_unit_id}' AND course_unit_name = '${field.course_unit_name}'`
      )
      .then((result) => {
        if (!result[0].length) {
          return database("lecture_timetable").insert(field);
        } else {
          insertSuccess = false;
          message = `Two course units cannot have the same name in the same day - ${field.course_unit_name}`;
        }
      });
  }

  if (insertSuccess) {
    res.status(200).send({
      success: true,
      message: "Successfully uploaded the timetable",
    });
  } else {
    res.status(500).send({
      success: false,
      message: message,
    });
  }
});

router.post("/examTT", (req, res) => {
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

module.exports = router;
