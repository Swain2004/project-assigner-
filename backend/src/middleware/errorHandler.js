function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({ message: 'A record with this information already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record not found' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 50MB' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.message?.includes('File type') && err.message?.includes('is not allowed')) {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ message });
}

module.exports = { errorHandler };
