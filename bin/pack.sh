#!/usr/bin/env bash

echo ""

if [[ $# -ne 1 ]]; then
    echo "One argument required: version being released"
    exit 1
fi

UNPACKED=Stylelint.novaextension
ARCHIVED=bin/${UNPACKED}-v${1}.tar.xz

[[ -e "$ARCHIVED" ]] && rm "bin/${UNPACKED}-v${1}.*"
tar -cJf "$ARCHIVED" "$UNPACKED"

SIZE="$(du -hA "$ARCHIVED" | sed -E 's/(.*)\t.*/\1/')"

echo "Packaged release v$1 size: $SIZE"
exit 0
