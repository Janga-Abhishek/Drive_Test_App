// Import necessary modules
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Appointment = require("./models/appointment");
const bcrypt = require("bcrypt");
const session = require("express-session");

const ejs = require("ejs");
app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);
app.use(express.static("public"));
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const authenticateUser = async (req, res, next) => {
  if (req.session.user) {
    try {
      const userId = req.session.user.id;
      const user = await User.findById(userId);
      if (user) {
        res.locals.user = user;
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "An error occurred" });
    }
    next();
  } else {
    res.redirect("/login");
  }
};

app.use(
  session({
    secret: "AbhishekJanga",
    resave: false,
    saveUninitialized: true,
  })
);

var mongoDbQuery =
  "mongodb+srv://jangaabhishek:abhishekjanga@cluster0.iivycnm.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(mongoDbQuery, { useNewUrlParser: true });

app.post("/submit-g2", authenticateUser, async (req, res) => {
  const loggedInUser = res.locals.user;

  const { firstName, lastName, age, licenseNumber, make, model, year, platno } =
    req.body;

  try {
    const licenseNumber = req.body.licenseNumber;
    const hashedLicenseNumber = await bcrypt.hash(licenseNumber, 10);

    loggedInUser.firstName = firstName;
    loggedInUser.lastName = lastName;
    loggedInUser.licenseNo = hashedLicenseNumber;
    loggedInUser.originalLicenseNo = licenseNumber;
    loggedInUser.age = age;
    loggedInUser.car_details.make = make;
    loggedInUser.car_details.model = model;
    loggedInUser.car_details.year = year;
    loggedInUser.car_details.platno = platno;

    await loggedInUser.save();
    const formSubmitted = true;
    const loggedIn = true;
    const appointments = await Appointment.find({ isTimeSlotAvailable: true });
    const userId = req.session.user.id;
    const bookedAppointments = await Appointment.find({ bookedBy: userId });
    const status = loggedInUser.examStatus;

    res.render("g2_page", {
      user: loggedInUser,
      loggedIn,
      formSubmitted,
      appointments,
      backgroundClass: null,
      bookedAppointments,
      status,
    });
  } catch (err) {
    console.error(err);
    const loggedIn = true;
    const errorMessage =
      "Duplicate Licence Number, Licence number already exists";
    res.render("g2_page", { errorMessage, loggedIn, status });
  }
});

app.post("/fetch-user", (req, res) => {
  const { licenseNumber } = req.body;
  User.findOne({ licenseNo: licenseNumber }, (err, user) => {
    if (err || !user) {
      console.log(user);
      return res.render("g_page", { message: "No User Found" });
    }
    res.render("g_page", { userData: user });
  });
});

app.post("/process-license", async (req, res) => {
  const licenseNumber = req.body.licenseNumber;
  try {
    const user = await User.findOne({ licenseNo: licenseNumber }).exec();
    if (!user) {
      res.render("g_page", { user: null, message: "No User Found" });
    } else {
      res.render("g_page", { user });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  let message = "";
  let loggedIn = false;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      message = "User not found";
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = { id: user._id, userType: user.userType };
        loggedIn = true;
        return res.redirect("/dashboard");
      } else {
        message = "Incorrect password";
      }
    }
    res.render("login", { user, message, loggedIn });
  } catch (error) {
    console.error(error);
    message = "An error occurred during login";
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, confirmPassword, userType } = req.body;
  let message = "";
  const loggedIn = false;
  const user = new User({ username, password, userType });
  if (password !== confirmPassword) {
    message = "Passwords do not match";
    return res.render("signup", { user, message, loggedIn });
  }

  try {
    await user.save();
    message = "User registered successfully!";
    res.render("signup", { user, message, loggedIn });
  } catch (error) {
    console.error(error);
    message = "Error registering user";
    res.render("signup", { user, message, loggedIn });
  }
});

app.post("/update-car-info", authenticateUser, async (req, res) => {
  const { licenseNumber, make, model, year, platno } = req.body;
  const appointments = await Appointment.find({ isTimeSlotAvailable: true });
  const loggedInUser = res.locals.user;
  const loggedIn = true;

  const userId = req.session.user.id;
  const status = loggedInUser.examStatus;

  const bookedAppointments = await Appointment.find({ bookedBy: userId });

  User.findOne({ licenseNo: licenseNumber })
    .then((user) => {
      if (!user) {
        return res.render("g_page", { message: "No User Found" });
      }
      if (make) user.car_details.make = make;
      if (model) user.car_details.model = model;
      if (year) user.car_details.year = year;
      if (platno) user.car_details.platno = platno;
      return user.save();
    })
    .then(() => {
      return res.render("g_page", {
        loggedIn,
        appointments,
        backgroundClass: null,
        status,
        bookedAppointments,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "An error occurred" });
    });
});
let port = process.env.PORT;
if (port == null || port == "") {
  port = 4000;
}
app.listen(port, () => {
  console.log("App listening 4000");
});

