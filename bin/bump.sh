#!/usr/bin/env bash

echo ""

if [[ $# -ne 1 ]]; then
    echo "One argument required: version being released"
    exit 1
fi

sed -i '' -E "s/\"version\": \".*\",/\"version\": \"$1\",/g" Stylelint.novaextension/extension.json || exit 2

echo ""
exit 0
