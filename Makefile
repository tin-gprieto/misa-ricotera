.PHONY: install dev build clean fetch-data compute-normalization deploy

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
	npx wrangler pages deploy dist

clean:
	rm -rf dist node_modules public/data
