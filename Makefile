.PHONY: install dev build clean fetch-data compute-normalization deploy test test-watch test-verbose test-scenarios

install:
	npm install

fetch-data:
	node scripts/fetch-data.js

compute-normalization:
	node scripts/compute-normalization.js

dev:
	npm run dev

build:
	npm run build

deploy: build
	npx wrangler pages deploy dist --project-name misa-ricotera

test:
	npm test

test-watch:
	npx vitest

test-verbose:
	npx vitest run --reporter=verbose

test-scenarios:
	npx vitest run --reporter=verbose --testNamePattern="stage scenarios"

clean:
	rm -rf dist node_modules public/data
