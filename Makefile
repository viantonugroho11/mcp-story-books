.PHONY: install dev build test typecheck discover

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run typecheck
	npm test

typecheck:
	npm run typecheck

discover:
	npm run discover
