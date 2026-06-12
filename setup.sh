#!/bin/bash

if [ -f ".env" ]; then
  echo ".env file exists. ✅"
else
  echo ".env file does not exist."
  cp .env.example .env
fi

ROOT_ENV="$(pwd)/.env"

for dir in apps/* packages/*; do
  if [ -d "$dir" ]; then
    target="$dir/.env"
    # Only symlink if target does not exist or is not already a symlink pointing to root .env
    if [ ! -L "$target" ] || [ "$(readlink -- "$target")" != "$ROOT_ENV" ]; then
      if [ ! -e "$target" ]; then
        ln -sf "$ROOT_ENV" "$target"
        echo "Symlinked .env → $target"
      fi
    fi
  fi
done