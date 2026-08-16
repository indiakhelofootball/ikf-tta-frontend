@echo off
REM ============================================================================
REM  RETIRED 2026-08-15 — this script no longer deploys anything.
REM
REM  It used to scp build\* to root@47.245.98.149:/root/TTA/frontend/... .
REM  That box was decommissioned when TTA moved to 47.237.115.74 on 2026-07-24
REM  (see _docs/planning/REPO_STATE_2026-07-27.md and CHANGE_REPORT_2026-07-27.md).
REM  The new box does not serve a scp'd build directory at all: nginx runs inside
REM  the tta-frontend container and serves the build baked into the image.
REM
REM  Uploading a locally built bundle is also unsafe: a local `npm run build`
REM  reads .env* from this machine, and it produced a bundle pointing at
REM  http://localhost:8000/api. The image build ignores .env* entirely
REM  (.dockerignore) and pins REACT_APP_API_URL=/api.
REM
REM  Current procedure: _docs\deployment\DEPLOYMENT.md
REM ============================================================================
echo.
echo   deploy.bat is retired. It targeted 47.245.98.149, which no longer exists.
echo   TTA now deploys as a Docker image, not as an scp'd build folder.
echo.
echo   On the server, in the directory holding docker-compose.yml:
echo.
echo       git pull
echo       BUILD_ID=$(git rev-parse --short HEAD) docker compose up -d --build frontend
echo.
echo   Full steps: _docs\deployment\DEPLOYMENT.md
echo.
pause
