import React from 'react';

const HealthBar = ({ health, maxHealth = 100, label, color = 'blue' }) => {
    const percentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));

    // Gradients
    const blueGradient = 'bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-300';
    const redGradient = 'bg-gradient-to-r from-red-600 via-orange-500 to-red-300';

    // Shadows
    const blueShadow = 'shadow-[0_0_15px_rgba(34,211,238,0.5)]';
    const redShadow = 'shadow-[0_0_15px_rgba(239,68,68,0.5)]';

    const bgClass = color === 'blue' ? blueGradient : redGradient;
    const shadowClass = color === 'blue' ? blueShadow : redShadow;

    return (
        <div className="w-full">
            <div className="flex justify-between mb-2 items-end">
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{label}</span>
                <span className={`text-lg font-bold font-mono ${color === 'blue' ? 'text-cyan-400' : 'text-red-500'}`}>
                    {Math.round(percentage)}%
                </span>
            </div>

            {/* Bar Container */}
            <div className="w-full bg-gray-900/50 rounded-sm h-3 border border-gray-700/50 p-[2px] relative overflow-hidden">
                {/* Background Striping */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.8)_2px)] bg-[size:4px_100%] pointer-events-none z-10 opacity-30"></div>

                {/* The Bar */}
                <div
                    className={`${bgClass} h-full rounded-sm transition-all duration-300 ease-out relative ${percentage > 20 ? shadowClass : ''}`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

export default HealthBar;
