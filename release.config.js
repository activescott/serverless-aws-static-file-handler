module.exports = {
  // https://github.com/semantic-release/semantic-release/blob/beta/docs/usage/configuration.md
  branches: [
    "+([0-9])?(.{+([0-9]),x}).x",
    "master",
    "next",
    "next-major",
    { name: "beta", prerelease: true },
    { name: "alpha", prerelease: true },
  ],
}
