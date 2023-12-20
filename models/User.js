const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  userType: { type: String, enum: ["Driver", "Examiner", "Admin"] },

  firstName: String,
  lastName: String,
  licenseNo: String,
  originalLicenseNo: String,
  age: Number,
  car_details: {
    make: String,
    model: String,
    year: Number,
    platno: String,
  },
  bookedAppointments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
  ],
  examType: String,
  examStatus: String,
  isPassed: {
    type: Boolean,
    default: false,
    required: true,
  },
  hasTaken: {
    type: Boolean,
    default: false,
    required: true,
  },
  comment: {
    type: String,
    default: "",
  },
});

// Hash the password before saving
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
