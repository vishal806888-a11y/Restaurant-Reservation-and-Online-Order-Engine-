export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ message: "Something went wrong on the server" });
}
