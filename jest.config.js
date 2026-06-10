module.exports = {
    preset: "ts-jest",
    verbose: true ,
    testMatch: [
        "**/test/**/*.test.ts"
    ],
    testEnvironment: "jest-environment-jsdom",
    // addons（xsocket 等）が import する '@mulsense/xnew'（公開パッケージ）をソースへ解決する。
    // ビルド済み dist を介さず、テストと同一の xnew インスタンスを共有する。
    moduleNameMapper: {
        "^@mulsense/xnew$": "<rootDir>/src/index.ts",
    },
};