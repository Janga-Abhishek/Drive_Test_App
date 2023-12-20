// Import or require the User model at the beginning of the file
const User = require("../models/User"); // Replace the path based on your project structure

// Middleware for Admin authentication
const authAdminMiddleware = async (req, res, next) => {
  try {
    // Logic to authenticate user (assuming user ID is present in the session)
    const userId = req.session.user?.id; // Assuming session contains user ID

    if (userId) {
      // Find the user from the database using the User model
      const user = await User.findById(userId);

      if (user && user.userType === "Admin") {
        // Set the authenticated user for admin
        res.locals.user = user;
      } else {
        // Handle non-admin or unauthenticated user
        res.locals.user = null; // or any other default value
      }
    } else {
      // Handle unauthenticated user (no user ID in session)
      res.locals.user = null; // or any other default value
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
};

module.exports = { authAdminMiddleware };
