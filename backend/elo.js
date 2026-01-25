/**
 * Calculate change in rating based on match duration.
 * 15 min: +15 / -10
 * 30 min: +30 / -20
 * 45 min: +50 / -30
 */
function getRatingChange(duration, isWinner) {
    let min = 10;
    let max = 15;

    switch (parseInt(duration)) {
        case 15:
            min = 10;
            max = 15;
            break;
        case 30:
            min = 20;
            max = 30;
            break;
        case 45:
            min = 30;
            max = 40;
            break;
        default:
            min = 10;
            max = 15;
    }

    // Random value between min and max (inclusive)
    const val = Math.floor(Math.random() * (max - min + 1)) + min;

    return isWinner ? val : -val;
}

module.exports = { getRatingChange };
