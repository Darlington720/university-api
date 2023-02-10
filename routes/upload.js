const express = require("express");
const router = express.Router();
const { database } = require("../config");

//upload
router.post("/uploadImage", (req, res) => {
  try {
    // console.log(req);
    if (!req.files) {
      req.send({
        status: false,
        message: "No files Uploaded",
      });
    } else {
      let image = req.files.image;

      console.log("path ", __dirname);
      image.mv(__dirname + "/upload/" + image.name);

      res.send({
        status: true,
        message: "File is uploaded",
        data: {
          name: image.name,
          mimetype: image.mimetype,
          size: image.size,
        },
      });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

//upload-multiple
router.post("/upload-photos", async (req, res) => {
  try {
    // console.log("Here is what i got ", req.files.image);
    // console.log("Here is what i got ", req.files);
    if (!req.files) {
      res.send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      let data = [];

      //loop all files
      if (Array.isArray(req.files.image)) {
        req.files.image.forEach((photo) => {
          photo.mv(__dirname + "/public/assets/" + photo.name);

          //push file details
          data.push({
            name: photo.name,
            mimetype: photo.mimetype,
            size: photo.size,
          });
        });
        res.send({
          status: true,
          message: "Files are uploaded",
          data: data,
        });
      } else {
        let image = req.files.image;

        // console.log("path ", __dirname);
        image.mv(__dirname + "/public/assets/" + image.name);

        res.send({
          status: true,
          message: "File is uploaded",
          data: {
            name: image.name,
            mimetype: image.mimetype,
            size: image.size,
          },
        });
      }

      // forEach(keysIn(req.files.photo), (key) => {
      //   let photo = req.files.image[key];
      //   console.log("Keyyyy", key);

      //   //move photo to uploads directory
      //   photo.mv("./uploads/" + image.name);

      //   //push file details
      //   data.push({
      //     name: image.name,
      //     mimetype: image.mimetype,
      //     size: image.size,
      //   });
      // });

      //return response
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post("/importExceltodb", (req, res) => {
  try {
    // console.log("received This ", req.body.excelObj);
    if (!req.files) {
      req.send({
        status: false,
        message: "No files Uploaded",
      });
    } else {
      let xlsFile = req.files.excelFile;
      // console.log("File i got ", xlsFile);

      // res.send(xlsFile);

      // console.log("path ", __dirname);
      xlsFile
        .mv(__dirname + "/upload/excel_sheets/" + xlsFile.name)
        .then(() => {
          try {
            const workbook = XLSX.readFile(
              `${__dirname}/upload/excel_sheets/${xlsFile.name}`
            );

            // Get the first worksheet in the workbook
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Convert the worksheet to a JSON object
            const json = XLSX.utils.sheet_to_json(worksheet);

            const modifiedArray = json.map((obj) => {
              const newObj = {};
              for (const key in obj) {
                let filteredKey = key.replace(/"/g, "");
                newObj[filteredKey] = obj[key].replace(/"/g, "");
              }
              return newObj;
            });

            // console.log("The final object", modifiedArray);
            // res.send(modifiedArray);

            const fieldsToInsertBiodata = modifiedArray
              .map((field, index) => {
                // const noSpecialChars = str.replace(/[^a-zA-Z0-9 ]/g, "");
                if (index == 0) return;
                return {
                  stdno: field.stdno.replace(/[^a-zA-Z0-9 ]/g, ""),
                  regno: field.regno.replace(/[^a-zA-Z0-9/ ]/g, ""),
                  name: field.name.replace(/[^a-zA-Z0-9 ]/g, ""),
                  admissions_form_no: "",
                  sex: field.sex.replace(/[^a-zA-Z0-9 ]/g, ""),
                  telno: field.telno.replace(/[^a-zA-Z0-9 ]/g, ""),
                  entry_ac_yr: field.entry_ac_yr.replace(/[^a-zA-Z0-9 ]/g, ""),
                  entry_study_yr: field.study_yr.replace(/[^a-zA-Z0-9 ]/g, ""),
                  nationality: field.nationality.replace(/[^a-zA-Z0-9 ]/g, ""),
                  facultycode: field.facultycode.replace(/[^a-zA-Z0-9 ]/g, ""),
                  progtitle: field.progtitle.replace(/[^a-zA-Z0-9 ]/g, ""),
                  progcode: field.progcode.replace(/[^a-zA-Z0-9 ]/g, ""),
                  prog_alias: field.prog_alias.replace(/[^a-zA-Z0-9 ]/g, ""),

                  programlevel: field.programlevel.replace(
                    /[^a-zA-Z0-9 ]/g,
                    ""
                  ),
                  progduration: "",
                  facultytitle: field.facultytitle.replace(
                    /[^a-zA-Z0-9 ]/g,
                    ""
                  ),
                  intake: field.intake.replace(/[^a-zA-Z0-9 ]/g, ""),
                  campus: field.campus.replace(/[^a-zA-Z0-9 ]/g, ""),
                  sponsorship: field.sponsorship.replace(/[^a-zA-Z0-9 ]/g, ""),
                  residence_status: field.residence_status.replace(
                    /[^a-zA-Z0-9 ]/g,
                    ""
                  ),
                  current_sem: field.sem.replace(/[^a-zA-Z0-9 ]/g, ""),
                  study_yr: field.study_yr.replace(/[^a-zA-Z0-9 ]/g, ""),
                  study_time: field.study_time.replace(/[^a-zA-Z0-9 ]/g, ""),
                  collegetitle: field.collegetitle.replace(
                    /[^a-zA-Z0-9 ]/g,
                    ""
                  ),
                  std_status: 0,
                  progversion: "",
                };
              })
              .filter((row) => {
                return row !== undefined;
              });

            const fieldsToInsert = modifiedArray
              .map((field, index) => {
                const noWhiteSpace = field.total_bill.replace(/\s/g, "");
                var cleanTotalBill = noWhiteSpace.replace(
                  /[^a-zA-Z0-9. ]/g,
                  ""
                );

                const noWhiteSpace2 = field.total_paid.replace(/\s/g, "");
                var cleanTotalPaid = noWhiteSpace2.replace(
                  /[^a-zA-Z0-9. ]/g,
                  ""
                );

                const noWhiteSpace3 = field.total_credit.replace(/\s/g, "");
                var cleanTotalCredit = noWhiteSpace3.replace(
                  /[^a-zA-Z0-9. ]/g,
                  ""
                );

                const noWhiteSpace4 = field.total_due.replace(/\s/g, "");
                var cleanTotalDue = noWhiteSpace4.replace(/[^\d]+/g, "");

                // const noSpecialChars = str.replace(/[^a-zA-Z0-9 ]/g, "");
                // if (index == 0) return;

                // res.send(field);
                return {
                  stu_no: field.stdno.replace(/[^a-zA-Z0-9 ]/g, ""),
                  acc_yr: field.accyr.replace(/[^a-zA-Z0-9 ]/g, ""),
                  study_yr: field.study_yr.replace(/[^a-zA-Z0-9 ]/g, ""),
                  sem: field.sem.replace(/[^a-zA-Z0-9 ]/g, ""),
                  reg_status: field.reg_status.replace(/[^a-zA-Z0-9 ]/g, ""),
                  total_bill: cleanTotalBill,
                  total_credit: cleanTotalCredit,
                  tatal_paid: cleanTotalPaid,
                  paid_percentage: isNaN(
                    parseInt(
                      ((parseInt(cleanTotalPaid) + parseInt(cleanTotalCredit)) /
                        parseInt(cleanTotalBill)) *
                        100
                    )
                  )
                    ? 0
                    : parseInt(
                        ((parseInt(cleanTotalPaid) +
                          parseInt(cleanTotalCredit)) /
                          parseInt(cleanTotalBill)) *
                          100
                      ),
                  total_due: cleanTotalDue,
                };
              })
              .filter((row) => {
                return row !== undefined;
              });

            const inserts = fieldsToInsert.map((stu) => {
              // database("student_paid_fess")
              //   .where("stu_no", stu.stu_no)
              //   .andWhere("study_yr", stu.study_yr)
              //   .andWhere("sem", stu.sem)
              return database
                .select("*")
                .where({
                  stu_no: stu.stu_no,
                  study_yr: stu.study_yr,
                  sem: stu.sem,
                })
                .from("student_paid_fess")
                .then((result) => {
                  //the stu number is not there
                  if (result.length == 0) {
                    return database("student_paid_fess")
                      .insert(stu)
                      .then((data) => {
                        // res.status(200).send("Success");
                        // console.log("Data", data);
                      })
                      .catch((err) => {
                        console.log("Failed to save the data", err);
                        // res.status(400).send("fail");
                      });
                  } else {
                    //the stu no id there
                    return database("student_paid_fess")
                      .where(function () {
                        this.where("stu_no", "=", stu.stu_no);
                      })

                      .andWhere(function () {
                        this.where("study_yr", "=", stu.study_yr);
                      })
                      .andWhere(function () {
                        this.where("sem", "=", stu.sem);
                      })
                      .update({
                        acc_yr: stu.acc_yr,
                        paid_percentage: stu.paid_percentage,
                        reg_status: stu.reg_status,
                        total_bill: stu.total_bill,
                        total_credit: stu.total_credit,
                        tatal_paid: stu.tatal_paid,
                        total_due: stu.total_due,
                      })
                      .then((data) => {
                        // res.send("updated the data");
                        // console.log("Data here", data);
                      })
                      .catch((err) =>
                        console.log("Error in updating the data", err)
                      );
                  }
                });
            });

            const insert2 = fieldsToInsertBiodata.map((student) => {
              return database
                .select("*")
                .from("students_biodata")
                .where("students_biodata.stdno", "=", student.stdno)
                .then((stuData) => {
                  if (stuData.length == 0) {
                    return database("students_biodata")
                      .insert({
                        stdno: student.stdno,
                        regno: student.regno,
                        name: student.name,
                        admissions_form_no: student.admissions_form_no,
                        sex: student.sex,
                        telno: student.telno,
                        entry_ac_yr: student.entry_ac_yr,
                        entry_study_yr: student.entry_study_yr,
                        nationality: student.nationality,
                        facultycode: student.facultycode,
                        progtitle: student.progtitle,
                        progcode: student.progcode,
                        prog_alias: student.prog_alias,
                        programlevel: student.programlevel,
                        progduration: student.progduration,
                        facultytitle: student.facultytitle,
                        intake: student.intake,
                        campus: student.campus,
                        sponsorship: student.sponsorship,
                        residence_status: student.residence_status,
                        current_sem: student.current_sem,
                        study_yr: student.study_yr,
                        study_time: student.study_time,
                        collegetitle: student.collegetitle,
                        std_status: student.std_status,
                        progversion: student.progversion,
                      })
                      .then((result) => {
                        console.log(
                          "Added a new student to our db ",
                          student.stdno
                        );
                      });
                  }
                });
            });

            // Wait for all the inserts to complete
            Promise.all([...insert2, ...inserts])
              .then(() => {
                // Send the response when the inserts are done
                database("uploaded_excel_forms_fees")
                  .insert({
                    file_name: xlsFile.name,
                    upload_date: new Date(),
                  })
                  .then((result) => {
                    res.send({
                      success: true,
                      message: "Excel sheet uploaded successfully",
                    });
                  });
              })
              .catch((err) => {
                console.error(err);
                // res.send(`Error ${err}`);
                res.send({
                  success: false,
                  message: "Theres a problem with the sent file",
                });
              });
          } catch (error) {
            res.send({
              success: false,
              message: "Error in file provided",
            });
          }
          // Load the Excel file

          // console.log("The response ", res2);
          // readXlsxFile(`${__dirname}/upload/excel_sheets/${xlsFile.name}`).then(
          //   (rows) => {
          //     // res.send(rows);

          //     const fieldsToInsertBiodata = rows
          //       .map((field, index) => {
          //         // const noSpecialChars = str.replace(/[^a-zA-Z0-9 ]/g, "");
          //         if (index == 0) return;
          //         return {
          //           stdno: field[0].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           regno: field[1].replace(/[^a-zA-Z0-9/ ]/g, ""),
          //           name: field[3].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           admissions_form_no: "",
          //           sex: field[4].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           telno: field[6].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           entry_ac_yr: field[7].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           entry_study_yr: field[15].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           nationality: field[8].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           facultycode: field[23].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           progtitle: field[21].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           progcode: field[19].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           prog_alias: field[20].replace(/[^a-zA-Z0-9 ]/g, ""),

          //           programlevel: field[22].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           progduration: "",
          //           facultytitle: field[24].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           intake: field[30].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           campus: field[29].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           sponsorship: field[27].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           residence_status: field[10].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           current_sem: field[16].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           study_yr: field[15].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           study_time: field[13].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           collegetitle: field[26].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           std_status: 0,
          //           progversion: "",
          //         };
          //       })
          //       .filter((row) => {
          //         return row !== undefined;
          //       });

          //     const fieldsToInsert = rows
          //       .map((field, index) => {
          //         const noWhiteSpace = field[48].replace(/\s/g, "");
          //         var cleanTotalBill = noWhiteSpace.replace(
          //           /[^a-zA-Z0-9. ]/g,
          //           ""
          //         );

          //         const noWhiteSpace2 = field[50].replace(/\s/g, "");
          //         var cleanTotalPaid = noWhiteSpace2.replace(
          //           /[^a-zA-Z0-9. ]/g,
          //           ""
          //         );

          //         const noWhiteSpace3 = field[49].replace(/\s/g, "");
          //         var cleanTotalCredit = noWhiteSpace3.replace(
          //           /[^a-zA-Z0-9. ]/g,
          //           ""
          //         );

          //         const noWhiteSpace4 = field[51].replace(/\s/g, "");
          //         var cleanTotalDue = noWhiteSpace4.replace(/[^\d]+/g, "");

          //         // const noSpecialChars = str.replace(/[^a-zA-Z0-9 ]/g, "");
          //         if (index == 0) return;
          //         return {
          //           stu_no: field[0].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           acc_yr: field[14].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           study_yr: field[15].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           sem: field[16].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           reg_status: field[31].replace(/[^a-zA-Z0-9 ]/g, ""),
          //           total_bill: cleanTotalBill,
          //           total_credit: cleanTotalCredit,
          //           tatal_paid: cleanTotalPaid,
          //           paid_percentage: isNaN(
          //             parseInt(
          //               ((parseInt(cleanTotalPaid) +
          //                 parseInt(cleanTotalCredit)) /
          //                 parseInt(cleanTotalBill)) *
          //                 100
          //             )
          //           )
          //             ? 0
          //             : parseInt(
          //                 ((parseInt(cleanTotalPaid) +
          //                   parseInt(cleanTotalCredit)) /
          //                   parseInt(cleanTotalBill)) *
          //                   100
          //               ),
          //           total_due: cleanTotalDue,
          //         };
          //       })
          //       .filter((row) => {
          //         return row !== undefined;
          //       });

          //     // console.log(fieldsToInsert);
          //     // res.send(fieldsToInsertBiodata);

          //     fieldsToInsert.forEach((stu) => {
          //       // database("student_paid_fess")
          //       //   .where("stu_no", stu.stu_no)
          //       //   .andWhere("study_yr", stu.study_yr)
          //       //   .andWhere("sem", stu.sem)
          //       database
          //         .select("*")
          //         .where({
          //           stu_no: stu.stu_no,
          //           study_yr: stu.study_yr,
          //           sem: stu.sem,
          //         })
          //         .from("student_paid_fess")
          //         .then((result) => {
          //           //the stu number is not there
          //           if (result.length == 0) {
          //             database("student_paid_fess")
          //               .insert(stu)
          //               .then((data) => {
          //                 // res.status(200).send("Success");
          //                 console.log("Data", data);
          //               })
          //               .catch((err) => {
          //                 console.log("Failed to save the data", err);
          //                 // res.status(400).send("fail");
          //               });
          //           } else {
          //             //the stu no id there
          //             database("student_paid_fess")
          //               .where(function () {
          //                 this.where("stu_no", "=", stu.stu_no);
          //               })

          //               .andWhere(function () {
          //                 this.where("study_yr", "=", stu.study_yr);
          //               })
          //               .andWhere(function () {
          //                 this.where("sem", "=", stu.sem);
          //               })
          //               .update({
          //                 acc_yr: stu.acc_yr,
          //                 paid_percentage: stu.paid_percentage,
          //                 reg_status: stu.reg_status,
          //                 total_bill: stu.total_bill,
          //                 total_credit: stu.total_credit,
          //                 tatal_paid: stu.tatal_paid,
          //                 total_due: stu.total_due,
          //               })
          //               .then((data) => {
          //                 // res.send("updated the data");
          //                 // console.log("Data here", data);
          //               })
          //               .catch((err) =>
          //                 console.log("Error in updating the data", err)
          //               );
          //           }
          //         });
          //     });

          //     fieldsToInsertBiodata.forEach((student) => {
          //       database
          //         .select("*")
          //         .from("students_biodata")
          //         .where("students_biodata.stdno", "=", student.stdno)
          //         .then((stuData) => {
          //           if (stuData.length == 0) {
          //             database("students_biodata")
          //               .insert({
          //                 stdno: student.stdno,
          //                 regno: student.regno,
          //                 name: student.name,
          //                 admissions_form_no: student.admissions_form_no,
          //                 sex: student.sex,
          //                 telno: student.telno,
          //                 entry_ac_yr: student.entry_ac_yr,
          //                 entry_study_yr: student.entry_study_yr,
          //                 nationality: student.nationality,
          //                 facultycode: student.facultycode,
          //                 progtitle: student.progtitle,
          //                 progcode: student.progcode,
          //                 prog_alias: student.prog_alias,

          //                 programlevel: student.programlevel,
          //                 progduration: student.progduration,
          //                 facultytitle: student.facultytitle,
          //                 intake: student.intake,
          //                 campus: student.campus,
          //                 sponsorship: student.sponsorship,
          //                 residence_status: student.residence_status,
          //                 current_sem: student.current_sem,
          //                 study_yr: student.study_yr,
          //                 study_time: student.study_time,
          //                 collegetitle: student.collegetitle,
          //                 std_status: student.std_status,
          //                 progversion: student.progversion,
          //               })
          //               .then((result) => {
          //                 console.log(
          //                   "Added a new student to our db ",
          //                   student.stdno
          //                 );
          //               });
          //           }
          //         });
          //     });

          //     // database("student_paid_fess")
          //     //   .insert(fieldsToInsert)
          //     //   .then((data) => {
          //     //     res.status(200).send("Success");
          //     //     console.log("Data", data);
          //     //   })
          //     //   .catch((err) => {
          //     //     console.log("Failed to save the data", err);
          //     //     res.status(400).send("fail");
          //     //   });
          //   }
          // );
        });
      // .then(() => {
      //   res.send({
      //     success: true,
      //     message: "Excel Sheet uploaded successfully",
      //   });
      // });

      // res.send({
      //   status: true,
      //   message: "File is uploaded",
      //   data: {
      //     name: xlsFile.name,
      //     mimetype: xlsFile.mimetype,
      //     size: xlsFile.size,
      //   },
      // });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/lastUploadDateForFees", (req, res) => {
  database
    // .orderBy("id")
    .select("*")
    .from("uploaded_excel_forms_fees")
    .then((data) => {
      res.send(data[data.length - 1]);
    });
});

module.exports = router;
