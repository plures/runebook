{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.runebook-agent;
  
  # Configuration file path
  configDir = "/var/lib/runebook-agent";
  configFile = "${configDir}/agent-config.json";
  observerConfigFile = "${configDir}/observer-config.json";
  
  # Service script
  serviceScript = pkgs.writeShellScript "runebook-agent-service" ''
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Ensure config directory exists
    mkdir -p ${configDir}
    
    # Initialize config files if they don't exist
    if [ ! -f ${configFile} ]; then
      cat > ${configFile} <<EOF
    {
      "enabled": ${if cfg.enable then "true" else "false"},
      "captureEvents": ${if cfg.captureEvents then "true" else "false"},
      "analyzePatterns": ${if cfg.analyzePatterns then "true" else "false"},
      "suggestImprovements": ${if cfg.suggestImprovements then "true" else "false"},
      "storagePath": "${cfg.dataDir}",
      "maxEvents": ${toString cfg.maxEvents},
      "retentionDays": ${toString cfg.retentionDays}
    }
    EOF
    fi
    
    if [ ! -f ${observerConfigFile} ]; then
      cat > ${observerConfigFile} <<EOF
    {
      "enabled": ${if cfg.enable then "true" else "false"},
      "redactSecrets": true,
      "usePluresDB": false,
      "chunkSize": 4096,
      "maxEvents": ${toString cfg.maxEvents},
      "retentionDays": ${toString cfg.retentionDays},
      "storagePath": "${cfg.dataDir}"
    }
    EOF
    fi
    
    # Set up environment
    export HOME=${configDir}
    export XDG_CONFIG_HOME=${configDir}
    export XDG_DATA_HOME=${configDir}
    
    # Inject secrets from environment/agenix/sops if available
    # OpenAI key must be provided via environment variable
    if [ -n "''${OPENAI_API_KEY:-}" ]; then
      export OPENAI_API_KEY
    fi
    
    # Run the agent in background mode
    # Note: The actual agent runs as a shell hook, so this service
    # mainly ensures the configuration is set up correctly.
    # For a true background service, you would need to implement
    # a daemon mode in the CLI.
    
    # For now, we'll just ensure the config is ready
    # The agent will be activated via shell hooks when enabled
    exec sleep infinity
  '';
  
in {
  options.services.runebook-agent = {
    enable = mkEnableOption "RuneBook agent service";
    
    captureEvents = mkOption {
      type = types.bool;
      default = true;
      description = "Enable event capture";
    };
    
    analyzePatterns = mkOption {
      type = types.bool;
      default = true;
      description = "Enable pattern analysis";
    };
    
    suggestImprovements = mkOption {
      type = types.bool;
      default = true;
      description = "Enable suggestion generation";
    };
    
    dataDir = mkOption {
      type = types.str;
      default = "/var/lib/runebook-agent/data";
      description = "Data directory for agent storage";
    };
    
    maxEvents = mkOption {
      type = types.int;
      default = 10000;
      description = "Maximum number of events to store";
    };
    
    retentionDays = mkOption {
      type = types.int;
      default = 30;
      description = "Number of days to retain events";
    };
    
    openaiApiKey = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = ''
        OpenAI API key (if using LLM features).
        WARNING: This will be stored in the Nix store if set here.
        Prefer using environment variables, agenix, or sops-nix instead.
      '';
    };
  };
  
  config = mkIf cfg.enable {
    systemd.user.services.runebook-agent = {
      description = "RuneBook Agent Service";
      wantedBy = [ "default.target" ];
      
      serviceConfig = {
        Type = "simple";
        ExecStart = "${serviceScript}";
        Restart = "on-failure";
        RestartSec = "5s";
        
        # Security settings
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = "read-only";
        ReadWritePaths = [ configDir cfg.dataDir ];
        
        # Environment
        Environment = [
          "HOME=${configDir}"
          "XDG_CONFIG_HOME=${configDir}"
          "XDG_DATA_HOME=${configDir}"
        ] ++ optional (cfg.openaiApiKey != null) "OPENAI_API_KEY=${cfg.openaiApiKey}";
      };
    };
    
    # Create data directory
    systemd.tmpfiles.rules = [
      "d ${configDir} 0755 root root -"
      "d ${cfg.dataDir} 0755 root root -"
    ];
  };
}