// app.get("/dashboard", (req, res) => {
//   const loggedIn = req.session.user !== undefined;
//   console.log(loggedIn);
//   res.render("dashboard", { loggedIn });
// });

// app.get("/g_page", (req, res) => {
//   const user = null;
//   const loggedIn = req.session.user !== undefined;

//   const message = user ? "" : "No user data found";
//   res.render("g_page", { user, message, loggedIn });
// });

app.get("/login", (req, res) => {
  const loggedIn = false;
  let userType = "";
  let user = "";
  res.render("login", { user, userType, loggedIn });
});
app.get("/signup", (req, res) => {
  const loggedIn = false;
  let user = "";

  res.render("signup", { user, loggedIn });
});
// app.get("/g2_page", (req, res) => {
//   const loggedIn = req.session.user !== undefined;

//   res.render("g2_page", { loggedIn });
// });

app.get("/", (req, res) => {
  const loggedIn = false;
  let user = "";
  res.render("login", { user, loggedIn });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    } else {
      res.redirect("/login");
    }
  });
});

// const authenticateUser = (req, res, next) => {
//   if (req.session.user) {
//     next();
//   } else {
//     res.redirect("/login");
//   }
// };
app.get("/dashboard", authenticateUser, (req, res) => {
  res.render("dashboard", { loggedIn: true });
});

// app.get("/g_page", authenticateUser, (req, res) => {
//   // Render the g_page view
//   res.render("g_page", { loggedIn: true });
// });

