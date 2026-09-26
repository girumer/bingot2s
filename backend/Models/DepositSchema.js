const mongoose = require("mongoose");

const DepositSchema = new mongoose.Schema({
  // The _id field will be the name of the counter, e.g., "withdrawalId"
  _id: { type: String, required: true }, 
  // The sequential number for the counter
  seq: { type: Number, default: 0 } 
});

module.exports = mongoose.model("Depoc", DepositSchema);
