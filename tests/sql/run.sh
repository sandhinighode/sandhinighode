#!/usr/bin/env bash
# Applies all migrations to a throwaway local Postgres and runs the SQL checks.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres tests/sql/run.sh   (needs a running, empty Postgres)
set -euo pipefail
cd "$(dirname "$0")/../.."
run() { psql -d saves_test -v ON_ERROR_STOP=1 -q -f "$1"; }
# Each check file gets a fresh database, since some checks depend on the state left by others.
for t in tests/sql/*.test.sql; do
  echo "── $t"
  psql -v ON_ERROR_STOP=1 -q -c "drop database if exists saves_test" -c "create database saves_test"
  run tests/sql/supabase_stubs.sql
  for f in supabase/migrations/*.sql; do run "$f"; done
  run "$t"
done
