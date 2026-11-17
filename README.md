# Northstar Online Examination App

A small online examination app with a timed, multiple-choice exam, question navigation, answer validation, and an automated score summary.

## Run locally

1. Install Node.js 18 or later.
2. From the project directory, run `npm ci`.
3. Run `npm test` and `npm run build` to validate the app.
4. Run `npm start` and open `http://localhost:3000`.

## Configure Jenkins for GitHub change builds

1. Make sure Jenkins has the **Pipeline** plugin installed. Install Git and Node.js/npm on the Jenkins agent, and ensure both are available on its `PATH`.
2. Commit and push the repository, including `JenkinsFile` and `package-lock.json`, to GitHub.
3. In Jenkins, create a **Pipeline** job. Under **Pipeline**, select **Pipeline script from SCM**, choose **Git**, enter the repository URL and credentials if it is private, select the branch (for example, `*/main`), and set **Script Path** to `JenkinsFile`.
4. Save the job and run it once. The pipeline polls the configured Git branch every two minutes and starts a build when it detects a new commit. Each build installs dependencies, runs syntax/build checks and Jest tests, then publishes the JUnit report.

The Jenkins pipeline supports Windows and Unix agents. SCM polling uses Jenkins' built-in `pollSCM` trigger, so a GitHub webhook is not required.

## API

- `GET /api/questions` returns the question set without answer keys.
- `POST /api/submit` accepts `{ "answers": { "1": "New Delhi" } }` and returns the total, score, and percentage.
- `GET /api/health` returns the service status.
