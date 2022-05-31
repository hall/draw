# Contributing

Thanks for your interest in contributing! There's a lot to be done :)

> **NOTE**: In general, don't hesitate to open an issue. It's a great place to discuss plans, track progress, troubleshoot errors, etc.

Ideally, a local dev setup is as easy as:

 - open the repo in VSCode
 - run `npm i` in the terminal
 - press `F5` to start the extension

This, however, relies on your host machine having, at least, node (v16, at this time) installed. One way to setup your environment is with [nix](https://nixos.org/): by running `nix develop` from the root of the repo.

Currently, the only tests are an e2e suite under the `./test` directory. These are executed in CI but `npm run test` will run them locally.
