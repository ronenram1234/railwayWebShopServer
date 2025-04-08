const { Schema, model } = require("mongoose");
const customerSchema = new Schema({
  name: { type: String, required: true },
 
  email: { type: String, required: true, unique: true },
  
  message: { type: String, required: true },
  
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const CustomerRequest = model("customerrequests", customerSchema);
module.exports = CustomerRequest;
