{
  inputs.utils.url = "github:numtide/flake-utils";

  outputs = inputs@{ self, nixpkgs, ... }:
    inputs.utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            # gitlab-runner
          ];
        };
      });
}
