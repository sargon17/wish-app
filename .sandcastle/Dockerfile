FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Rename the base image's "node" user (UID 1000) to "agent".
RUN usermod -d /home/agent -m -l agent node

# Sandcastle's Docker provider runs containers as the host UID/GID. On macOS
# that UID is usually not 1000, so /home/agent must be writable by that user.
RUN chmod -R a+rwX /home/agent

# Install Bun and Codex CLI (run as root before USER agent)
ENV BUN_INSTALL=/usr/local/bun
ENV PATH="/usr/local/bun/bin:${PATH}"
RUN curl -fsSL https://bun.sh/install | bash \
  && bun add --global @openai/codex \
  && chmod -R a+rwX /usr/local/bun /usr/local/lib/node_modules /usr/local/bin

USER agent

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
