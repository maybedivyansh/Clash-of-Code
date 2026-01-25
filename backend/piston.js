const axios = require('axios');

// Piston public API or local runner URL
const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

async function executeCode(sourceCode, testCases) {
    // testCases is expected to be an array of { input: "...", expected: "..." }

    const results = [];
    let allPassed = true;

    // We loop through test cases. 
    // In a real optimized scenario, we might batch this or run a custom runner script.
    // For MVP, we iterate.

    // For MVP, we iterate.
    console.log("[PISTON DEBUG] Received testCases:", JSON.stringify(testCases, null, 2));

    if (!Array.isArray(testCases)) {
        console.error("[PISTON ERROR] testCases is not an array:", typeof testCases);
        // If it's a string, we might need to parse it (fallback if DB is messy)
        // Check if it looks like the CSV format "(2,3);..." and "6;20" ?? 
        // No, expecting gameLogic/DB to provide correct format. Return false.
        return { results: [], allPassed: false, error: "Invalid Test Configuration" };
    }

    for (const test of testCases) {
        try {
            // 1. Extract Helper Logic
            // We need to run the user's function.
            // Assumption: User defines a function. We find its name.
            const match = sourceCode.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            const functionName = match ? match[1] : null;

            let finalCode = sourceCode;

            if (functionName) {
                // Append driver code to read stdin, call function, and print result
                finalCode += `
import sys
import ast

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_str = sys.stdin.read().strip()
        
        if not input_str:
            args = ()
        else:
            args = None
            
            # Strategy 1: Attempt direct literal evaluation (e.g., "(1, 2)" or "[1, 2]")
            try:
                val = ast.literal_eval(input_str)
                if isinstance(val, tuple):
                    args = val
                else:
                    # Assume single argument unless it's a tuple
                    args = (val,)
            except:
                pass

            # Strategy 2: Attempt to wrap in parens (e.g., "1, 2" -> "(1, 2)")
            if args is None:
                try:
                    val = ast.literal_eval(f"({input_str})")
                    if isinstance(val, tuple):
                        args = val
                except:
                    pass

            # Strategy 3: Newline Separation
            if args is None and '\\n' in input_str:
                try:
                    lines = [line.strip() for line in input_str.split('\\n') if line.strip()]
                    parsed_args = []
                    for line in lines:
                        try:
                            parsed_args.append(ast.literal_eval(line))
                        except:
                            parsed_args.append(line)
                    args = tuple(parsed_args)
                except:
                    pass

            # Strategy 4: Fallback to single string
            if args is None:
                args = (input_str,)

            # Call Function
            # Note: args is always a tuple here
            result = ${functionName}(*args)
            
            # Print result to stdout
            print(result)
    except Exception as e:
        print(f"Driver Error: {e}", file=sys.stderr)
`;
            }

            const payload = {
                language: "python",
                version: "3.10.0",
                files: [
                    {
                        name: "main.py",
                        content: finalCode
                    }
                ],
                stdin: test.input,
                run_timeout: 3000,
                compile_timeout: 10000,
            };

            const response = await axios.post(`${PISTON_API_URL}/execute`, payload);

            const { run } = response.data;

            // Normalize: remove all whitespace to handle tuple spacing diffs like (1, 2) vs (1,2)
            const normalize = (str) => (str || "").toString().replace(/\s+/g, '');

            const rawActual = run.stdout ? run.stdout : "";
            // Support both DB naming conventions (expected or output)
            const rawExpected = (test.expected !== undefined) ? test.expected : (test.output !== undefined ? test.output : "");

            const actualNormalized = normalize(rawActual);
            const expectedNormalized = normalize(rawExpected);

            const passed = actualNormalized === expectedNormalized;

            console.log(`[PISTON CHECK] Test ${test.input}`);
            console.log(`   Expected: "${rawExpected}" (Norm: "${expectedNormalized}")`);
            console.log(`   Actual:   "${rawActual}" (Norm: "${actualNormalized}")`);
            console.log(`   Passed:   ${passed}`);

            const result = {
                input: test.input,
                expected: rawExpected, // Return user-friendly raw version
                actual: rawActual,
                passed,
                error: run.stderr || null
            };

            results.push(result);
            if (!passed) allPassed = false;

            // If runtime error, we might stop early or flag it
            if (run.stderr) {
                // Decide if we stop on first error or continue. 
                // Let's continue but mark failed.
            }

        } catch (error) {
            console.error("Piston execution error:", error.message);
            return { error: "Execution failed due to server error" };
        }
    }

    return {
        results,
        allPassed
    };
}

module.exports = { executeCode };
