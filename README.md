# Flashcards!

This is a small offline Electron study app I am building to fit my personal preferences, combining notes, flashcards and time tracking in one place. It is a personal project and still a work in progress.

## Run locally

Install the dependencies and start the development version:

```bash
npm ci
npm start
```

## Build

Create an unpacked desktop build:

```bash
npm run package
```

On Linux, run it with:

```bash
./out/flashcards-temp-linux-x64/flashcards-temp
```

To create an installable package instead:

```bash
npm run make
```
