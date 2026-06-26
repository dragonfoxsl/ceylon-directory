# Ceylon Directory — developer tasks.
# Run `make` (or `make help`) to see available commands.
# The headline command is `make up`: set everything up and start the app.

# Use a global `supabase` if present, otherwise fall back to npx.
SUPABASE := $(shell command -v supabase 2>/dev/null || echo "npx --yes supabase")

.DEFAULT_GOAL := help
.PHONY: help check install db env setup up dev build test lint stop reset clean

help: ## Show this help
	@echo "Ceylon Directory — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "First time?  Run:  make up"

check: ## Verify Node.js and Docker are installed and running
	@command -v node >/dev/null 2>&1 || { echo "✗ Node.js not found — install 20+ from https://nodejs.org"; exit 1; }
	@echo "✓ Node.js $$(node -v)"
	@command -v npm >/dev/null 2>&1 || { echo "✗ npm not found (ships with Node.js)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "✗ Docker not found — https://docs.docker.com/get-docker/"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "✗ Docker is installed but not running — start Docker Desktop, or 'sudo systemctl start docker'"; exit 1; }
	@echo "✓ Docker running"

install: ## Install npm dependencies
	@npm install

db: check ## Start local Supabase and load schema + seed data
	@echo "Starting local Supabase (Postgres, Auth, Storage)…"
	@$(SUPABASE) start
	@echo "Loading schema + seed data…"
	@$(SUPABASE) db reset

env: ## Generate .env.local from the running Supabase stack (skips if it exists)
	@if [ -f .env.local ]; then \
		echo "✓ .env.local already exists (leaving it untouched)"; \
	else \
		echo "Generating .env.local from supabase status…"; \
		$(SUPABASE) status -o env > .env.status 2>/dev/null || { echo "✗ Could not read supabase status — is the stack running? Try 'make db' first."; rm -f .env.status; exit 1; }; \
		api=$$(grep '^API_URL=' .env.status | sed -e 's/^[^=]*=//' -e 's/^"//' -e 's/"$$//'); \
		anon=$$(grep '^ANON_KEY=' .env.status | sed -e 's/^[^=]*=//' -e 's/^"//' -e 's/"$$//'); \
		srk=$$(grep '^SERVICE_ROLE_KEY=' .env.status | sed -e 's/^[^=]*=//' -e 's/^"//' -e 's/"$$//'); \
		printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\n' "$$api" "$$anon" "$$srk" > .env.local; \
		rm -f .env.status; \
		echo "✓ .env.local created"; \
	fi

setup: check install db env ## Full first-time setup (checks, deps, database, env)
	@echo ""
	@echo "✓ Setup complete. Run 'make dev' to start the app."

up: setup dev ## Set everything up and start the app (use this first)

dev: ## Run the app in development mode (http://localhost:3000)
	@echo "Starting app at http://localhost:3000 …"
	@npm run dev

build: ## Production build
	@npm run build

test: ## Run unit tests
	@npm test

lint: ## Run ESLint
	@npm run lint

stop: ## Stop the local Supabase stack
	@$(SUPABASE) stop

reset: ## Re-apply schema + seed to the local database
	@$(SUPABASE) db reset

clean: ## Stop Supabase and remove build artifacts + deps
	@$(SUPABASE) stop || true
	@rm -rf .next node_modules
	@echo "✓ Cleaned .next and node_modules"
