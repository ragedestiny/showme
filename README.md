# Show ME

> Show ME is used as a tool to help students write vivid and exciting sentences. Each day of the challenge, students will be given a different simple tell sentence. The goal is for the student to formulate and come up with a more descriptive sentence. Show ME will keep track of the submitted sentences, and students can edit them at any time.

> Live website [_here_](https://show-me-not-tell.netlify.app/).

## Table of Contents

- [General Info](#general-information)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [How Changes Go Live](#how-changes-go-live)
- [Project Status](#project-status)
- [Room for Improvement](#room-for-improvement)

## General Information

- As a tutor, my goal is to help students achieve greater heights in their English class. One way to do this is to write better and more descriptively rather than simply and plainly. Before creating this web app, my students had to keep track of their sentences in a standard paper notebook. The paper notebook would eventually get lost, and it was hard to keep track of what their sentences were. In order to make this exercise more steamlined and efficient, creating a web app was the way to go.

## Technologies Used

- Client (`client/`): React, Redux with redux-persist, React Router, Bootstrap, MDB and MUI, built with Vite and hosted on Netlify
- Backend (`backend/`): Node.js, Express and Mongoose (MongoDB Atlas), running on Firebase Cloud Functions
- Tests: Vitest in both halves, plus QA Wolf's end-to-end tests on staging

Exact versions are listed in each folder's `package.json`.

## Features

- Login with school google account (every student has a school Google account)
- Personal page where students can create and edit show sentences
- Admin can approve or reject show sentences
- Display students' sentences in Collections Page after approval

## Screenshots

![Home Page](./img/homepage.PNG)

![My Page](./img/MyPage.PNG)

![Admin Page](./img/AdminPage.PNG)

![Collections](./img/Collections.PNG)

## Project Structure

- `client/`: the website (React), built and hosted by Netlify
- `backend/`: the API the website calls (Express on Firebase Cloud Functions)
- `.github/`: the GitHub Actions workflows that test every change, deploy staging and promote to production
- `img/`: the screenshots above

Each half has its own `package.json`, so run npm commands inside `client/` or `backend/`.

## Setup

Backend (runs in the Firebase emulator):

`cd backend`

`npm install`

`npm start` (turns the TypeScript into JavaScript in `lib/`, then starts the emulator)

While it runs, `npm run build:watch` in a second terminal rebuilds on every save, and the emulator reloads the new code.

The server sends every answer through the API contract (`backend/contract/api.ts`), and a stored document that doesn't fit it makes the request sending it fail. Before deploying a change to the contract's answers, `npm run check:contract` checks the practice database's data against it, and `npm run check:contract:production` the real one. Both only read, and print counts and field names, never what's stored.

Client (http://localhost:3000, which forwards `/api` calls to the emulator):

`cd client`

`npm install`

`npm start`

The client's types come from the backend's API contract (`backend/contract/api.ts`), so `npm run typecheck` in `client` needs the backend's packages installed as well (`npm install` in `backend`, above).

## How Changes Go Live

1. A pull request into `staging` runs both halves' type check, tests and build, plus the client's lint, and gets a Netlify deploy preview that uses the staging backend.
2. Merging it deploys both halves to staging. Once the staging site and backend both run the merged commit, QA Wolf tests it.
3. "Promote to production" (in the Actions tab) checks that QA Wolf greenlit that commit, then deploys the backend and the site from it.

## Project Status

Project is: _in progress_

## Room for Improvement

To do:

- Create content to guide students how to do it even if they are not my students
- 'LIKE' feature where students can like other students' sentences
