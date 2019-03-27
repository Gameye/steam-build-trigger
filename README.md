# Steam build trigger
Trigger a steam build when a new version is released by steam

## Automated tests
Never commit something that breaks the build! You can
easily prevent this by linking the `test.sh` script as a git `pre-commit` hook!

like this:
```bash
ln test.sh .git/hooks/pre-commit
```

## What does it do?
 1. Read initial version from the steam-api
 2. Compare that version to version from steam-api
 3. Continue polling the steam api to figure out if there is a new version available
 4. If a new version is available, an update is needed so trigger CI via circleci api

## tools
Trigger a build:
```bash
curl -X POST --header "Content-Type: application/json" -d '{"branch":"master"}' https://circleci.com/api/v1.1/project/github/Gameye/tf2/build?circle-token=${CIRCLE_API_USER_TOKEN}
```
