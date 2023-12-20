// appointment.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  isTimeSlotAvailable: {
    type: Boolean,
    default: true,
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});
async function checkIfAppointmentBooked(userId) {
  // Assuming userId is available in the session or request object
  const userAppointments = await Appointment.find({ userId }); // Replace userId with your user identifier

  return userAppointments.length > 0;
}

module.exports = checkIfAppointmentBooked;
const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
