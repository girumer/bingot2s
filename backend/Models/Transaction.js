const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema({
 transactionNumber: { type: String, required: true, unique: true },
 withdrawalId: { type: Number, unique: true, sparse: true },
 depositId: { type: Number, unique: true, sparse: true },
 phoneNumber: { type: String, required: true, default: "UNKNOWN" },
  // ADD "referral_bonus" to the enum list
 method: { type: String, enum: ["deposit", "withdrawal", "depositpend", "referral_bonus"], required: true },
 amount: { type: Number, required: true },
  // ADD "bonus" to the enum list
 type: { type: String, enum: ["telebirr", "cbebirr", "bonus"], required: true },
 rawMessage: { type: String },
 status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
 createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);