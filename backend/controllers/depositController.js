const depositCheck = async (req, res) => {
    try {
        const { user } = req.body;
        const userWallet = req.user.Wallet;  // Access the user object attached by middleware
        const walletBalance = parseInt(userWallet); // Convert wallet to integer
        
        console.log("User balance:", walletBalance);
        return res.json({ balance: walletBalance });
    } catch (error) {
        console.error("Error in depositCheck:", error);
        return res.status(500).json({ message: "Error checking deposit" });
    }
};

module.exports = { depositCheck };
