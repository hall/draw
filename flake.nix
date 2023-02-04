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

          postBuild = ''
            dir=archive
            mkdir $dir
            fname=$(ls *.vsix)
            ${pkgs.unzip}/bin/unzip $fname -d $dir
            find $dir -type f -exec touch {} \;
            (cd $dir && ${pkgs.zip}/bin/zip -r ../$fname .)
          '';

          installPhase = ''
            mkdir -p $out
            cp ./*.vsix $out/
          '';
        };
      });
}
