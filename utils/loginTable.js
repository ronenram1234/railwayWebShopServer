const Login = require("../models/Login");

const recordLoginFailures = async (id) => {
  try {
    login = new Login({ user_id: id });
    const newlogin = await login.save();
  } catch (error) {
    console.error("Error saving login failure:", error.message);
    throw error;
  }
};

const checkFailures = async (id) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const logins = await Login.find({ user_id: id }).sort({ createdAt: 1 });

  const oldestCreatedAt = new Date(logins[0].createdAt);

  if (oldestCreatedAt >= twentyFourHoursAgo) {
    console.error("Three login trials within 24 hours - please wait 24 hours");
    throw new Error("Too many login attempts. Please wait 24 hours.");
  }
  return null
};

module.exports = { recordLoginFailures, checkFailures };
