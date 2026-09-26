const BingoBord = require('../Models/BingoBord');
const Transaction = require("../Models/Transaction");

const Depoc=require('../Models/DepositSchema');
 
// Utility function to parse Telebirr messages
// Corrected parseTelebirrMessage function
function parseTelebirrMessage(message) {
    const transactions = [];
    
    // ✅ Removed the lowerCaseMessage line. We will work with the original message.

    // Regex to find the amount. This works.
    const amountMatches = [...message.matchAll(/ETB\s*([\d,.]+(?:\.\d{2})?)/gi)];

    // FIX: This regex is now applied to the original message.
    // It looks for "transaction number" or "transaction no"
    // and the pattern now includes both lowercase and uppercase letters ([a-zA-Z0-9]+).
    const transMatches = [...message.matchAll(/(?:transaction number is|transaction no is|የሂሳብ እንቅስቃሴ ቁጥርዎ)\s*([a-zA-Z0-9]+)/gi)];

    for (let i = 0; i < Math.min(amountMatches.length, transMatches.length); i++) {
        const amount = parseFloat(amountMatches[i][1].replace(/,/g, ""));
        
        // This will now get the correct case from the original message.
        const transactionNumber = transMatches[i][1].trim(); 

        transactions.push({ 
            type: "telebirr", 
            amount, 
            transactionNumber, 
            phoneNumber: undefined,
        });
    }

    return transactions;
}

function roundTwo(num) {
    return Math.round(num * 100) / 100;
}



// Utility function to parse CBE messages (you can expand if needed)
// utils/messageParsers.js



// In your utils/messageParsers.js file
// In your utils/messageParsers.js file or where the function is located
/* function parseCBEMessages(message) {
    const transactions = [];
    
    // ✅ Removed the lowerCaseMessage line. We will work with the original message.

    // Regex to find the amount and currency.
    const amountMatches = [...message.matchAll(/([\d,]+\.\d+)\s*(?:br\.|ብር)/gi)];

    // ✅ FIX: This regex is now applied to the original message.
    // The pattern already correctly handles both upper and lowercase ([a-zA-Z0-9]+).
    const transMatches = [...message.matchAll(/(?:በደረሰኝ ቁ[ጠጥ]?ር|txn id|by receipt number|Txn ID)\s*([a-zA-Z0-9]+)/gi)];

    for (let i = 0; i < Math.min(amountMatches.length, transMatches.length); i++) {
        const amount = parseFloat(amountMatches[i][1].replace(/,/g, ""));
        
        // This will now get the correct case from the original message.
        const transactionNumber = transMatches[i][1].trim(); 
        
        transactions.push({ 
            type: "cbebirr", 
            amount, 
            transactionNumber, 
            phoneNumber: undefined, 
        });
    }

    return transactions;
} */
function parseCBEMessages(message) {
    const transactions = [];

    // FIX 1: Broader regex for Amount (looks for ETB, Birr, Br, or a number followed by Br.)
    // It captures: 1) The amount value (e.g., 50.00). 
    const amountRegex = /([\d,]+\.\d+)\s*(?:ETB|Birr|Br|ብር)/gi;
    const amountMatches = [...message.matchAll(amountRegex)];

    // FIX 2: Highly reliable regex for CBE Txn ID. 
    // It looks for "txn id" or the Amharic equivalent, followed by the ID.
    // The ID itself is often a mix of letters and numbers (e.g., CJ75VJRYCR)
    const transMatches = [...message.matchAll(/(?:txn id|Txn ID|በደረሰኝ ቁ[ጠጥ]?ር)\s*([a-zA-Z0-9]+)/gi)];

    // Only proceed if both an amount and a transaction ID are found.
    if (amountMatches.length > 0 && transMatches.length > 0) {
        // Use the FIRST amount matched
        const amount = parseFloat(amountMatches[0][1].replace(/,/g, "")); 
        
        // Use the FIRST transaction number matched
        const transactionNumber = transMatches[0][1].trim(); 
        
        transactions.push({ 
            type: "cbebirr", 
            amount, 
            transactionNumber, 
            phoneNumber: undefined, 
        });
    }

    return transactions;
}
// Ensure these parser functions are defined or imported at the top of your file
// function parseTelebirrMessage(message) { ... }
// function parseCBEMessages(message) { ... }

// Ensure these parser functions are defined or imported at the top of your file
// function parseTelebirrMessage(message) { ... }
// function parseCBEMessages(message) { ... }

