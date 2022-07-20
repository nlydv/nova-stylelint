#!/usr/bin/env bash

echo ""

if [[ $# -ne 2 ]]; then
    echo "Two arguments required: the current version and the version being released"
    exit 1;
fi

FROM="v$1"
TO="v$2"
changesection=$(echo "$TO" | sed -E 's/[\.]//g')

cat <<EOF
**Changelog**: [\`$TO\`](../master/CHANGELOG.md#$changesection)

**Commit Diff**: [\`$FROM → $TO\`](../../compare/$FROM...$TO)
EOF

echo ""
exit 0
