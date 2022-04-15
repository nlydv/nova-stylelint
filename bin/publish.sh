#!/usr/bin/env bash

echo ""

if ! nova extension publish Stylelint.novaextension 1> /dev/null; then
    echo -e "Unable to publish to Nova's extension library\n"
    exit 1
fi

echo ""
exit 0
