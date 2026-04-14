# GMC NoSQL Database Design — E-Commerce Application

Designing NoSQL databases based on multiple requirement views: scalability, consistency, availability, and specific use case queries.

## Project Structure

```
├── schemas/
│   ├── initial/           # Part 1: Initial schema design
│   │   ├── products.json       # Product catalog schema
│   │   ├── users.json          # User schema
│   │   ├── orders.json         # Order schema
│   │   └── indexes.json        # Index definitions
│   └── refactored/        # Part 2: Refactored schema
│       ├── products.json       # Sharded product catalog
│       ├── users.json          # Replicated user data
│       ├── orders.json         # Denormalized orders with analytics
│       ├── analytics.json     # Pre-aggregated analytics collections
│       └── indexes.json        # Updated index definitions
├── scripts/
│   ├── setup-initial.js       # MongoDB setup script (initial)
│   ├── setup-refactored.js    # MongoDB setup script (refactored)
│   ├── seed-data.js           # Sample data seeding
│   └── benchmark.js           # Performance benchmark queries
└── REFLECTION.md               # Short reflection report
```

## Part 1: Initial Design

**NoSQL Model:** Document-based (MongoDB)

**Key Entities:**
- Products — frequently queried, needs full-text search
- Users — customer profiles for order association
- Orders — high write throughput, must ensure consistency

**Design Decisions:**
- Products stored as documents with embedded category/tags for fast lookups
- Orders stored as documents with embedded line items (avoid joins)
- Users stored separately (referenced from orders)
- Text indexes on product name/description for search
- Compound indexes on order status + date for dashboard queries

## Part 2: Refactored Design

**New Requirements:**
- Large-scale analytical queries (product trends, sales data)
- High availability and partition tolerance (CAP theorem: AP)

**Refactoring Strategy:**
- **Sharding**: Products sharded by category, orders sharded by date
- **Replication**: 3-node replica sets across availability zones
- **Denormalization**: Pre-aggregated analytics collections for fast reporting

## Setup

```bash
# Install dependencies
npm install mongodb

# Run initial schema setup
node scripts/setup-initial.js

# Run refactored schema setup
node scripts/setup-refactored.js

# Seed sample data
node scripts/seed-data.js

# Run benchmarks
node scripts/benchmark.js
```

## Author

Emmanuel — GMC Software Engineering Master's Program