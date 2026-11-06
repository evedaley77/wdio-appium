"""Parse QMetry test case exports (CSV or XLSX) into Journey Validator tables.

QMetry exports one row per test step and repeats (or leaves blank) the test
case columns on the following step rows, so rows are grouped by test case key.
"""

import io
import re
from dataclasses import dataclass, field

import pandas as pd

from lib import config

# Canonical field -> accepted export headers (compared case-insensitively,
# ignoring spaces, underscores, punctuation).
COLUMN_MAP = {
    "TC_KEY": ["Key", "Test Case Key", "TC_Key", "TC Key", "Issue Key", "Test Case ID"],
    "DESCRIPTION": ["Summary", "Test Case Summary", "Description", "Name", "Title"],
    "APP_ID": ["App ID", "Application", "App"],
    "PRIORITY": ["Priority", "Test Case Priority"],
    "STATUS": ["Status", "Test Case Status"],
    "TEST_TYPE": ["Test Type", "Test Case Type", "Type"],
    "PLATFORM": [
        "Platform",
        "Platforms",
        "Test Case Label",
        "Test Case Component",
        "Components",
        "Component",
        "Labels",
    ],
    "AUTOMATION_SCRIPT": ["Automation Script", "Automation", "Script"],
    "PASS_FAIL": ["Pass/Fail", "Execution Result", "Execution Status", "Result"],
    "STEP_NO": ["Step #", "Step No", "Step Number", "Step Seq", "Seq No", "Step Sequence"],
    "STEP_SUMMARY": ["Step Summary", "Test Step Summary", "Step", "Step Description", "Test Step", "Steps"],
    "TEST_DATA": ["Test Data", "Test Step Test Data", "Data", "Step Data"],
    "EXPECTED_RESULT": [
        "Expected Result",
        "Test Step Expected Result",
        "Expected Results",
        "Expected Outcome",
    ],
    "CYCLE_KEY": ["Test Cycle Key", "Cycle Key"],
    "CYCLE_NAME": ["Test Cycle", "Test Cycles", "Test Cycle Name", "Cycle", "Cycle Name"],
}

MULTI_VALUE_SPLIT = r"\s*[,;|\n]\s*"


@dataclass
class ParsedImport:
    cases: pd.DataFrame
    steps: pd.DataFrame
    cycles: pd.DataFrame
    executions: pd.DataFrame
    mapped: dict = field(default_factory=dict)
    unmapped: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


def _norm(header):
    return re.sub(r"[^a-z0-9#]", "", str(header).lower())


def _blank(value):
    return value is None or (isinstance(value, float) and pd.isna(value)) or str(value).strip() == ""


def _text(value):
    return None if _blank(value) else str(value).strip()


def read_file(name, data):
    if not name.lower().endswith((".xlsx", ".xls")):
        return pd.read_csv(io.BytesIO(data), dtype=str, encoding="utf-8-sig")
    sheets = pd.read_excel(io.BytesIO(data), sheet_name=None, dtype=str)
    for sheet in sheets.values():
        if "TC_KEY" in map_columns(sheet)[0]:
            return sheet
    return next(iter(sheets.values()))


def map_columns(df):
    lookup = {_norm(h): h for h in df.columns}
    mapped = {}
    for canonical, aliases in COLUMN_MAP.items():
        for alias in aliases:
            header = lookup.get(_norm(alias))
            if header is not None and header not in mapped.values():
                mapped[canonical] = header
                break
    unmapped = [h for h in df.columns if h not in mapped.values()]
    return mapped, unmapped


def normalize_status(value):
    v = (_text(value) or "").lower()
    if "progress" in v:
        return "In-Progress"
    if v in {"done", "closed", "complete", "completed", "approved", "resolved"}:
        return "Done"
    return config.DEFAULT_STATUS


def normalize_test_type(value):
    v = (_text(value) or "").lower()
    if "func" in v:
        return "Functional"
    if "regress" in v:
        return "Regression"
    return None


def normalize_platform(value):
    v = (_text(value) or "").lower()
    found = []
    if "android" in v:
        found.append("Mobile - Android")
    if re.search(r"\bios\b|iphone|ipad", v):
        found.append("Mobile - iOS")
    if re.search(r"\bweb\b|desktop|mweb|browser", v):
        found.append("Web")
    return ", ".join(found) or None


def normalize_pass_fail(value):
    v = (_text(value) or "").lower()
    if v.startswith("pass"):
        return "Pass"
    if v.startswith("fail"):
        return "Fail"
    return None


