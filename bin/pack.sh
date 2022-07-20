#!/usr/bin/env bash

echo ""

if [[ $# -ne 1 ]]; then
    echo "One argument required: version being released"
    exit 1
fi

UNPACKED=Stylelint.novaextension
ARCHIVED=bin/${UNPACKED}-v${1}.tar.xz

[[ -e $ARCHIVED ]] && rm $ARCHIVED
tar -cJf $ARCHIVED $UNPACKED

echo ""
exit 0
