require('dotenv').config();

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { initializeDatabase } = require('./src/database');
const apiRoutes = require('./src/routes');

const app = express();
const port = Number(process.env.PORT || 3000);
initializeDatabase();

app.use(helmet({
  // Three.js และ flipbook โหลดจาก CDN; CSP ที่จำกัดเกินไปจะບລັອກໄຟລ໌ເຫຼົ່ານັ້ນ.
  contentSecurityPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(error.status || 500).json({ error: error.publicMessage || 'serverError' });
});

app.listen(port, () => console.log(`3D e-book library: http://localhost:${port}`));
