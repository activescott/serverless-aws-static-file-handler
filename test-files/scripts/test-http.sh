#!/usr/bin/env sh
## allows curl to some known HTTP endpoint and confirm an expected status code
URL_PATH=$1
if [[ -z "$URL_PATH" ]]; then
  echo "path not specified"
  return 1
fi
EXPECT_CODE=$2
if [[ -z "$EXPECT_CODE" ]]; then
  EXPECT_CODE=200
fi

HTTP_CODE=$(curl -s -w '%{http_code}' --compressed --output /dev/null "$URL_PATH")
if [[ "$HTTP_CODE" = "$EXPECT_CODE" ]]; then
  echo "$URL_PATH succeeded (returned expected code $HTTP_CODE)"
else
  echo "FAILURE: Expected $URL_PATH to have code $EXPECT_CODE but it was $HTTP_CODE"
  exit $HTTP_CODE
fi
