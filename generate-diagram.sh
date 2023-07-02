#!/bin/bash

npx ts-node ./src/main.ts

d2 -l elk -t 200 ./diagram.d2 ./diagram.svg
