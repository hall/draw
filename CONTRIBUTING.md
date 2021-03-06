# Contributing

Thanks for your interest in contributing! There's a lot to be done :)

> **NOTE**: In general, don't hesitate to open an issue. It's a great place to discuss plans, track progress, troubleshoot errors, etc.

## dev

Ideally, a local dev setup is as easy as:

- open the repo in VSCode
- run `npm i` in the terminal
- press `F5` to start the extension

This, however, relies on your host machine having, at least, node (v16, at this time) installed. One way to setup your environment is with [nix](https://nixos.org/): by running `nix develop` from the root of the repo.

## test

Currently, the only tests are an e2e suite under the [`./test`](./test) directory. These are executed in CI but `npm test` will run them locally.

## release

A new release is published when a commit on the default branch bumps the version in `CHANGELOG.md` _and_ `package.json`. This will also push a release tag to the repo.
