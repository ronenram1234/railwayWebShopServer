const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Login = require("../models/Login");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");
const { recordLoginFailures, checkFailures } = require("../utils/loginTable");
const mongoose = require("mongoose");

// register
const registerSchema = Joi.object({
  name: Joi.object({
    first: Joi.string().required().min(2),
    middle: Joi.string().allow("").optional(),
    last: Joi.string().required().min(2),
  }).required(),

  phone: Joi.string()
    .pattern(/^[0-9]{9,10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be 9-10 digits",
      "string.empty": "Phone number is required",
    }),

  email: Joi.string().email().required(),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one letter and one number",
      "string.min": "Password must be at least 8 characters long",
    }),

  address: Joi.object({
    state: Joi.string().allow("").optional(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    street: Joi.string().required(),
    houseNumber: Joi.number().required(),
    zip: Joi.number().required(),
  }).required(),

  isAdmin: Joi.boolean().default(false),
}).options({ stripUnknown: true });

router.post("/", async (req, res) => {
  try {
    // check input validation
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    // check if user already exist
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send("User already exists");

    // create User
    user = new User(req.body);

    // generate salt for hash method
    const salt = await bcrypt.genSalt(10);

    // create the encrypted password
    user.password = await bcrypt.hash(req.body.password, salt);

    const newUser = await user.save();
    return res.status(200).send(newUser);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// login
const loginSchema = Joi.object({
  email: Joi.string().required().min(2).email(),
  password: Joi.string().required().min(8),
});

router.post("/login", async (req, res) => {
  try {
    // 1. body validation
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // 2. check if user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("Email or password are incorrect");

    const count = await Login.countDocuments({
      user_id: user._id,
    });

    // Bonus 3 handle 3 failures more in the last 24 hours
    if (count === 3) {
      try {
        await checkFailures(user._id);
      } catch (error) {
        return res.status(400).send(error.message);
      }
    }

    // 3. compare the password
    const result = await bcrypt.compare(req.body.password, user.password);
    if (!result) {
      recordLoginFailures(user._id);
      return res.status(400).send("Email or password are incorrect");
    }

    // 4. create token
    const token = jwt.sign(
      {
        _id: user._id,
        isAdmin: user.isAdmin,
        iat: Math.floor(Date.now() / 1000), // Add creation timestamp
      },
      process.env.JWTKEY
    );
    if (!token) {
      throw new Error("Token generation failed");
    }
    res.status(200).send(token);
  } catch (error) {
    res.status(400).send(error);
  }
});

// get all users
router.get("/", auth, async (req, res) => {
  try {
    let user;
    try {
      user = await User.findById(req.payload._id);
    } catch (err) {
      return res.status(400).send("User id issue");
    }

    if (!user) return res.status(404).send("No such user");

    if (!user.isAdmin) return res.status(400).send("User is not Admin");
    const allUsers = await User.find().select("-password");

    return res.status(200).send(allUsers);
  } catch (err) {
    res.status(400).send(`Invalide request - ${err.message}`);
  }
});

// any register user ask for retrieve use by user_id
router.get("/:id", async (req, res) => {
  try {
    let reqUser;
    try {
      reqUser = await User.findById(req.params.id).select("-password");
    } catch (err) {
      return res.status(400).send("User params id issue");
    }

    if (!reqUser) return res.status(404).send("No such user");

    return res.status(200).send(reqUser);
  } catch (err) {
    res.status(400).send(`Invalide request - ${err.message}`);
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    let reqUser;
    try {
      reqUser = await User.findById(req.params.id).select("-password");
      if (!reqUser) {
        return res.status(404).send("User doesn't exist");
      }
    } catch (err) {
      return res.status(400).send("User params id issue");
    }

    // Only allow users to delete their own account
    if (req.payload._id !== req.params.id) {
      return res
        .status(403)
        .send("Unauthorized request - users can only delete their own account");
    }

    const user = await User.findByIdAndDelete(req.params.id, {
      new: true,
    });

    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Upload users from Excel
router.post("/upload", auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.payload._id);
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .send("Access denied. Only admins can upload users data.");
    }

    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res
        .status(400)
        .send("Invalid data format. Expected array of users.");
    }

    if (users.length === 0) {
      return res.status(400).send("Excel file contains no users.");
    }

    // Modified schema for bulk upload - with less strict password validation
    const bulkUploadSchema = Joi.object({
      name: Joi.object({
        first: Joi.string().required().min(2),
        middle: Joi.string().allow("").optional(),
        last: Joi.string().required().min(2),
      }).required(),

      phone: Joi.string()
        .pattern(/^[0-9]{9,10}$/)
        .required()
        .messages({
          "string.pattern.base": "Phone number must be 9-10 digits",
          "string.empty": "Phone number is required",
        }),

      email: Joi.string().email().required(),

      password: Joi.string().min(8).required(), // Only require minimum length for temp password

      image: Joi.object({
        url: Joi.string().allow("").optional(),
        alt: Joi.string().allow("").optional(),
      }).optional(),

      address: Joi.object({
        state: Joi.string().allow("").optional(),
        country: Joi.string().required(),
        city: Joi.string().required(),
        street: Joi.string().required(),
        houseNumber: Joi.number().required(),
        zip: Joi.number().required(),
      }).required(),

      isAdmin: Joi.boolean().default(false),
      isRegisterUser: Joi.boolean().default(false),
    }).options({ stripUnknown: true });

    // Validate each user object
    const validUsers = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const { error, value } = bulkUploadSchema.validate(userData);

      if (error) {
        errors.push(`Row ${i + 1}: ${error.details[0].message}`);
      } else {
        validUsers.push(value);
      }
    }

    if (errors.length > 0) {
      return res.status(400).send(`Invalid user data:\n${errors.join("\n")}`);
    }

    // Start a session for atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete all users (including current admin)
      const deleteResult = await User.deleteMany({}, { session });

      console.log(`Deleted ${deleteResult.deletedCount} existing users`);

      // Insert all new users
      const operations = validUsers.map((userData) => ({
        insertOne: {
          document: {
            ...userData,
            password: bcrypt.hashSync(userData.password, 10),
            createdAt: new Date(),
          },
        },
      }));

      // Perform bulk write operation
      const bulkResult = await User.bulkWrite(operations, {
        session,
        ordered: true, // Use ordered insertion for safety
      });

      console.log(`Inserted ${bulkResult.insertedCount} users`);

      // Verify final count
      const finalCount = await User.countDocuments({}, { session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).send({
        message: "Users data uploaded successfully",
        stats: {
          deletedCount: deleteResult.deletedCount,
          insertedCount: bulkResult.insertedCount,
          totalUsers: finalCount,
        },
      });
    } catch (error) {
      // If anything fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (err) {
    console.error("Upload users error:", err);
    res.status(400).send(`Failed to upload users: ${err.message}`);
  }
});

// Update user details
router.put("/:id", auth, async (req, res) => {
  try {
    // Check if user exists
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    // Only admins can update other users
    const requestingUser = await User.findById(req.payload._id);
    if (!requestingUser.isAdmin && req.payload._id !== req.params.id) {
      return res
        .status(403)
        .send("Access denied. Only admins can update other users.");
    }

    // Validate update data
    const updateSchema = Joi.object({
      name: Joi.object({
        first: Joi.string().min(2),
        middle: Joi.string().allow(""),
        last: Joi.string().min(2),
      }),
      phone: Joi.string().pattern(/^[0-9]{9,10}$/),
      address: Joi.object({
        state: Joi.string().allow(""),
        country: Joi.string(),
        city: Joi.string(),
        street: Joi.string(),
        houseNumber: Joi.number(),
        zip: Joi.number(),
      }),
      isAdmin: Joi.boolean(),
    }).options({ stripUnknown: true });

    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Block attempts to update protected fields
    const protectedFields = ["email", "createdAt"];
    const attemptedProtectedUpdates = protectedFields.filter(
      (field) => req.body[field] !== undefined
    );

    if (attemptedProtectedUpdates.length > 0) {
      return res
        .status(400)
        .send(
          `Updates to the following fields are not allowed: ${attemptedProtectedUpdates.join(
            ", "
          )}`
        );
    }

    // Update user
    const updateData = value;

    // If updating nested objects, merge with existing data
    if (updateData.name) {
      updateData.name = { ...user.name, ...updateData.name };
    }
    if (updateData.address) {
      updateData.address = { ...user.address, ...updateData.address };
    }

    user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

module.exports = router;
