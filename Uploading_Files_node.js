const multer = require("multer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");

//will be called as
// await appMulter.uploadImage(req, "file");
// let files = [];
// req.files.forEach((file) => {
//   files.push(file.path);
// });

let appMulter;

//Uploading image to S3 Bucket
// aws.config.update({
//   region: process.env.REGION,
// });

// let s3 = new aws.S3({
//   accessKeyId: process.env.ACCESSKEYID,
//   secretAccessKey: process.env.SECRETACCESSKEY,
// });
// appMulter = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: "streetlogixcabucket",
//     key: function (req, file, cb) {
//       const originalname = file.originalname;
//       cb(null, "application/" + Date.now().toString() + "/" + originalname);
//     },
//   }),
// });
 //Uploading image to Locally
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now().toString() + file.originalname);
  },
});
appMulter = multer({
  storage: storage,
});
const uploadImage = async function (req, name) {
  await new Promise(function (resolve, reject) {
    try {
      appMulter.array(name)(req, {}, function (error) {//single for one file, array for multiples file
        if (error) console.log(error);
        resolve();
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
//Getting files path
  if (req.files) {
    // for S3 bucket
    // if (settings.isLiveApplication()) {
      // req.files.forEach((file) => {
      //   file.path = req.file.location;
      // });
    // } else {
// for locally
    req.files.forEach((file) => {
      file.path = "http://localhost/dashboard/uploads/" + file.filename;
    });

    //}
  }
};

module.exports = appMulter;
module.exports.uploadImage = uploadImage;

