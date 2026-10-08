require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const prisma = require('../db/database');

function readSqliteRows(database, table, orderBy = '') {
  return new Promise((resolve, reject) => {
    database.all(`SELECT * FROM "${table}" ${orderBy}`, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Legacy SQLite database contains invalid JSON data.');
  }
}

function parseDate(value) {
  if (!value) return undefined;
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Legacy SQLite database contains an invalid timestamp: ${value}`);
  }
  return date;
}

function optionalCreatedAt(value) {
  const createdAt = parseDate(value);
  return createdAt ? { createdAt } : {};
}

async function assertMySqlIsEmpty() {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.vehicle.count(),
    prisma.configuratorStep.count(),
    prisma.configuratorOption.count(),
    prisma.inquiry.count(),
    prisma.galleryItem.count()
  ]);
  if (counts.some((count) => count > 0)) {
    throw new Error('Target MySQL database is not empty. Import is aborted to avoid overwriting existing records.');
  }
}

async function importDatabase() {
  const configuredPath = process.env.LEGACY_SQLITE_PATH;
  if (!configuredPath) {
    throw new Error('Set LEGACY_SQLITE_PATH to the stopped application’s SQLite database file before importing.');
  }
  const sqlitePath = path.resolve(configuredPath);
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`Legacy SQLite database file not found: ${sqlitePath}`);
  }

  const source = await new Promise((resolve, reject) => {
    const database = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });

  try {
    const [users, products, vehicles, steps, options, inquiries, gallery] = await Promise.all([
      readSqliteRows(source, 'users'),
      readSqliteRows(source, 'products'),
      readSqliteRows(source, 'vehicles'),
      readSqliteRows(source, 'configurator_steps'),
      readSqliteRows(source, 'configurator_options', 'ORDER BY rowid ASC'),
      readSqliteRows(source, 'inquiries'),
      readSqliteRows(source, 'gallery')
    ]);

    await prisma.$connect();
    await assertMySqlIsEmpty();

    const optionSortOrders = new Map();
    await prisma.$transaction(async (tx) => {
      if (users.length) await tx.user.createMany({
        data: users.map((row) => ({
          id: row.id,
          username: row.username || 'Administrator',
          email: (row.email || '').trim().toLowerCase(),
          passwordHash: row.password_hash,
          role: row.role || 'admin',
          ...optionalCreatedAt(row.created_at)
        }))
      });
      if (products.length) await tx.product.createMany({
        data: products.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          price: Number(row.price || 0),
          description: row.description || '',
          features: parseJson(row.features_json, []),
          imageUrl: row.image_url || '/08.png',
          ...optionalCreatedAt(row.created_at)
        }))
      });
      if (vehicles.length) await tx.vehicle.createMany({
        data: vehicles.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          years: row.years || '',
          description: row.description || '',
          features: parseJson(row.features_json, []),
          specifications: parseJson(row.specs_json, {}),
          gallery: parseJson(row.gallery_json, []),
          ...optionalCreatedAt(row.created_at)
        }))
      });
      if (steps.length) await tx.configuratorStep.createMany({
        data: steps.map((row) => ({
          id: row.id,
          order: Number(row.step_order),
          title: row.title,
          description: row.description || '',
          icon: row.icon_name || ''
        }))
      });
      if (options.length) await tx.configuratorOption.createMany({
        data: options.map((row) => {
          const sortOrder = optionSortOrders.get(row.step_id) || 0;
          optionSortOrders.set(row.step_id, sortOrder + 1);
          return {
            id: row.id,
            stepId: row.step_id,
            sortOrder,
            name: row.name,
            description: row.description || '',
            price: Number(row.price || 0),
            features: parseJson(row.features_json, [])
          };
        })
      });
      if (inquiries.length) await tx.inquiry.createMany({
        data: inquiries.map((row) => ({
          id: row.id,
          clientName: row.client_name || 'Anonymous Client',
          email: row.email || '',
          phone: row.phone || '',
          notes: row.notes || '',
          selectedOptions: parseJson(row.selected_options_json, {}),
          totalEstimate: Number(row.total_estimate || 0),
          status: row.status || 'New',
          ...optionalCreatedAt(row.created_at)
        }))
      });
      if (gallery.length) await tx.galleryItem.createMany({
        data: gallery.map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          imageUrl: row.image_url,
          description: row.description || '',
          vehicleTag: row.vehicle_tag || 'All Vehicles',
          ...optionalCreatedAt(row.created_at)
        }))
      });
    }, { maxWait: 10000, timeout: 120000 });

    console.log(`Imported ${users.length} users, ${products.length} products, ${vehicles.length} vehicles, ${steps.length} steps, ${options.length} options, ${inquiries.length} inquiries, and ${gallery.length} gallery items.`);
  } finally {
    await new Promise((resolve, reject) => {
      source.close((error) => error ? reject(error) : resolve());
    });
  }
}

importDatabase()
  .catch((error) => {
    console.error('SQLite import failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
