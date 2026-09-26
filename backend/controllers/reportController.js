const reportController = async (req, res) => {
    const player = req.player; // The player data is already attached by the middleware
    const gameHistory = player.gameHistory || []; // Get the player's game history
  
    if (!gameHistory || gameHistory.length === 0) {
      return res.status(404).json({ message: 'No game history found for this player' });
    }
  
    try {
      // Get today's date
      const currentDate = new Date();
      
      // Get the start of the current day
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  
      // Date intervals for weekly and monthly reports
      const sevenDaysAgo = new Date(new Date().setDate(currentDate.getDate() - 7));
      const oneMonthAgo = new Date(new Date().setMonth(currentDate.getMonth() - 1));
  
      // Filter game history for daily, weekly, and monthly reports
      const dailyReport = gameHistory.filter(game => {
        const gameDate = new Date(game.timestamp);
        return gameDate >= todayStart && gameDate <= currentDate; // Filter games from today
      });
  
      const weeklyReport = gameHistory.filter(game => {
        const gameDate = new Date(game.timestamp);
        return gameDate >= sevenDaysAgo && gameDate <= currentDate; // Filter games from the last 7 days
      });
  
      const monthlyReport = gameHistory.filter(game => {
        const gameDate = new Date(game.timestamp);
        return gameDate >= oneMonthAgo && gameDate <= currentDate; // Filter games from the last month
      });
  
      // Helper function to calculate total profit and games, including period
      const calculateReportData = (reportData, startDate, endDate, period) => {
        const totalProfit = reportData.reduce((sum, game) => sum + game.profit, 0);
        const totalGames = reportData.length;
        return { totalProfit, totalGames, startDate, endDate, period };
      };
  
      // Calculate daily, weekly, and monthly reports
      const dailyStats = calculateReportData(dailyReport, todayStart, currentDate, 'daily');
      const weeklyStats = calculateReportData(weeklyReport, sevenDaysAgo, currentDate, 'weekly');
      const monthlyStats = calculateReportData(monthlyReport, oneMonthAgo, currentDate, 'monthly');
  
      // Format response with report data
      res.json({
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
      });
  
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  module.exports = reportController;
  