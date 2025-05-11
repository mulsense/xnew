module.exports = {
    preset: "ts-jest",
    verbose: true ,
    testMatch: [
        "**/test/**/*.test.ts"
    ],
    testEnvironment: "jest-environment-jsdom",
};