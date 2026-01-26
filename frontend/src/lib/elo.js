/**
 * Calculate change in rating based on match duration.
 * 15 min: +15 / -10
 * 30 min: +30 / -20
 * 45 min: +50 / -30
 */
export function getRatingChange(duration, isWinner) {
    // Deterministic fixed values for consistency between frontend/backend
    let val = 15;

    switch (parseInt(duration)) {
        case 15:
            val = 20;
            break;
        case 30:
            val = 30;
            break;
        case 45:
            val = 40;
            break;
        default:
            val = 20;
    }

    return isWinner ? val : -val;
}
