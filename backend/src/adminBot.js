/* require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose'); // Needed to talk to your DB
const BingoBord = require('./models/BingoBord'); // Adjust path to your User model

// 1. Database Connection
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// 2. Bot Setup
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_CHAT_ID; // Your ID: 2092082952

let userStates = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!userStates[chatId]) return;
    const step = userStates[chatId].step;

    if (step === "withdrawAmount") {
        const amount = parseFloat(text);
        
        if (isNaN(amount) || amount <= 0) {
            return bot.sendMessage(chatId, "⚠️ Please enter a valid amount.");
        }

        try {
            // GET REAL USER DATA FROM DB
            const user = await BingoBord.findOne({ telegramId: chatId });
            
            if (!user) {
                bot.sendMessage(chatId, "❌ User record not found.");
                delete userStates[chatId];
                return;
            }

            // 1. CALL BACKEND WITH REAL DATA
            const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/transactions/withdraw`, {
                username: user.username,     // REAL USERNAME
                phoneNumber: user.phoneNumber, // REAL PHONE
                amount,
                method: 'withdrawal', 
                type: userStates[chatId].method || 'telebirr'
            });

            // 2. PUSH ALERT TO NEW ADMIN BOT
            const adminAlert = `
🏦 **WITHDRAWAL ALERT** 🏦
━━━━━━━━━━━━━━━━━━
👤 **User:** ${user.username}
📱 **Phone:** ${user.phoneNumber}
💵 **Amount:** ${amount} Birr
🏛️ **Bank:** ${(userStates[chatId].method || 'N/A').toUpperCase()}
🕒 **Time:** ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━`;

            // This sends the message to your new bot (2092082952)
            await adminBot.sendMessage(ADMIN_ID, adminAlert, { parse_mode: 'Markdown' })
                .catch(e => console.error("Admin bot error:", e.message));

            // 3. SUCCESS MESSAGE TO USER
            bot.sendMessage(chatId, res.data.message || "✅ Request submitted!");

        } catch (err) {
            console.error("Error:", err.response?.data || err.message);
            bot.sendMessage(chatId, "❌ Withdrawal failed. Please check your balance.");
        }
        
        delete userStates[chatId];
        return;
    }
});

console.log("🚀 Bot is running and ready for withdrawals..."); */