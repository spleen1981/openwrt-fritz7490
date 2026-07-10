#!/bin/bash
# run-local.sh

HOMEDIR=/home/builder
REPO=my-openwrt-fritz7490
WORKSPACE=$HOMEDIR/$REPO/openwrt
#CACHE_BASE=$HOMEDIR/act-cache
#ACT_CACHE_BASE=$HOMEDIR/$REPO/cache

#mkdir -p $CACHE_BASE/{dl,build_dir,staging_dir,wasp-bin}
#mkdir -p $CACHE_BASE/{dl,wasp-bin}

#for f in $HOMEDIR/$REPO/.secrets/*; do   echo "$(basename $f)=$(cat $f)"; done > .act_secrets
for f in $HOMEDIR/$REPO/.secrets/*; do
  if [[ $(wc -l < "$f") -gt 1 ]]; then
    # Multiline: base64-encode it
    echo "$(basename "$f")=$(base64 -w0 "$f")"
  else
    echo "$(basename "$f")=$(cat "$f")"
  fi
done > .act_secrets

act workflow_dispatch \
  --input openwrt_version=${1:-25.12.4} \
  --input clean_build=${2:-true} \
  --input update_sources=${3:-true} \
  --input build_target=${4:-both} \
  --secret-file .act_secrets \
  --artifact-server-path /tmp/act-artifacts \
  --env FORCE_UNSAFE_CONFIGURE=1
#  --env DL_DIR="$ACT_CACHE_BASE/dl" \
#  --container-options "-v $CACHE_BASE/dl:$ACT_CACHE_BASE/dl -v $CACHE_BASE/wasp-bin:$ACT_CACHE_BASE/wasp-bin -v $CACHE_BASE/build_dir:$ACT_CACHE_BASE/build_dir"
#    -v $CACHE_BASE/staging_dir:$ACT_CACHE_BASE/staging_dir
