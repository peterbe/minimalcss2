# https://github.com/casey/just
# https://just.systems/

test:
    npm run test

lint:
    npm run lint

format:
    npm run format

upgrade:
    npx npm-check-updates --interactive