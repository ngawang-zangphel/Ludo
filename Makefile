# Shortcuts for the Ludo Arena compose stack.
# From the repo root (locally or on the server):
#   make up        start / rebuild in the background
#   make down      stop and remove the container
#   make restart   down, then rebuild and start (usual deploy step)
#   make deploy    git pull, then restart
#   make logs      follow container logs
#   make status    show running containers
#   make rebuild   rebuild with no cache, then start

COMPOSE ?= docker compose

.PHONY: up down restart deploy logs status rebuild help

help:
	@echo "Ludo Arena Docker shortcuts"
	@echo "  make up        Start or rebuild in the background"
	@echo "  make down      Stop and remove the container"
	@echo "  make restart   Down, then rebuild and start"
	@echo "  make deploy    git pull, then restart"
	@echo "  make logs      Follow container logs"
	@echo "  make status    Show compose status"
	@echo "  make rebuild   Rebuild with no cache, then start"

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart: down up

deploy:
	git pull
	$(MAKE) restart

logs:
	$(COMPOSE) logs -f --tail=100

status:
	$(COMPOSE) ps

rebuild:
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d
