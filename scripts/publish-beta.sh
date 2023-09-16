#!/bin/sh

set -e

pnpm run build

cd ../dist

npm publish --tag=beta --access public
cd -

echo "Publish completed"
