DOCKER_CMD=docker

.FORCE:

check-tag:
ifndef TAG
	$(error TAG is required. Usage: make push TAG=1.2.3)
endif

push: check-tag .FORCE
	$(DOCKER_CMD) login
	$(DOCKER_CMD) buildx build --platform linux/amd64,linux/arm64 -t disk91/itc-front:$(TAG) .
	$(DOCKER_CMD) tag disk91/itc-front:$(TAG) disk91/itc-front:latest
	$(DOCKER_CMD) push disk91/itc-front:$(TAG)
	$(DOCKER_CMD) push disk91/itc-front:latest