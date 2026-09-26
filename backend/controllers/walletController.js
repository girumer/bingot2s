const BingoBord = require('../Models/BingoBord');

exports.deductWallet = async (username, amount) => {
  const user = await BingoBord.findOne({ username });
  if (!user) throw new Error('User not found');
  if (user.Wallet < amount) throw new Error('Insufficient balance');

  user.Wallet -= amount;
  await user.save();

  return user.Wallet;
};
