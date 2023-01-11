{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = inputs@{ self, ... }:
    inputs.utils.lib.eachDefaultSystem (system:
      let pkgs = inputs.nixpkgs.legacyPackages.${system}; in
      {
        packages.default = pkgs.buildNpmPackage {
          name = "draw";
          src = ./.;
          npmDepsHash = "sha256-/aW1tyzE6WK4zBAOep4BhBM4W6/ZjpoBEpZ50eMVnM4=";
          nativeBuildInputs = with pkgs; [
            pkg-config
            python3
          ];
          buildInputs = with pkgs; [
            libsecret
          ];

          installPhase = ''
            mkdir -p $out
            cp ./*.vsix $out/
          '';
        };
      });
}
