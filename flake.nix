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
            nodejs
            gitlab-runner

            glib
            wayland
            gtk3
            nss
            nspr
            atk
            at-spi2-atk
            dbus
            libdrm
            pango
            cairo
            gdk-pixbuf
            xorg.libX11
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            xorg.libXrandr
            mesa
            expat
            xorg.libxcb
            libxkbcommon
            alsa-lib
            at-spi2-core

            libdbusmenu
            (lib.getLib systemd)
            fontconfig.lib
          ];
        }).env;

      });
}
