const express = require("express");
const router = express.Router();
const { database, baseIp, port } = require("../config");

router.post("/login", (req, res) => {
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
        res.status(400).json({ error: "Invalid email or password" });
      } else {
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
                  res.send({
                    ...user[0],
                    otherData: studentData,
                    imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
                    studentCourseUnits: courseUnitsData,
                  });
                });
            });
        } else {
          res.send({
            ...user[0],
            imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
          });
        }
      }
    })
    .catch((err) => {
      res.status(400).json({ error: "Invalid email or password" });
    });
});

router.post("/saveToken", (req, res) => {
  // console.log("Obj received", req.body);
  database
    .select("*")
    .from("users")
    .where({
      id: req.body.user_id,
    })
    .update({
      token: req.body.token,
    })
    .then((data2) => {
      // console.log(`Updated ${req.body.name}'s push token`, data2);
      res.end();
    })
    .catch((err) => {
      console.log("error in storing token", err);
      res.end();
    });
});

router.post("/removeToken", (req, res) => {
  const { user_id, username, password, token } = req.body;
  // console.log("user info", req.body);
  database
    .select("*")
    .from("users")
    .where({
      id: user_id,
    })
    .update({
      token: null,
    })
    .then((data2) => {
      console.log(`removed ${user_id}'s push token`);
      res.end();
    })
    .catch((err) => {
      console.log("Error removing token", err);
      res.end();
    });
});

module.exports = router;
