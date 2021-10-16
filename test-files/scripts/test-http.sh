#!/usr/bin/env sh
## allows curl to some known HTTP endpoint and confirm an expected status code
URL_PATH=$1
if [ -z "$URL_PATH" ]; then
  echo "path not specified"
  return 1
fi
EXPECT_CODE=$2
if [ -z "$EXPECT_CODE" ]; then
  echo "EXPECT_CODE not specified; defaulting to 200"
  EXPECT_CODE=200
fi

echo "Testing $URL_PATH for code $EXPECT_CODE..."
HTTP_CODE=$(curl -s -w '%{http_code}' --compressed --output /dev/null "$URL_PATH")
if [ "$HTTP_CODE" = "$EXPECT_CODE" ]; then
  echo "Testing $URL_PATH succeeded (returned expected code $HTTP_CODE)"
  exit 0
else
  echo "\n˅˅˅˅˅ FAILURE ˅˅˅˅˅"
  echo "*** $URL_PATH *FAILED*. . Expected to have code $EXPECT_CODE but was $HTTP_CODE ***"
  echo "^^^^^ FAILURE ^^^^^\n"
  exit 1
fi
