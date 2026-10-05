#!/bin/bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages serves that branch).
# Needs TOKEN in the environment (a GitHub token for the repo owner).
set -e
cd "$(dirname "$0")/.."
npm run build
tmp=$(mktemp -d)
cp -r dist/. "$tmp"/ && touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
export GIT_AUTHOR_NAME="Mohan Chillara" GIT_AUTHOR_EMAIL="mohan.kchill@gmail.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
git add -A
tree=$(git write-tree)
git update-ref HEAD "$(git commit-tree "$tree" -m "site")"
auth=$(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)
git -c http.extraheader="Authorization: Basic $auth" push -f -q "https://github.com/mohanchillara1/sayso.git" gh-pages
echo deployed