def parse(name, data):
    raw = read_file(name, data)
    raw = raw.dropna(how="all")
    mapped, unmapped = map_columns(raw)
    warnings = []
    if "TC_KEY" not in mapped:
        raise ValueError(
            "Could not find a test case key column. Expected one of: "
            + ", ".join(COLUMN_MAP["TC_KEY"])
        )

    df = pd.DataFrame({canonical: raw[header] for canonical, header in mapped.items()})
    df["TC_KEY"] = df["TC_KEY"].map(_text).ffill()
    df = df[df["TC_KEY"].notna()]

    case_rows = []
    step_rows = []
    execution_pairs = set()
    cycle_names = {}

    for tc_key, group in df.groupby("TC_KEY", sort=False):
        first = lambda c: next((_text(v) for v in group.get(c, []) if not _blank(v)), None)
        case_rows.append(
            {
                "TC_KEY": tc_key,
                "DESCRIPTION": first("DESCRIPTION"),
                "APP_ID": first("APP_ID") or config.DEFAULT_APP_ID,
                "PRIORITY": first("PRIORITY") or config.DEFAULT_PRIORITY,
                "STATUS": normalize_status(first("STATUS")),
                "TEST_TYPE": normalize_test_type(first("TEST_TYPE")),
                "PLATFORM": normalize_platform(first("PLATFORM")) or normalize_platform(first("DESCRIPTION")),
                "AUTOMATION_SCRIPT": first("AUTOMATION_SCRIPT"),
                "PASS_FAIL": normalize_pass_fail(first("PASS_FAIL")),
            }
        )

        step_no = 0
        for _, row in group.iterrows():
            summary = _text(row.get("STEP_SUMMARY"))
            if summary is None and _blank(row.get("EXPECTED_RESULT")) and _blank(row.get("TEST_DATA")):
                continue
            explicit = _text(row.get("STEP_NO"))
            step_no = int(float(explicit)) if explicit and re.fullmatch(r"\d+(\.0)?", explicit) else step_no + 1
            step_rows.append(
                {
                    "TC_KEY": tc_key,
                    "STEP_NO": step_no,
                    "STEP_SUMMARY": summary,
                    "TEST_DATA": _text(row.get("TEST_DATA")),
                    "EXPECTED_RESULT": _text(row.get("EXPECTED_RESULT")),
                }
            )

        for _, row in group.iterrows():
            names = re.split(MULTI_VALUE_SPLIT, _text(row.get("CYCLE_NAME")) or "")
            keys = re.split(MULTI_VALUE_SPLIT, _text(row.get("CYCLE_KEY")) or "")
            for i, cycle_name in enumerate(n for n in names if n):
                cycle_key = keys[i] if i < len(keys) and keys[i] else cycle_name
                cycle_names[cycle_key] = cycle_name
                execution_pairs.add((cycle_key, tc_key))
            if not any(names):
                for cycle_key in (k for k in keys if k):
                    cycle_names.setdefault(cycle_key, cycle_key)
                    execution_pairs.add((cycle_key, tc_key))

    steps = pd.DataFrame(step_rows, columns=config.STEP_COLUMNS)
    duplicates = steps.duplicated(["TC_KEY", "STEP_NO"], keep="last")
    if duplicates.any():
        warnings.append(f"{int(duplicates.sum())} duplicate step numbers were dropped (last one kept).")
        steps = steps[~duplicates]

    cases = pd.DataFrame(case_rows, columns=config.CASE_COLUMNS)
    if "CYCLE_NAME" not in mapped and "CYCLE_KEY" not in mapped:
        warnings.append("No test cycle column found; the Test Cycles filter will not include this upload.")
    if cases["PLATFORM"].isna().any():
        warnings.append(
            f"{int(cases['PLATFORM'].isna().sum())} test cases have no recognizable platform "
            "(Android, iOS, or Web). Set it in Edit mode; until then they only show when no "
            "platform filter is selected."
        )

    return ParsedImport(
        cases=cases,
        steps=steps.reset_index(drop=True),
        cycles=pd.DataFrame(sorted(cycle_names.items()), columns=config.CYCLE_COLUMNS),
        executions=pd.DataFrame(sorted(execution_pairs), columns=config.EXECUTION_COLUMNS),
        mapped=mapped,
        unmapped=unmapped,
        warnings=warnings,
    )


def merge_cases(existing, incoming):
    """Combine uploaded test cases with what's already stored.

    QMetry owns the description, app, priority, platform, and test type.
    Status, Pass/Fail, and Automation Script edits made in Journey Validator
    are kept; the upload only fills them in when they are still empty.
    """
    current = existing.set_index("TC_KEY") if not existing.empty else None
    rows = []
    for row in incoming.to_dict("records"):
        prev = None
        if current is not None and row["TC_KEY"] in current.index:
            prev = current.loc[row["TC_KEY"]].to_dict()
        if prev is None:
            row["TEST_TYPE"] = row["TEST_TYPE"] or config.DEFAULT_TEST_TYPE
            rows.append(row)
            continue
        for column in ("PLATFORM", "TEST_TYPE"):
            if _blank(row[column]):
                row[column] = prev.get(column)
        for column in ("STATUS", "PASS_FAIL", "AUTOMATION_SCRIPT"):
            if not _blank(prev.get(column)):
                row[column] = prev[column]
        rows.append(row)
    return pd.DataFrame(rows, columns=config.CASE_COLUMNS)
