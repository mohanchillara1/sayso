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
auth=$(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)
url="https://github.com/mohanchillara1/sayso.git"
push() { git -c http.extraheader="Authorization: Basic $auth" "$@"; }
parent=""
if push ls-remote --exit-code --heads "$url" gh-pages >/dev/null 2>&1; then
  push fetch -q "$url" gh-pages
  parent="-p $(git rev-parse FETCH_HEAD)"
fi
git add -A
tree=$(git write-tree)
git update-ref HEAD "$(git commit-tree "$tree" $parent -m "site")"
push push -q "$url" gh-pages   # normal push, never forced
echo deployed
