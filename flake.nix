{
  inputs.utils.url = "github:numtide/flake-utils";

  outputs = inputs@{ self, nixpkgs, ... }:
    inputs.utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShell = (pkgs.buildFHSUserEnvBubblewrap {
          name = "fhs";
          runScript = "bash";
          targetPkgs = pkgs: with pkgs; [
	    # dev
            nodejs
            gitlab-runner

	    # test
            alsa-lib
            at-spi2-atk
            at-spi2-core
            atk
            cairo
            dbus
            expat
            gdk-pixbuf
            glib
            gtk3
            libdrm
            libxkbcommon
            mesa
            nspr
            nss
            pango
            xorg.libX11
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            xorg.libXrandr
            xorg.libxcb

            libdbusmenu
            (lib.getLib systemd)
            fontconfig.lib
          ];
        }).env;

      });
}