/* exports.parseTransaction = async (req, res) => {
    try {
        console.log('Received request body:', req.body);
      const { key: originalMessage } = req.body;
        
        
        if (!originalMessage) {
            return res.status(400).json({ error: "Message is required" });
        }
             let message = originalMessage
            .replace(/[\u200B-\u200F\uFEFF\u2028\u2029\u00A0\t\r\n]+/g, ' ')
            .trim();
            
        
        
        let transactions = [];
       
        const telebirrRegex = /telebirr/i; // New regex for case-insensitive check

        const cbebirrRegex = /(?:በደረሰኝ ቁ[ጠጥ]?ር|txn id|by receipt number|Txn ID)\s*([a-zA-Z0-9]+)/i;
        
        if (message.match(cbebirrRegex)) {
            transactions = parseCBEMessages(message);
        } else if (message.match(telebirrRegex)) { // Check against the original message
            transactions = parseTelebirrMessage(message);
        } else {
            return res.status(400).json({ error: "Unsupported transaction type" });
        }

        if (transactions.length === 0) {
            return res.status(400).json({ error: "No transaction found in message" });
        }
        
        const transactionToSave = transactions[0];

        const existingTransaction = await Transaction.findOne({ transactionNumber: transactionToSave.transactionNumber });
        if (existingTransaction) {
            console.log(`Transaction ${transactionToSave.transactionNumber} already exists. Skipping.`);
            return res.status(409).json({ error: "Transaction already exists." });
        }

        const newTransaction = new Transaction({
            amount: transactionToSave.amount,
            transactionNumber: transactionToSave.transactionNumber,
            method: "depositpend",
            type: transactionToSave.type
        });
        
        await newTransaction.save();
        
        console.log("Transaction saved as pending:", newTransaction.transactionNumber);
        
        return res.status(200).json({
            message: "Transaction received and saved as pending. Please confirm your deposit.",
            transactionNumber: newTransaction.transactionNumber,
        });

    } catch (err) {
        if (err.code === 11000) {
            console.log(`Duplicate transaction encountered: ${err.message}`);
            return res.status(409).json({ error: "Transaction already exists." });
        }
        console.error("Server error:", err);
        return res.status(500).json({ error: "Server error" });
    }
}; */
exports.parseTransaction = async (req, res) => {
     const secret = req.query.secret;
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        console.error('❌ Unauthorized attempt (invalid secret)');
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        console.log('Received request body:', req.body);
        const { key: originalMessage } = req.body;
        console.log(originalMessage);
        if (!originalMessage) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        let message = originalMessage
            .replace(/[\u200B-\u200F\uFEFF\u2028\u2029\u00A0\t\r\n]+/g, ' ')
            .trim();
        
        console.log('Cleaned message:', message);
        
        let transactions = [];
       
        // Check for CBE first (since that's what you're testing)
        const cbebirrRegex = /(?:በደረሰኝ ቁ[ጠጥ]?ር|txn id|Txn ID)/i;
      const telebirrRegex = /(telebirr|ኢትዮ ቴሌኮም)/i;
        
        if (message.match(cbebirrRegex)) {
            console.log('Detected CBE transaction');
            transactions = parseCBEMessages(message);
        } else if (message.match(telebirrRegex)) {
            console.log('Detected Telebirr transaction');
            transactions = parseTelebirrMessage(message);
        } else {
            console.log('No supported transaction type detected');
            return res.status(400).json({ error: "Unsupported transaction type" });
        }

        console.log('Parsed transactions:', transactions);

        if (transactions.length === 0) {
            return res.status(400).json({ 
                error: "No transaction found in message. Please check the format." 
            });
        }
        
        const transactionToSave = transactions[0];

        const existingTransaction = await Transaction.findOne({ 
            transactionNumber: transactionToSave.transactionNumber 
        });
        
        if (existingTransaction) {
            console.log(`Transaction ${transactionToSave.transactionNumber} already exists. Skipping.`);
            return res.status(409).json({ error: "Transaction already exists." });
        }

        const newTransaction = new Transaction({
            amount: transactionToSave.amount,
            transactionNumber: transactionToSave.transactionNumber,
            method: "depositpend",
            type: transactionToSave.type
        });
        
        await newTransaction.save();
        
        console.log("Transaction saved as pending:", newTransaction.transactionNumber);
        
        return res.status(200).json({
            message: "Transaction received and saved as pending. Please confirm your deposit.",
            transactionNumber: newTransaction.transactionNumber,
        });

    } catch (err) {
        if (err.code === 11000) {
            console.log(`Duplicate transaction encountered: ${err.message}`);
            return res.status(409).json({ error: "Transaction already exists." });
        }
        console.error("Server error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
// Add this constant at the top of your file for easy modification
 // 10% bonus
// Add this constant at the top of your file for easy modification
/* const extractTransactionDetails = (message) => {
    let transactionNumber, amount, type;

    // ----- Telebirr Regex (Simplified) -----
    // Matches messages with 'ETB' and a transaction number, regardless of received/transferred.
    const telebirrAmRegex = /sent([\d,]+\.\d+)\s*ብር.*የሂሳብ እንቅስቃሴ ቁጥርዎ\s*([a-zA-Z0-9]+)\s*ነዉ/i;
    const telebirrAmMatch = message.match(telebirrAmRegex);
    if (telebirrAmMatch) {
        amount = parseFloat(telebirrAmMatch[1]);
        transactionNumber = telebirrAmMatch[2];
        type = "telebirr";
        return { transactionNumber, amount, type };
    }
    const telebirrRegex = /ETB\s*([\d\.]+).*Your transaction number is\s*([A-Z0-9]+)\./i;
    const telebirrMatch = message.match(telebirrRegex);
    if (telebirrMatch) {
        amount = parseFloat(telebirrMatch[1]);
        transactionNumber = telebirrMatch[2];
        type = "telebirr"; 
        return { transactionNumber, amount, type };
    }

    // ----- CBE Birr Regex (English - Unchanged) -----
    const cbebirrEnRegex = /credited with\s*([\d\.]+)\s*Br\..*Txn ID\s*([A-Z0-9]+)\./i;
    const cbebirrEnMatch = message.match(cbebirrEnRegex);
    if (cbebirrEnMatch) {
        amount = parseFloat(cbebirrEnMatch[1]);
        transactionNumber = cbebirrEnMatch[2];
        type = "cbebirr";
        return { transactionNumber, amount, type };
    }

    // ----- CBE Birr Regex (Amharic - Unchanged) -----
 const cbebirrAmRegex = /([\d\.]+)\s*Br\..*?በደረሰኝ ቁ[ጠጥ]ር\s*([A-Z0-9]+)/i;
    const cbebirrAmMatch = message.match(cbebirrAmRegex);
    if (cbebirrAmMatch) {
        amount = parseFloat(cbebirrAmMatch[1]);
        transactionNumber = cbebirrAmMatch[2];
        type = "cbebirr";
        return { transactionNumber, amount, type };
    }

    return { transactionNumber: null, amount: null, type: null };
}; */
const extractTransactionDetails = (message) => {
    let transactionNumber, amount, type;

    // --- Telebirr Regex (Amharic - Corrected) ---
    // Note: Added \s* before 'sent' for safety, though the message structure might vary.
    // This is for Telebirr deposit notifications in Amharic.
    const telebirrAmRegex = /([\d,]+\.\d+)\s*ብር.*?የሂሳብ እንቅስቃሴ ቁጥርዎ\s*([a-zA-Z0-9]+)/i;
    const telebirrAmMatch = message.match(telebirrAmRegex);
    if (telebirrAmMatch) {
        amount = parseFloat(telebirrAmMatch[1].replace(/,/g, '')); // Handle comma separators
        transactionNumber = telebirrAmMatch[2];
        type = "telebirr";
        return { transactionNumber, amount, type };
    }
    
    // --- Telebirr Regex (English) ---
    const telebirrRegex = /ETB\s*([\d\.]+).*Your transaction number is\s*([A-Z0-9]+)\./i;
    const telebirrMatch = message.match(telebirrRegex);
    if (telebirrMatch) {
        amount = parseFloat(telebirrMatch[1]);
        transactionNumber = telebirrMatch[2];
        type = "telebirr"; 
        return { transactionNumber, amount, type };
    }

    // --- CBE Birr Regex (English - Deposit/Credited) ---
    // Handles messages where the account is credited (money received).
    const cbebirrEnRegex = /credited with\s*([\d\.]+)\s*Br\..*Txn ID\s*([A-Z0-9]+)/i;
    const cbebirrEnMatch = message.match(cbebirrEnRegex);
    if (cbebirrEnMatch) {
        amount = parseFloat(cbebirrEnMatch[1]);
        transactionNumber = cbebirrEnMatch[2];
        type = "cbebirr";
        return { transactionNumber, amount, type };
    }

    // --- NEW & CRITICAL: CBE Birr Regex for "Money Sent" Message ---
    // This is the format you confirmed: "Dear MUSTEFA, you have sent 10.00Br..."
    const cbebirrSentRegex = /sent\s*([\d\.]+)\s*Br\..*Txn ID\s*([A-Z0-9]+)/i;
    const cbebirrSentMatch = message.match(cbebirrSentRegex);
    
    if (cbebirrSentMatch) {
        amount = parseFloat(cbebirrSentMatch[1]);
        transactionNumber = cbebirrSentMatch[2];
        type = "cbebirr";
        return { transactionNumber, amount, type };
    }

    // --- CBE Birr Regex (Amharic) ---
    const cbebirrAmRegex = /([\d\.]+)\s*Br\..*?በደረሰኝ ቁ[ጠጥ]ር\s*([A-Z0-9]+)/i;
    const cbebirrAmMatch = message.match(cbebirrAmRegex);
    if (cbebirrAmMatch) {
        amount = parseFloat(cbebirrAmMatch[1]);
        transactionNumber = cbebirrAmMatch[2];
        type = "cbebirr";
        return { transactionNumber, amount, type };
    }

    // Fallback if no pattern matches
    return { transactionNumber: null, amount: null, type: null };
};

// ... Your existing dependencies and schema ...

exports.depositAmount = async (req, res) => {
    try {
        let { transactionNumber, amount, type, phoneNumber } = req.body;
        
        let finalTxnNumber = transactionNumber ? transactionNumber.trim() : null;
        let finalAmount = parseFloat(amount);
        let finalType = type ? type.toLowerCase() : null;

        // Step 1: Handle if the user provides a full message string.
        if (finalTxnNumber && finalTxnNumber.includes(' ')) {
            const extractedDetails = extractTransactionDetails(finalTxnNumber);
            
            if (extractedDetails.transactionNumber && !isNaN(extractedDetails.amount) && extractedDetails.type) {
                finalTxnNumber = extractedDetails.transactionNumber;
                finalAmount = extractedDetails.amount;
                finalType = extractedDetails.type;
            } else {
                return res.status(400).json({ error: "Could not extract transaction details from the message. Please ensure the message contains a valid amount and transaction number." });
            }
        }

        // Step 2: Validate the required fields.
        if (!finalTxnNumber || !phoneNumber || isNaN(finalAmount) || finalAmount <= 0 || !finalType) {
            return res.status(400).json({ error: "Invalid or missing parameters. Please provide the transaction ID, amount, and type." });
        }

        // Step 3: Find the user.
        const user = await BingoBord.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).json({ error: "User not found. Please register or provide a valid phone number." });
        }
       /*   const BONUS_PERCENTAGE = 0.10; 
        const bonusAmount = finalAmount * BONUS_PERCENTAGE;
      
        const totalCreditedAmount = finalAmount + bonusAmount;  */
        const BONUS_PERCENTAGE = 0.10; // 10%
         let bonusAmount = 0;

        if (finalAmount < 301) {
         bonusAmount = roundTwo(finalAmount * BONUS_PERCENTAGE);
             }

const totalCreditedAmount = roundTwo(finalAmount + bonusAmount);



        // Step 4: Find the PENDING transaction using the provided transactionNumber.
        // This is where the core security check happens. It ensures a pending deposit exists for this transaction ID.
        const updatedTx = await Transaction.findOne({
            transactionNumber: finalTxnNumber,
            method: "depositpend",
            amount: finalAmount, // Verify the amount to prevent fraud
            type: finalType      // Verify the type to prevent fraud
        });
        
        if (!updatedTx) {
            return res.status(400).json({ error: "Invalid, already-claimed, or mismatching transaction details. Please check your inputs and try again." });
        }

        // The rest of the code is secure because it's based on a pending transaction created by your admin.

        // Step 5: Process the transaction and handle referral bonus.
       user.Wallet = roundTwo(user.Wallet + totalCreditedAmount);

         const newTransaction = new Transaction({
           
            phoneNumber,
            amount: finalAmount,
            type: finalType,
            method: 'deposit', // <-- This is the key change!
             transactionNumber,
            status: 'completed',
        });
        await newTransaction.save();
        if (user.referredBy ) {
            const referer = await BingoBord.findOne({ telegramId: user.referredBy });
            if (referer) {
                const bonusAmount = finalAmount * 0;
                referer.Wallet += bonusAmount;
                await referer.save();
                user.referralBonusPaid = true;
                console.log(`Referral bonus of ${bonusAmount} ETB paid to user ${referer.telegramId}`);
            }
        }
        
        await user.save();
        await Transaction.deleteOne({ transactionNumber: finalTxnNumber });
        
        console.log(`User wallet updated. New balance: ${user.Wallet}`);
        
        res.json({
            message: `Deposit of ${finalAmount} ETB confirmed successfully! Your new wallet balance is ${user.Wallet}.`,
            wallet: user.Wallet,
        });

    } catch (err) {
        console.error("Deposit confirmation error:", err);
        res.status(500).json({ error: "An unexpected error occurred. Please check your inputs and try again." });
    }
};

// Get all pending transactions
exports.getPendingTransactions = async (req, res) => {
  try {
    // You can add filters if needed, e.g., by type or date
    const transactions = await Transaction.find({});
    res.json({ success: true, transactions });
    console.log("transaction append sucessfuly");
  } catch (err) {
    console.error("Error fetching pending transactions:", err);
    res.status(500).json({ error: "Server error" });
  }
};
