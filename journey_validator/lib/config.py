import os

APP_TITLE = "Journey Validator"
TEST_PLAN_NAME = "CNN Mobile/Web Analytics Regression – User Journey List (BAU)"

QMETRY_TEST_PLAN_URL = (
    "https://wbddigital.atlassian.net/jira/apps/8b7b816c-2b85-4e73-ae22-aa0e6f0407ec/"
    "53926dc7-47de-4878-9fc2-5033dde60120/Manage/TestPlan?projectId=10199&projectKey=DART"
)
SIGNAL_STATION_URL = "https://jmcuvm-wbd-ted-cnn.snowflakecomputing.app/instrumentation"

# Per-test-case QMetry URL with a "{tc_key}" placeholder. When unset, the
# steps page links to the test plan instead.
QMETRY_TEST_CASE_URL = os.environ.get("JV_QMETRY_TEST_CASE_URL", "")

# Prefix for the TC_Key links. Relative by default so it works both locally
# and on the snowflakecomputing.app host.
STEPS_PAGE_URL = os.environ.get("JV_STEPS_PAGE_URL", "./test_steps")

DEFAULT_APP_ID = "CNN.com"
DEFAULT_PRIORITY = "P0"
DEFAULT_STATUS = "To Do"
DEFAULT_TEST_TYPE = "Regression"

STATUS_OPTIONS = ["To Do", "In-Progress", "Done"]
TEST_TYPE_OPTIONS = ["Regression", "Functional"]
PLATFORM_OPTIONS = ["Mobile - Android", "Mobile - iOS", "Web"]
PLATFORM_EDIT_OPTIONS = [
    "Mobile - Android",
    "Mobile - iOS",
    "Web",
    "Mobile - Android, Mobile - iOS",
    "Mobile - Android, Mobile - iOS, Web",
]
PASS_FAIL_OPTIONS = ["Pass", "Fail"]

ALL_CYCLES = "All test cycles"

TEST_CASES = "JV_TEST_CASES"
TEST_STEPS = "JV_TEST_STEPS"
TEST_CYCLES = "JV_TEST_CYCLES"
CYCLE_EXECUTIONS = "JV_CYCLE_EXECUTIONS"

CASE_COLUMNS = [
    "TC_KEY",
    "DESCRIPTION",
    "APP_ID",
    "PRIORITY",
    "STATUS",
    "TEST_TYPE",
    "PLATFORM",
    "AUTOMATION_SCRIPT",
    "PASS_FAIL",
]
EDITABLE_COLUMNS = ["STATUS", "TEST_TYPE", "PLATFORM", "AUTOMATION_SCRIPT", "PASS_FAIL"]
STEP_COLUMNS = ["TC_KEY", "STEP_NO", "STEP_SUMMARY", "TEST_DATA", "EXPECTED_RESULT"]
CYCLE_COLUMNS = ["CYCLE_KEY", "CYCLE_NAME"]
EXECUTION_COLUMNS = ["CYCLE_KEY", "TC_KEY"]
