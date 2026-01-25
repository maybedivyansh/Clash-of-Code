import csv

with open("questions_templates.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if not row["starter_code"].strip():
            continue
        print("\nTesting:", row["title"])

        code = row["starter_code"].replace("\\n", "\n")
        test_cases = row["test_cases"].split(";")
        expected = row["expected_output"].split(";")

        exec_globals = {}
        exec(code, exec_globals)

        func_name = code.split("(")[0].split()[1]

        for i, test in enumerate(test_cases):
            try:
                inp = eval(test)
                result = exec_globals[func_name](inp) if not isinstance(inp, tuple) else exec_globals[func_name](*inp)
                print(test, "→", result, "| expected:", expected[i])
            except Exception as e:
                print(test, "→ ERROR:", e)
