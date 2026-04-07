module.exports = {
  apps: [
    {
      name: "edreading",
      cwd: "/www/wwwroot/EDReading",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
