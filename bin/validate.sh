#!/usr/bin/env bash

echo ""

if ! nova extension validate Stylelint.novaextension 1> /dev/null; then
    echo -e "Extension not validated for release\n"
    exit 1
fi

echo ""
exit 0
