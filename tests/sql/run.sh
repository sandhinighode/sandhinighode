#!/usr/bin/env bash
# Applies all migrations to a throwaway local Postgres and runs the SQL checks.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres tests/sql/run.sh   (needs a running, empty Postgres)
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists saves_test" -c "create database saves_test"
run() { psql -d saves_test -v ON_ERROR_STOP=1 -q -f "$1"; }
run tests/sql/supabase_stubs.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for t in tests/sql/*.test.sql; do echo "── $t"; run "$t"; done
