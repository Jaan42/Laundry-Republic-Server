const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const method = req.method;
  const requestPath = req.path;

  res.on("finish", () => {
    const elapsedMilliseconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.log(
      `${method} ${requestPath} ${res.statusCode} ${elapsedMilliseconds.toFixed(2)}ms`,
    );
  });

  next();
};

module.exports = requestLogger;
