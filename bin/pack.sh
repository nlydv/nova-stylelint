#!/usr/bin/env bash

echo ""

npm run clean
npm run build

if [[ $# -ne 1 ]]; then
    echo "One argument required: version being released"
    exit 1
fi

UNPACKED=Stylelint.novaextension
ARCHIVED=.github/${UNPACKED}-v${1}.tar.xz

[[ -e $ARCHIVED ]] && rm $ARCHIVED
tar -cJf $ARCHIVED $UNPACKED

echo ""
exit 0
