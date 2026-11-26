#!/usr/bin/env bash
# Every naive call goes through here: MENTURA_* set on the command, logged to runs/$RUN_ID/commands.jsonl.
# usage: RUN_ID=... tools/nv.sh <naive args...>   (run from the workspace dir)
B=/workspace/naive-self; NAIVE=/workspace/naive-strategy-src/Naive/packages/naive/src/interfaces/cli/naive.ts
: "${RUN_ID:?}"; ACTOR_ID="${ACTOR_ID:-chief-of-staff}"
at=$(TZ=America/Chicago date +%Y-%m-%dT%H:%M:%S%:z)
out=$(env TZ=America/Chicago MENTURA_ACTOR=agent MENTURA_ACTOR_ID="$ACTOR_ID" MENTURA_MODEL=unknown MENTURA_SESSION="$RUN_ID" MENTURA_HARNESS=grok-bot-executor node "$NAIVE" "$@" 2>&1); rc=$?
python3 -c 'import json,sys; print(json.dumps({"at":sys.argv[1],"cwd":sys.argv[2],"exit":int(sys.argv[3]),"actor_id":sys.argv[4],"cmd":"naive "+sys.argv[5],"output":sys.argv[6][:4000]}))' "$at" "$PWD" "$rc" "$ACTOR_ID" "$*" "$out" >> "$B/runs/$RUN_ID/commands.jsonl"
printf '%s\n' "$out"; exit $rc
