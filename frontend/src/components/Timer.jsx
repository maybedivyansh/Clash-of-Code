'use client';

import React, { useEffect, useState } from 'react';

const Timer = ({ endTime, onEnd }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const updateTimer = () => {
            const remaining = Math.max(0, endTime - Date.now());
            setTimeLeft(remaining);

            if (remaining <= 0) {
                if (onEnd) onEnd();
            }
        };

        updateTimer(); // Initial call
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTime, onEnd]);

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="text-2xl font-mono font-bold text-white bg-gray-800 px-4 py-2 rounded-lg border border-gray-600">
            {formatTime(timeLeft)}
        </div>
    );
};

export default Timer;
