'use client';

import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, setCode, language = 'python', readOnly = false }) => {
    return (
        <div className="h-full w-full rounded-md overflow-hidden border border-gray-700">
            <Editor
                height="100%"
                defaultLanguage={language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value)}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </div>
    );
};

export default CodeEditor;
