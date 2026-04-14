# Reflection Report

## Challenges During the Schema Refactor

The biggest challenge was balancing consistency against availability and performance. When I added sharding for scalability, maintaining transactional consistency across shards became difficult — MongoDB doesn't support multi-document transactions across shards efficiently, so I had to design each document to be self-contained. Denormalizing customer snapshots and product categories into orders solved the cross-shard join problem but introduced data duplication. Keeping that duplicated data in sync when users change their details or products get updated requires background sync processes that add complexity.

Another challenge was deciding on sharding keys. Products sharded by category (hashed) distribute well but make cross-category queries slower since they hit multiple shards. Orders sharded by date (ranged) keep recent data together for fast dashboard queries but risk creating hot shards if recent orders concentrate on a single shard during peak traffic.

## How New Requirements Affected Design Decisions

The analytics requirement forced me to add pre-aggregated collections (dailySales, productDailyMetrics, categoryMonthlyMetrics) to avoid running expensive aggregation pipelines on the live orders collection. This denormalization trades storage for query speed — analytics queries now hit small, pre-computed collections instead of scanning millions of order documents.

The high availability requirement pushed the design toward an AP-focused architecture (CAP theorem). I chose 3-node replica sets with majority write concern for orders (consistency still matters for payment status) but secondary-preferred reads for users and analytics (where eventual consistency is acceptable). This means during a partition, the system stays available for reads even if the primary is unreachable.

## How the Refactor Improved the System

**Scalability**: Sharding products by category and orders by date distributes write load across nodes. The system can now handle thousands of transactions per second by scaling horizontally instead of relying on a single server's resources.

**Availability**: Three-node replica sets across availability zones ensure the system survives node failures. Secondary-preferred reads for non-critical data reduce load on the primary, improving overall throughput during traffic spikes.

**Query Performance**: Pre-aggregated analytics collections reduce complex aggregation queries from minutes to milliseconds. Adding `salesMetrics` to products and `orderSummary` to users eliminates runtime joins for common queries like "top sellers" and "high-value customers." The analytics indexes on the refactored schema specifically target the new reporting requirements, making dashboard queries dramatically faster.