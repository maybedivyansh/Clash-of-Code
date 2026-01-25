import React from 'react';

const OutputPanel = ({ output, error, loading }) => {
    return (
        <div className="h-full w-full bg-transparent text-gray-300 font-mono text-xs overflow-auto p-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {loading && (
                <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span>Compiling and Executing...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-900/20 border border-red-500/20 p-3 rounded text-red-400 whitespace-pre-wrap">
                    <strong className="block mb-1 text-red-500">RUNTIME ERROR</strong>
                    {error}
                </div>
            )}

            {output && (
                <div className="space-y-3">
                    {output.map((res, i) => (
                        <div
                            key={i}
                            className={`p-3 rounded border ${res.passed
                                ? 'bg-green-900/10 border-green-500/20 text-green-400'
                                : 'bg-red-900/10 border-red-500/20 text-red-400'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">Test Case #{i + 1}</span>
                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${res.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                    }`}>
                                    {res.passed ? 'PASSED' : 'FAILED'}
                                </span>
                            </div>

                            {!res.passed && (
                                <div className="mt-2 pl-3 border-l-2 border-red-500/30 text-gray-400 space-y-1">
                                    <div>
                                        <span className="text-gray-500 uppercase text-[10px] tracking-wider">Expected:</span>
                                        <div className="text-gray-300 bg-black/30 p-1 rounded font-mono">{res.expected}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 uppercase text-[10px] tracking-wider">Actual:</span>
                                        <div className="text-red-300 bg-red-900/10 p-1 rounded font-mono">{res.actual}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {output.length === 0 && !loading && !error && (
                        <div className="text-gray-500 italic">Program executed successfully but returned no output.</div>
                    )}
                </div>
            )}

            {!loading && !error && !output && (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50">
                    <div className="text-4xl mb-2">⚡</div>
                    <div>Click RUN to execute code</div>
                </div>
            )}
        </div>
    );
};

export default OutputPanel;
