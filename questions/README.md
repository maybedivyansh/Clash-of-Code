# Question Engine

This folder contains the entire question database and validation logic.

## Files
- questions.csv : Source of all problems.
- csv_tester.py : Local validator.

## CSV Schema
id
title
time_slot
difficulty
problem_statement
starter_code
test_cases
expected_output
hints

## Test Case Format
All test cases must be valid Python literals.

Examples:
"hello"
[1,2,3]
(2,3)

## Validation
Run:
python csv_tester.py

If no crashes occur, the file is production-safe.
