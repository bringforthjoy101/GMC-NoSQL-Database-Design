// Initial Schema Setup for E-Commerce NoSQL Database (MongoDB)
// Run: node scripts/setup-initial.js

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ecommerce_initial';

async function setup() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`Setting up initial schema in "${DB_NAME}"...`);

  // Create collections with validation
  await db.createCollection('products', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'price', 'category', 'sku'],
        properties: {
          name: { bsonType: 'string' },
          description: { bsonType: 'string' },
          price: { bsonType: 'double', minimum: 0 },
          category: { bsonType: 'string' },
          tags: { bsonType: 'array', items: { bsonType: 'string' } },
          sku: { bsonType: 'string' },
          stock: { bsonType: 'int', minimum: 0 },
          imageUrl: { bsonType: 'string' },
          attributes: { bsonType: 'object' },
          ratings: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ products collection created');

  await db.createCollection('users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'firstName', 'lastName'],
        properties: {
          email: { bsonType: 'string' },
          firstName: { bsonType: 'string' },
          lastName: { bsonType: 'string' },
          phone: { bsonType: 'string' },
          addresses: { bsonType: 'array' },
          paymentMethods: { bsonType: 'array' },
          preferences: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ users collection created');

  await db.createCollection('orders', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['orderId', 'userId', 'items', 'totals', 'status'],
        properties: {
          orderId: { bsonType: 'string' },
          userId: { bsonType: 'objectId' },
          customerSnapshot: { bsonType: 'object' },
          items: { bsonType: 'array' },
          totals: { bsonType: 'object' },
          shippingAddress: { bsonType: 'object' },
          status: { enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
          statusHistory: { bsonType: 'array' },
          payment: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ orders collection created');

  // Create indexes
  const products = db.collection('products');
  await products.createIndex({ category: 1, price: -1 }, { name: 'idx_category_price' });
  await products.createIndex({ sku: 1 }, { unique: true, name: 'idx_sku_unique' });
  await products.createIndex({ name: 'text', description: 'text' }, { name: 'idx_text_search' });
  await products.createIndex({ tags: 1 }, { name: 'idx_tags' });
  await products.createIndex({ stock: 1 }, { name: 'idx_stock', partialFilterExpression: { stock: { $lte: 10 } } });
  await products.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  console.log('  ✓ product indexes created');

  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' });
  await users.createIndex({ firstName: 1, lastName: 1 }, { name: 'idx_name' });
  console.log('  ✓ user indexes created');

  const orders = db.collection('orders');
  await orders.createIndex({ orderId: 1 }, { unique: true, name: 'idx_orderId_unique' });
  await orders.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_user_date' });
  await orders.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_date' });
  await orders.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  await orders.createIndex({ 'items.productId': 1 }, { name: 'idx_product_sales' });
  console.log('  ✓ order indexes created');

  console.log('\nInitial schema setup complete!');
  await client.close();
}

setup().catch(err => { console.error('Setup failed:', err); process.exit(1); });