#!/bin/zsh
# setup-nginx-proxy-macports.sh
# PREVIEW ONLY - This script prints commands to configure nginx as a reverse proxy
# for local Icecast dev streaming. It will NOT make system changes without sudo.

NGINX_SERVERS_DIR="/opt/local/etc/nginx/servers"
NGINX_CONF_FILE="rlplayer-local.conf"
NGINX_CONF_PATH="$NGINX_SERVERS_DIR/$NGINX_CONF_FILE"

ICECAST_HOST=${1:-192.168.55.187}
ICECAST_PORT=${2:-8000}
ICECAST_MOUNT=${3:-""}
PROXY_PATH=${4:-"/kvpn/"}
PROXY_PORT=${5:-8080}

# Build proxy_pass
if [[ -n "$ICECAST_MOUNT" ]]; then
  PROXY_PASS="http://$ICECAST_HOST:$ICECAST_PORT/$ICECAST_MOUNT";
else
  PROXY_PASS="http://$ICECAST_HOST:$ICECAST_PORT/";
fi

cat <<EOF
# === RL Player local nginx reverse proxy helper ===
# This script is a helper. It prints the recommended commands to set up
# a local nginx reverse proxy using MacPorts. Review the nginx config
# before applying (security and environment-specific settings).

# 1) Preview nginx config file location (MacPorts):
#    $NGINX_CONF_PATH

# 2) Create the servers directory if it doesn't exist (requires sudo):
sudo mkdir -p "$NGINX_SERVERS_DIR"

# 3) Create the nginx config (sudo tee will prompt for admin privileges):
sudo tee "$NGINX_CONF_PATH" > /dev/null <<'NGCONF'
server {
    listen $PROXY_PORT;
    server_name localhost;

    location $PROXY_PATH {
      proxy_pass $PROXY_PASS;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Connection "";

      proxy_buffering off; # helpful for streaming

      # Add CORS headers for local dev so the app can fetch/stream
      add_header Access-Control-Allow-Origin * always;
      add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
      add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;

      if ($request_method = 'OPTIONS') {
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type text/plain charset=UTF-8;
        add_header Content-Length 0;
        return 204;
      }
    }

    location = / {
      return 301 $PROXY_PATH;
    }
}
NGCONF

# 4) Test nginx config (sudo required to run nginx -t with the macports conf):
sudo /opt/local/sbin/nginx -t -c /opt/local/etc/nginx/nginx.conf

# 5) Start or reload nginx via MacPorts service (load persists across reboot):
sudo port load nginx
# or to just restart if already loaded:
sudo /opt/local/sbin/nginx -s reload

# 6) Set VITE_STREAM_URL in your local .env to the proxied endpoint:
#    Example (if mount /stream):
#    VITE_STREAM_URL=http://localhost:$PROXY_PORT$PROXY_PATHstream

# 7) Test the proxy in terminal using curl (if installed) or the browser:
#    curl -I http://localhost:$PROXY_PORT$PROXY_PATHstream
#    Expect HTTP 200 and Content-Type: audio/* if the mountpoint is correct

# 8) To stop and revert (remove the config and unload nginx):
#    sudo port unload nginx
#    sudo rm "$NGINX_CONF_PATH"
#    sudo /opt/local/sbin/nginx -s reload

# Notes:
# - Replace $ICECAST_HOST:$ICECAST_PORT with your Icecast host/port
# - If you need HTTPS for dev, create certificates (mkcert) and configure nginx
#   with SSL listening.
# - Use these commands only on your local dev machine; do not commit this to public repos.
EOF

# Print a short reminder
cat <<EOT
Setup summary:
- MacPorts nginx server directory: $NGINX_SERVERS_DIR
- Suggested proxy config path: $NGINX_CONF_PATH
- Your Icecast address: $ICECAST_HOST:$ICECAST_PORT
- Proxy listen port: $PROXY_PORT
- Proxy virtual path: $PROXY_PATH
- ProxyPass to: $PROXY_PASS

Run the above commands (the script prints them) with sudo to write config & reload nginx.
EOT
