"""Storage for Journey Validator.

Inside Streamlit in Snowflake the active Snowpark session is used and the
tables from sql/setup.sql must already exist. Outside Snowflake the app falls
back to a local SQLite file (or a Snowflake connection from secrets.toml when
JV_BACKEND=snowflake) so it can be run and tested on a laptop.
"""

import os
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

from lib import config

KEYS = {
    config.TEST_CASES: ["TC_KEY"],
    config.TEST_STEPS: ["TC_KEY", "STEP_NO"],
    config.TEST_CYCLES: ["CYCLE_KEY"],
    config.CYCLE_EXECUTIONS: ["CYCLE_KEY", "TC_KEY"],
}

COLUMNS = {
    config.TEST_CASES: config.CASE_COLUMNS,
    config.TEST_STEPS: config.STEP_COLUMNS,
    config.TEST_CYCLES: config.CYCLE_COLUMNS,
    config.CYCLE_EXECUTIONS: config.EXECUTION_COLUMNS,
}

SQLITE_DDL = f"""
CREATE TABLE IF NOT EXISTS {config.TEST_CASES} (
    TC_KEY TEXT PRIMARY KEY,
    DESCRIPTION TEXT,
    APP_ID TEXT DEFAULT '{config.DEFAULT_APP_ID}',
    PRIORITY TEXT DEFAULT '{config.DEFAULT_PRIORITY}',
    STATUS TEXT DEFAULT '{config.DEFAULT_STATUS}',
    TEST_TYPE TEXT DEFAULT '{config.DEFAULT_TEST_TYPE}',
    PLATFORM TEXT,
    AUTOMATION_SCRIPT TEXT,
    PASS_FAIL TEXT,
    UPDATED_AT TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS {config.TEST_STEPS} (
    TC_KEY TEXT NOT NULL,
    STEP_NO INTEGER NOT NULL,
    STEP_SUMMARY TEXT,
    TEST_DATA TEXT,
    EXPECTED_RESULT TEXT,
    PRIMARY KEY (TC_KEY, STEP_NO)
);
CREATE TABLE IF NOT EXISTS {config.TEST_CYCLES} (
    CYCLE_KEY TEXT PRIMARY KEY,
    CYCLE_NAME TEXT
);
CREATE TABLE IF NOT EXISTS {config.CYCLE_EXECUTIONS} (
    CYCLE_KEY TEXT NOT NULL,
    TC_KEY TEXT NOT NULL,
    PRIMARY KEY (CYCLE_KEY, TC_KEY)
);
"""


def _clean(df):
    return df.astype(object).where(pd.notna(df), None)


class SqliteStore:
    name = "Local SQLite"

    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = str(path)
        with self._connect() as conn:
            conn.executescript(SQLITE_DDL)

    def _connect(self):
        return sqlite3.connect(self.path)

    def read(self, table, where=None):
        sql = f"SELECT {', '.join(COLUMNS[table])} FROM {table}"
        params = []
        if where:
            sql += " WHERE " + " AND ".join(f"{c} = ?" for c in where)
            params = list(where.values())
        with self._connect() as conn:
            return pd.read_sql_query(sql, conn, params=params)

    def upsert(self, table, df):
        if df.empty:
            return
        cols = list(df.columns)
        keys = KEYS[table]
        updates = [f"{c} = excluded.{c}" for c in cols if c not in keys]
        if table == config.TEST_CASES:
            updates.append("UPDATED_AT = CURRENT_TIMESTAMP")
        action = f"DO UPDATE SET {', '.join(updates)}" if updates else "DO NOTHING"
        sql = (
            f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)}) "
            f"ON CONFLICT ({', '.join(keys)}) {action}"
        )
        with self._connect() as conn:
            conn.executemany(sql, _clean(df).values.tolist())

    def delete_in(self, table, column, values):
        values = list(values)
        if not values:
            return
        with self._connect() as conn:
            conn.execute(
                f"DELETE FROM {table} WHERE {column} IN ({', '.join('?' for _ in values)})",
                values,
            )


class SnowflakeStore:
    name = "Snowflake"

    def __init__(self, session):
        self.session = session

    def read(self, table, where=None):
        from snowflake.snowpark.functions import col

        frame = self.session.table(table).select(COLUMNS[table])
        for column, value in (where or {}).items():
            frame = frame.filter(col(column) == value)
        return frame.to_pandas()

    def upsert(self, table, df):
        if df.empty:
            return
        stage = f"{table}_STAGE"
        self.session.write_pandas(
            _clean(df),
            stage,
            auto_create_table=True,
            overwrite=True,
            table_type="temporary",
            quote_identifiers=False,
        )
        cols = list(df.columns)
        keys = KEYS[table]
        on = " AND ".join(f"t.{k} = s.{k}" for k in keys)
        updates = [f"{c} = s.{c}" for c in cols if c not in keys]
        if table == config.TEST_CASES:
            updates.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        matched = f"WHEN MATCHED THEN UPDATE SET {', '.join(updates)} " if updates else ""
        self.session.sql(
            f"MERGE INTO {table} t USING {stage} s ON {on} "
            f"{matched}"
            f"WHEN NOT MATCHED THEN INSERT ({', '.join(cols)}) "
            f"VALUES ({', '.join('s.' + c for c in cols)})"
        ).collect()

    def delete_in(self, table, column, values):
        from snowflake.snowpark.functions import col

        values = list(values)
        if values:
            self.session.table(table).delete(col(column).isin(values))


@st.cache_resource
def get_store():
    if os.environ.get("JV_BACKEND") == "snowflake":
        return SnowflakeStore(st.connection("snowflake").session())
    try:
        from snowflake.snowpark.context import get_active_session

        return SnowflakeStore(get_active_session())
    except Exception:
        default_path = Path(__file__).resolve().parent.parent / ".local" / "journey_validator.db"
        return SqliteStore(os.environ.get("JV_SQLITE_PATH", default_path))


def load_test_cases():
    df = get_store().read(config.TEST_CASES)
    return df.sort_values("TC_KEY", key=lambda s: s.map(_natural_key)).reset_index(drop=True)


def load_test_case(tc_key):
    df = get_store().read(config.TEST_CASES, {"TC_KEY": tc_key})
    return None if df.empty else df.iloc[0].to_dict()


def load_steps(tc_key):
    df = get_store().read(config.TEST_STEPS, {"TC_KEY": tc_key})
    return df.sort_values("STEP_NO").reset_index(drop=True)


def load_cycles():
    return get_store().read(config.TEST_CYCLES).sort_values("CYCLE_NAME").reset_index(drop=True)


def load_cycle_tc_keys(cycle_key):
    df = get_store().read(config.CYCLE_EXECUTIONS, {"CYCLE_KEY": cycle_key})
    return set(df["TC_KEY"])


def save_case_edits(edited_rows):
    """Write edited Status / Test Type / Automation Script / Pass/Fail values."""
    get_store().upsert(config.TEST_CASES, edited_rows[["TC_KEY", *config.EDITABLE_COLUMNS]])


def save_import(parsed):
    from lib.qmetry_import import merge_cases

    store = get_store()
    cases = merge_cases(store.read(config.TEST_CASES), parsed.cases)
    store.upsert(config.TEST_CASES, cases)
    store.delete_in(config.TEST_STEPS, "TC_KEY", parsed.cases["TC_KEY"])
    store.upsert(config.TEST_STEPS, parsed.steps)
    store.upsert(config.TEST_CYCLES, parsed.cycles)
    store.upsert(config.CYCLE_EXECUTIONS, parsed.executions)


def _natural_key(value):
    import re

    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", str(value))]
