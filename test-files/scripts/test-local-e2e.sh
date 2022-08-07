#!/usr/bin/env sh
THISDIR=$(cd $(dirname "$0"); pwd) #this script's directory

##################################################
# Runs an end-to-end test locally using serverless-offline
# TLDR; this test curls to some known good endpoints looking for an expected HTTP response code:
##################################################

die () {
    echo >&2 "$@"
    stop_serverless_offline
    help
    exit 1
}

help () {
  echo 
  cat << END_DOC
The script $THISSCRIPT failed. This likely means the e2e tests failed. See output above to confirm.
END_DOC

}

REPO_ROOT_DIR=$(cd "$THISDIR/../.." ; pwd)
echo "Using REPO_ROOT_DIR $REPO_ROOT_DIR"

cd "$REPO_ROOT_DIR/examples/serverless-offline"

echo "Running npm install..."
npm install -s
echo "Running npm install completed."

# run severless-offline in background:
start_serverless_offline() {
  echo "starting serverless-offline in background..."
  ./node_modules/.bin/serverless offline &

  # wait on serverless-offline to start
  SECS=10
  while [ $SECS -gt 0 ]; do
    printf "waiting for $SECS seconds for serverless-offline to start serving...\n"
    sleep 1
    SECS=`expr $SECS - 1`
  done
  printf "waiting for seconds for serverless-offline complete. Continuing with test\n"
}

start_serverless_offline

stop_serverless_offline() {
  # shut down serverles offline now
  echo "Killing serverless offline process..."
  pkill -f -n "serverless offline"
  # sleep for a sec just to get clean output due to the background process
  sleep 1
  echo "Killing serverless offline process complete."
}

ROOT_URL=http://localhost:3000/dev

test_url() {
  TEST_URL=$1
  TEST_HTTP_RESP_CODE=$2
  echo "testing URL '$TEST_URL' with HTTP response code '$TEST_HTTP_RESP_CODE'"
  $REPO_ROOT_DIR/test-files/scripts/test-http.sh $TEST_URL $TEST_HTTP_RESP_CODE || die "\n*FAILURE* testing URL '$TEST_URL' with HTTP response code '$TEST_HTTP_RESP_CODE'!"  
}

test_url $ROOT_URL/binary/jpg.jpg

# 200; these all should succeed
test_url $ROOT_URL/binary/png.png
test_url $ROOT_URL/binary/jpg.jpg
test_url $ROOT_URL/binary/glyphicons-halflings-regular.woff2
test_url $ROOT_URL/binary/subdir/png.png

# 403 for APIG, but 404 for serverless-offline
test_url "$ROOT_URL/ff404.png" 404
test_url "$ROOT_URL/jpeg404.jpg" 404
test_url "$ROOT_URL/subdir404/ff.png" 404
test_url "$ROOT_URL/subdir/ff404.png" 404

# 404
test_url "$ROOT_URL/binary/404-glyphicons-halflings-regular.woff2" 404
test_url "$ROOT_URL/binary/subdir/404-png.png" 404

stop_serverless_offline