app.get("/g2_page", authenticateUser, async (req, res) => {
  const loggedInUser = res.locals.user;
  const appointments = await Appointment.find({ isTimeSlotAvailable: true });
  const userId = req.session.user.id;
  const status = loggedInUser.examStatus;

  const bookedAppointments = await Appointment.find({ bookedBy: userId });
  try {
    let formSubmitted = false;

    // Assuming that first name is a required field
    if (loggedInUser && loggedInUser.firstName) {
      formSubmitted = true;
    }

    return res.render("g2_page", {
      user: loggedInUser,
      formSubmitted,
      loggedIn: true,
      appointments,
      bookedAppointments,
      backgroundClass: null,
      status,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
});

// Assuming you have fetched appointments and stored them in the variable 'appointments'

app.get("/g_page", authenticateUser, async (req, res) => {
  try {
    const loggedInUser = res.locals.user;
    const userId = req.session.user.id;
    const user = await User.findById(userId);

    // Fetch appointments here or from your database
    const appointments = await Appointment.find({ isTimeSlotAvailable: true });
    const bookedAppointments = await Appointment.find({ bookedBy: userId });
    const status = loggedInUser.examStatus;

    if (!loggedInUser) {
      const message = "No user data found";
      return res.render("g_page", {
        user: null,
        message,
        loggedIn: true,
        backgroundClass: null,
        appointments,
        bookedAppointments,
        status,
        // Pass the 'appointments' variable to the template
      });
    }

    res.render("g_page", {
      user: loggedInUser,
      message: "",
      loggedIn: true,
      backgroundClass: null,
      appointments,
      bookedAppointments,
      status,
      // Pass the 'appointments' variable to the template
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred" });
  }
});

// Assignment-4:
const { authAdminMiddleware } = require("./middleware/authMiddleware");

app.get("/appointment", authAdminMiddleware, async (req, res) => {
  try {
    const loggedInUser = res.locals.user;
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const existingSlots = await Appointment.find().populate("bookedBy");

    if (user) {
      const loggedIn = true;
      res.render("appointment", {
        user: loggedInUser,
        userType: user.userType,
        loggedIn,
        existingSlots,
        backgroundClass: null,
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

app.post("/appointment", authAdminMiddleware, async (req, res) => {
  try {
    const { date, time } = req.body;
    const existingAppointment = await Appointment.findOne({ date, time });

    if (existingAppointment) {
      return res.render("appointment", {
        loggedIn: true,
        existingSlots: await Appointment.find().populate("bookedBy"),
        message: "Appointment already exists for this date and time",
        backgroundClass: "appointment-error",
      });
    }
    const newAppointment = new Appointment({ date, time });
    await newAppointment.save();
    res.render("appointment", {
      loggedIn: true,
      existingSlots: await Appointment.find().populate("bookedBy"),
      message: "Appointment created successfully",
      backgroundClass: "appointment-success",
    });
  } catch (error) {
    console.error(error);
    res.render("appointment", {
      loggedIn: true,
      existingSlots: await Appointment.find().populate("bookedBy"),
      message: "An error occurred while creating the appointment",
      backgroundClass: "appointment-error",
    });
  }
});

app.get("/g2_page", authenticateUser, async (req, res) => {
  try {
    const appointments = await Appointment.find({ isTimeSlotAvailable: true });
    const loggedInUser = res.locals.user;
    const userId = req.session.user.id;
    const status = loggedInUser.examStatus;

    const user = await User.findById(userId);
    if (loggedInUser && loggedInUser.firstName) {
      formSubmitted = true;
    }
    res.render("g2_page", {
      appointments,
      formSubmitted,
      user: loggedInUser,
      userType: user.userType,
      backgroundClass: null,
      loggedIn: true,
      status,
    });
  } catch (error) {
    console.error("Error fetching available appointments:", error);
    res.status(500).send("Error fetching available appointments");
  }
});
// POST route for booking an appointment
app.post("/g2_page", authenticateUser, async (req, res) => {
  const userId = req.session.user.id;
  const { selectedAppointment } = req.body;
  const appointments = await Appointment.find({ isTimeSlotAvailable: true });

  try {
    const appointment = await Appointment.findById(selectedAppointment);
    const formSubmitted = false;
    const loggedInUser = res.locals.user;
    const status = loggedInUser.examStatus;

    if (loggedInUser && loggedInUser.firstName) {
      const bookedAppointments = await Appointment.find({ bookedBy: userId });

      if (!appointment || !appointment.isTimeSlotAvailable) {
        return res.render("g2_page", {
          user: loggedInUser,
          formSubmitted,
          loggedIn: true,
          appointments: false,
          bookedAppointments,
          message: "Invalid or already booked appointment",
          backgroundClass: "appointment-error",
          status,
        });
      }
    }
    appointment.isTimeSlotAvailable = false;
    appointment.bookedBy = userId;

    await appointment.save();
    const user = await User.findById(userId);
    if (user) {
      user.examType = "G2";

      user.bookedAppointments.push(appointment._id);
      await user.save();
    }
    const bookedAppointments = await Appointment.find({ bookedBy: userId });

    return res.render("g2_page", {
      user: loggedInUser,
      formSubmitted,
      loggedIn: true,
      appointments: false,
      bookedAppointments,
      message: "Appointment booked Successfully",
      backgroundClass: "appointment-success",
      status,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).send("Error booking appointment");
  }
});

app.get("/user_appointments", authenticateUser, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const bookedAppointments = await Appointment.find({ bookedBy: userId });

    const loggedInUser = res.locals.user;
    const user = await User.findById(userId);
    res.render("user_appointments", {
      bookedAppointments,
      user: loggedInUser,
      userType: user.userType,
      loggedIn: true,
    });
  } catch (error) {
    console.error("Error fetching user's booked appointments:", error);
    res.status(500).send("Error fetching user's booked appointments");
  }
});

app.get("/api/existing-appointments", async (req, res) => {
  const { date } = req.query;

  try {
    const existingAppointments = await Appointment.find({ date });

    res.json(existingAppointments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch existing appointments", error });
  }
});

// app.get("/examiner", authenticateUser, async (req, res) => {
//   try {
//     const loggedIn = false;
//     let user = "";
//     const appointments = await Appointment.find({ isTimeSlotAvailable: true });
//     const loggedInUser = res.locals.user;

//     res.render("examiner", {
//       user: loggedInUser,
//       loggedIn: true,
//       appointments,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error fetching appointments");
//   }
// });

// Assuming appointments data is retrieved properly
// Assuming an Express route handling the filter logic

// Assuming this is an Express.js route setup
app.get("/examiner", authenticateUser, async (req, res) => {
  try {
    const { examType } = req.query;

    let appointments;
    const loggedInUser = res.locals.user;

    // Fetch appointments or drivers based on the examType filter
    if (examType) {
      // Perform query based on the selected examType
      appointments = await User.find({ examType, userType: "Driver" }); // Adjust the query as per your data structure
    } else {
      // If no specific examType is selected, fetch all appointments
      appointments = await User.find({ userType: "Driver" });
    }

    // Render the page with the filtered appointments/drivers
    res.render("examiner", {
      appointments,
      user: loggedInUser,
      loggedIn: true,
    });
  } catch (error) {
    // Handle errors appropriately
    console.error("Error fetching appointments/drivers:", error);
    res.status(500).send("Error fetching appointments/drivers");
  }
});

// Route to render Examiner page showing list of drivers or appointments
// Assuming you have logic to fetch drivers from the database

// app.get("/examiner",examinerMiddleware, async (req, res) => {
//   try {
//     // Fetch the drivers from the database or any other source
//     const loggedInUser = res.locals.user;

//     // Render the examiner.ejs template and pass the 'drivers' array
//     res.render("examiner", { user: loggedInUser, loggedIn: true });
//   } catch (error) {
//     console.error("Error fetching drivers:", error);
//     // Handle the error appropriately
//     res.status(500).send("Error fetching drivers");
//   }
// });

// new

// Route to handle filtering drivers by exam type
// app.get("/examiner/filter", authenticateUser, async (req, res) => {
//   const { examType } = req.query;
//   const loggedIn = true;

//   try {
//     let filteredDrivers;
//     if (examType) {
//       // Fetch users based on the examType (G or G2)
//       filteredDrivers = await User.find({ examType, userType: "Driver" });
//     } else {
//       // If no specific examType selected, fetch all drivers
//       filteredDrivers = await User.find({ userType: "Driver" });
//     }
//     res.render("examiner", { drivers: filteredDrivers, loggedIn });
//   } catch (error) {
//     console.error("Error filtering drivers:", error);
//     res.status(500).send("Error filtering drivers");
//   }
// });

// Route to handle adding comments and marking Pass/Fail
app.post("/examiner/addComment", authenticateUser, async (req, res) => {
  const { userId, comment, isPassed } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user || user.userType !== "Driver") {
      return res.status(404).send("Driver not found");
    }
    // Update user's comment and Pass/Fail status
    user.comment = comment;
    user.isPassed = isPassed ? true : false;
    user.hasTaken = true;
    if (user.isPassed) {
      if (user.examType === "G2") {
        user.examStatus = "Passed G2";
        user.examType = "Passed";
      } else if (user.examType === "G") {
        user.examStatus = "Passed G";
        user.examType = "Passed";
      }
    } else {
      if (user.examType === "G2") {
        user.examStatus = "Failed";
        user.examType = "Failed";
      } else if (user.examType === "G") {
        user.examStatus = "Passed G2";
        user.examType = "Failed";
      }
    }
    await user.save();
    res.redirect("/examiner");
  } catch (error) {
    console.error("Error adding comment/mark Pass/Fail:", error);
    res.status(500).send("Error adding comment/mark Pass/Fail");
  }
});

// Route to view details of a specific driver
app.get("/examiner/User/:id", authenticateUser, async (req, res) => {
  const userId = req.params.id;
  try {
    const driver = await User.findById(userId);
    if (!driver || User.userType !== "Driver") {
      return res.status(404).send("Driver not found");
    }
    res.render("driver_details", { driver });
  } catch (error) {
    console.error("Error fetching driver details:", error);
    res.status(500).send("Error fetching driver details");
  }
});

// Export the router for use in the main application

// Assuming you have a route to render the adminCandidates.ejs file
app.get("/passedUsers", authenticateUser, async (req, res) => {
  const loggedInUser = res.locals.user;

  try {
    // Fetch candidates with "Passed G2" or "Passed G" status
    const candidates = await User.find({
      $or: [{ examStatus: "Passed G2" }, { examStatus: "Passed G" }],
    }).select(
      "username firstName lastName originalLicenseNo comment examStatus"
    ); // Adjust fields as needed

    res.render("passedUsers", {
      candidates,
      user: loggedInUser,
      loggedIn: true,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).send("Error fetching candidates");
  }
});

app.post("/g_page", authenticateUser, async (req, res) => {
  const userId = req.session.user.id;
  const { selectedAppointment } = req.body;
  const appointments = await Appointment.find({ isTimeSlotAvailable: true });

  try {
    const appointment = await Appointment.findById(selectedAppointment);
    const loggedInUser = res.locals.user;
    const status = loggedInUser.examStatus;

    if (loggedInUser && loggedInUser.firstName) {
      const bookedAppointments = await Appointment.find({ bookedBy: userId });

      if (!appointment || !appointment.isTimeSlotAvailable) {
        return res.render("g_page", {
          user: loggedInUser,
          loggedIn: true,
          appointments: false,
          bookedAppointments,
          message: "Invalid or already booked appointment",
          backgroundClass: "appointment-error",
          status,
        });
      }
    }
    appointment.isTimeSlotAvailable = false;
    appointment.bookedBy = userId;

    await appointment.save();
    const user = await User.findById(userId);
    if (user) {
      user.examType = "G";

      user.bookedAppointments.push(appointment._id);
      await user.save();
    }
    const bookedAppointments = await Appointment.find({ bookedBy: userId });

    return res.render("g_page", {
      user: loggedInUser,
      loggedIn: true,
      appointments: false,
      bookedAppointments,
      message: "Appointment booked Successfully",
      backgroundClass: "appointment-success",
      status,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).send("Error booking appointment");
  }
});
