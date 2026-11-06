-- Run in the database/schema that hosts the JOURNEY_VALIDATOR Streamlit app.
-- The app's owner role needs SELECT, INSERT, UPDATE, DELETE on these tables
-- and CREATE TEMPORARY TABLE on the schema (used for MERGE staging).

CREATE TABLE IF NOT EXISTS JV_TEST_CASES (
    TC_KEY            VARCHAR NOT NULL PRIMARY KEY,
    DESCRIPTION       VARCHAR,
    APP_ID            VARCHAR DEFAULT 'CNN.com',
    PRIORITY          VARCHAR DEFAULT 'P0',
    STATUS            VARCHAR DEFAULT 'To Do',      -- To Do | In-Progress | Done
    TEST_TYPE         VARCHAR DEFAULT 'Regression', -- Regression | Functional
    PLATFORM          VARCHAR,                      -- comma-separated: Mobile - Android, Mobile - iOS, Web
    AUTOMATION_SCRIPT VARCHAR,
    PASS_FAIL         VARCHAR,                      -- Pass | Fail
    UPDATED_AT        TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS JV_TEST_STEPS (
    TC_KEY          VARCHAR NOT NULL,
    STEP_NO         NUMBER  NOT NULL,
    STEP_SUMMARY    VARCHAR,
    TEST_DATA       VARCHAR,
    EXPECTED_RESULT VARCHAR,
    PRIMARY KEY (TC_KEY, STEP_NO)
);

CREATE TABLE IF NOT EXISTS JV_TEST_CYCLES (
    CYCLE_KEY  VARCHAR NOT NULL PRIMARY KEY,
    CYCLE_NAME VARCHAR
);

CREATE TABLE IF NOT EXISTS JV_CYCLE_EXECUTIONS (
    CYCLE_KEY VARCHAR NOT NULL,
    TC_KEY    VARCHAR NOT NULL,
    PRIMARY KEY (CYCLE_KEY, TC_KEY)
);
