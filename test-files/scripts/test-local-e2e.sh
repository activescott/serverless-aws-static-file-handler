#!/usr/bin/env sh
THISDIR=$(cd $(dirname "$0"); pwd) #this script's directory

#####
# Runs an end-to-end test locally using serverless-offline
####

REPO_ROOT_DIR=$(cd "THISDIR" ; pwd)
echo "Using REPO_ROOT_DIR $REPO_ROOT_DIR"

cd "$REPO_ROOT_DIR/examples/serverless-offline"

echo "Running npm install..."
npm install -s
echo "Running npm install completed."

# run severless-offline in background:
./node_modules/.bin/serverless offline &

# wait on serverless-offline to start
sleep 5

# CURL to some known good endpoints expecting 200:
TEST_HTTP_EXEC=$REPO_ROOT_DIR/test-files/scripts/test-http.sh
ROOT_URL=http://localhost:3000/dev

# 200; these all should succeed
$TEST_HTTP_EXEC $ROOT_URL/binary/png.png
$TEST_HTTP_EXEC $ROOT_URL/binary/jpg.jpg
$TEST_HTTP_EXEC $ROOT_URL/binary/glyphicons-halflings-regular.woff2
$TEST_HTTP_EXEC $ROOT_URL/binary/subdir/png.png

# 403 for APIG, but 404 for serverless-offline
$TEST_HTTP_EXEC "$ROOT_URL/ff404.png" 404
$TEST_HTTP_EXEC "$ROOT_URL/jpeg404.jpg" 404
$TEST_HTTP_EXEC "$ROOT_URL/subdir404/ff.png" 404
$TEST_HTTP_EXEC "$ROOT_URL/subdir/ff404.png" 404

# 404
$TEST_HTTP_EXEC "$ROOT_URL/binary/404-glyphicons-halflings-regular.woff2" 404
$TEST_HTTP_EXEC "$ROOT_URL/binary/subdir/404-png.png" 404

# shut down serverles offline now
echo "Killing serverless offline process..."
pkill -f -n "serverless offline"
# sleep for a sec just to get clean output due to the background process
sleep 1
echo "Killing serverless offline process complete."
