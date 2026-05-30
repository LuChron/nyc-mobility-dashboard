# NYC TLC 原始数据结构分析报告

## 1. 数据检查范围

本报告分析 `data/raw/` 目录下已经下载完成的 NYC TLC Trip Record Parquet 文件。当前数据覆盖：

- 时间范围：`2025-01` 至 `2026-04`
- 数据源：Yellow Taxi、Green Taxi、HVFHV
- 文件数量：48 个 Parquet 文件
- 数据规模：391,817,992 条记录
- 文件体积：约 9.09 GB

按数据源汇总如下：

| 数据源 | 文件数 | 总行数 | 总大小 | Schema 是否稳定 |
|---|---:|---:|---:|---|
| Yellow Taxi | 16 | 63,600,472 | 1.09 GB | 是，20 列完全一致 |
| Green Taxi | 16 | 757,466 | 18.5 MB | 是，21 列完全一致 |
| HVFHV | 16 | 327,460,054 | 7.98 GB | 是，25 列完全一致 |
| 合计 | 48 | 391,817,992 | 9.09 GB | 分数据源稳定 |

## 2. 各数据源字段结构

### 2.1 Yellow Taxi

Yellow Taxi 每行是一条黄色出租车行程记录，主要字段包括：

```text
VendorID
tpep_pickup_datetime
tpep_dropoff_datetime
passenger_count
trip_distance
RatecodeID
store_and_fwd_flag
PULocationID
DOLocationID
payment_type
fare_amount
extra
mta_tax
tip_amount
tolls_amount
improvement_surcharge
total_amount
congestion_surcharge
Airport_fee
cbd_congestion_fee
```

其中，与后续可视化最相关的字段为：

- 时间字段：`tpep_pickup_datetime`、`tpep_dropoff_datetime`
- 空间字段：`PULocationID`、`DOLocationID`
- 出行行为字段：`trip_distance`、`passenger_count`
- 费用字段：`fare_amount`、`tip_amount`、`tolls_amount`、`total_amount`
- 辅助分类字段：`payment_type`、`RatecodeID`、`VendorID`

### 2.2 Green Taxi

Green Taxi 与 Yellow Taxi 结构非常接近，但上下车时间字段使用 `lpep` 前缀，并包含 `trip_type`、`ehail_fee` 等绿色出租车相关字段。

```text
VendorID
lpep_pickup_datetime
lpep_dropoff_datetime
store_and_fwd_flag
RatecodeID
PULocationID
DOLocationID
passenger_count
trip_distance
fare_amount
extra
mta_tax
tip_amount
tolls_amount
ehail_fee
improvement_surcharge
total_amount
payment_type
trip_type
congestion_surcharge
cbd_congestion_fee
```

其中，与后续可视化最相关的字段为：

- 时间字段：`lpep_pickup_datetime`、`lpep_dropoff_datetime`
- 空间字段：`PULocationID`、`DOLocationID`
- 出行行为字段：`trip_distance`、`passenger_count`
- 费用字段：`fare_amount`、`tip_amount`、`tolls_amount`、`total_amount`
- 辅助分类字段：`payment_type`、`RatecodeID`、`trip_type`

### 2.3 HVFHV

HVFHV 表示 High Volume For-Hire Vehicle，主要对应 Uber / Lyft 等高容量网约车服务。其字段结构与 Yellow / Green Taxi 差异较大，更偏向网约车平台调度记录。

```text
hvfhs_license_num
dispatching_base_num
originating_base_num
request_datetime
on_scene_datetime
pickup_datetime
dropoff_datetime
PULocationID
DOLocationID
trip_miles
trip_time
base_passenger_fare
tolls
bcf
sales_tax
congestion_surcharge
airport_fee
tips
driver_pay
shared_request_flag
shared_match_flag
access_a_ride_flag
wav_request_flag
wav_match_flag
cbd_congestion_fee
```

其中，与后续可视化最相关的字段为：

- 时间字段：`request_datetime`、`on_scene_datetime`、`pickup_datetime`、`dropoff_datetime`
- 空间字段：`PULocationID`、`DOLocationID`
- 出行行为字段：`trip_miles`、`trip_time`
- 费用字段：`base_passenger_fare`、`tips`、`tolls`、`driver_pay`
- 服务分类字段：`hvfhs_license_num`、`dispatching_base_num`
- 行为特征字段：`shared_request_flag`、`shared_match_flag`、`wav_request_flag`、`wav_match_flag`

## 3. 文件间结构一致性

### 3.1 同一数据源内部

同一数据源内部结构非常稳定：

- Yellow Taxi 的 16 个文件字段完全一致。
- Green Taxi 的 16 个文件字段完全一致。
- HVFHV 的 16 个文件字段完全一致。

这说明后续可以按数据源分别建立固定字段映射规则，然后逐月批量处理。

### 3.2 不同数据源之间

不同数据源之间字段并不完全一致。严格共同字段只有：

```text
PULocationID
DOLocationID
congestion_surcharge
cbd_congestion_fee
```

不过，三类数据源都具备支撑本项目核心可视化任务的共同语义字段，包括时间、上车区域、下车区域、距离和费用。后续需要在预处理阶段建立统一 schema。

建议统一映射如下：

| 统一字段 | Yellow Taxi | Green Taxi | HVFHV |
|---|---|---|---|
| `source` | 固定值 `yellow` | 固定值 `green` | 固定值 `hvfhv` |
| `pickup_time` | `tpep_pickup_datetime` | `lpep_pickup_datetime` | `pickup_datetime` |
| `dropoff_time` | `tpep_dropoff_datetime` | `lpep_dropoff_datetime` | `dropoff_datetime` |
| `pickup_zone` | `PULocationID` | `PULocationID` | `PULocationID` |
| `dropoff_zone` | `DOLocationID` | `DOLocationID` | `DOLocationID` |
| `distance` | `trip_distance` | `trip_distance` | `trip_miles` |
| `duration` | 由上下车时间计算 | 由上下车时间计算 | `trip_time` 或由上下车时间计算 |
| `fare` | `fare_amount` | `fare_amount` | `base_passenger_fare` |
| `tips` | `tip_amount` | `tip_amount` | `tips` |
| `tolls` | `tolls_amount` | `tolls_amount` | `tolls` |
| `total_amount` | `total_amount` | `total_amount` | 可由费用字段组合，或使用 `base_passenger_fare` 作为近似 |

## 4. 数据质量初步分析

### 4.1 时间字段

整体来看，HVFHV 的时间字段最规整，所有记录的 `pickup_datetime` 均落在对应文件月份范围内。

Yellow Taxi 和 Green Taxi 中存在少量时间异常记录：

| 数据源 | 时间超出文件月份 | 占比 |
|---|---:|---:|
| Yellow Taxi | 268 | 0.0004% |
| Green Taxi | 293 | 0.0387% |
| HVFHV | 0 | 0.0000% |

Yellow Taxi 的最早上车时间出现到 `2001-01-01`，Green Taxi 的最早上车时间出现到 `2008-12-31`，这些明显不是目标时间范围内的有效记录。后续清洗时应按文件月份或项目时间范围过滤。

### 4.2 区域字段

三类数据源的 `PULocationID` 和 `DOLocationID` 均没有空值，说明区域字段完整性较好。

但存在部分不适合直接映射到 Taxi Zone GeoJSON 的区域编号，例如 264、265 等 unknown / outside NYC 区域。初步统计如下：

| 数据源 | 区域 ID 超出 1-263 的记录 | 占比 |
|---|---:|---:|
| Yellow Taxi | 466,193 | 0.7330% |
| Green Taxi | 11,943 | 1.5767% |
| HVFHV | 14,631,428 | 4.4682% |

后续地图可视化时，需要对这些记录单独处理：

- 若绘制 Taxi Zone 地图，可过滤无法映射的区域。
- 若做总量统计，可保留并归入 `Unknown / Outside NYC`。
- 若做 OD 流向分析，建议只保留上车和下车都能映射到 Taxi Zone 的记录。

### 4.3 距离字段

三类数据源中均存在非正距离记录：

| 数据源 | 非正距离记录 | 占比 |
|---|---:|---:|
| Yellow Taxi | 1,866,306 | 2.9344% |
| Green Taxi | 30,148 | 3.9801% |
| HVFHV | 37,344 | 0.0114% |

此外，存在少量距离超过 100 miles 的记录：

| 数据源 | 距离超过 100 miles | 占比 |
|---|---:|---:|
| Yellow Taxi | 3,501 | 0.0055% |
| Green Taxi | 248 | 0.0327% |
| HVFHV | 28,904 | 0.0088% |

后续建议：

- 计算平均距离、距离分布时过滤 `distance <= 0`。
- 极端长距离可保留用于异常分析，但在常规分布图中建议截断或单独归入最高区间。

### 4.4 费用字段

Yellow Taxi 存在较多负费用记录：

| 数据源 | 负费用记录 | 占比 |
|---|---:|---:|
| Yellow Taxi | 2,949,856 | 4.6381% |
| Green Taxi | 2,225 | 0.2937% |
| HVFHV | 58,710 | 0.0179% |

Yellow Taxi 的负费用比例明显高于其他数据源，可能对应退款、冲正、异常计费或特殊账单记录。后续在费用类图表中应谨慎处理。

建议：

- `fare < 0` 的记录不参与平均费用、费用分布计算。
- 可以在 metadata 中记录过滤数量。
- 如果时间允许，可将负费用作为异常现象单独分析，但不建议混入常规费用统计。

### 4.5 时长字段

三类数据源中均存在少量非正时长记录：

| 数据源 | 非正时长记录 | 占比 |
|---|---:|---:|
| Yellow Taxi | 700,040 | 1.1007% |
| Green Taxi | 2,037 | 0.2689% |
| HVFHV | 12,233 | 0.0037% |

此外，Yellow / Green 中存在极少数超过 24 小时的行程记录。常规出行行为分析中应过滤这些异常时长。

## 5. 对数据清洗与可视化的影响

### 5.1 有利因素

当前数据非常适合支撑本项目的交互式城市出行可视化：

- 数据规模大，共约 3.92 亿条记录，满足课程对复杂数据规模的要求。
- 数据具有明确时空属性，可支持时间趋势、小时需求、星期节律、区域热力、OD 流向等多视图分析。
- 三类服务类型差异明显，适合比较出租车与网约车在空间分布、时间节律和费用距离上的差异。
- 同一数据源内部 schema 稳定，适合逐月批处理。
- Parquet 格式支持按列读取，后续可以只读取必要字段，避免一次性加载全量数据。

### 5.2 需要处理的问题

后续清洗和可视化前必须解决以下问题：

- 三类数据源字段名不同，需要统一 schema。
- HVFHV 数据量非常大，不能在前端或普通 pandas 全量加载。
- Yellow / Green 中存在少量异常时间，需要按目标月份过滤。
- 存在无法映射到 Taxi Zone GeoJSON 的区域 ID，需要过滤或归为 Unknown。
- 存在非正距离、负费用、非正时长等异常记录，需要按图表用途过滤。
- 前端只应读取聚合 JSON，而不是直接读取原始 Parquet。

## 6. 推荐清洗策略

### 6.1 统一字段

建议在预处理阶段统一输出如下中间字段：

```text
source
month
pickup_time
dropoff_time
pickup_zone
dropoff_zone
distance
duration_minutes
fare
tips
tolls
total_amount
```

### 6.2 基础过滤规则

建议基础清洗规则如下：

```text
pickup_time 必须位于对应文件月份内
dropoff_time 必须大于 pickup_time
duration_minutes 应大于 0 且不超过 24 小时
pickup_zone / dropoff_zone 应能映射到 Taxi Zone，或单独归为 Unknown
distance 应大于 0
fare 应大于等于 0
```

对于不同图表，可采用不同过滤强度：

- 区域热力图：重点要求 `pickup_zone` 或 `dropoff_zone` 可映射。
- OD 流向图：要求 `pickup_zone` 和 `dropoff_zone` 都可映射。
- 时间趋势图：重点要求时间字段合法。
- 费用 / 距离分布图：应过滤负费用、非正距离和极端异常值。

## 7. 推荐导出数据

后续应从原始 Parquet 聚合导出前端静态 JSON，建议包括：

```text
metadata.json
zone_lookup.json
taxi_zones.geojson
summary_overview.json
pickup_by_zone.json
dropoff_by_zone.json
od_top_routes.json
hourly_demand.json
weekday_hour_heatmap.json
monthly_trend.json
fare_distance_distribution.json
source_comparison.json
```

这些文件应为聚合后的轻量数据，不应包含原始行程明细。

## 8. 结论

当前下载的数据质量和结构总体良好，完全可以支撑后续数据清洗、聚合与可视化开发。

最重要的判断是：

- 数据规模足够大，分析价值充分。
- 同一数据源内部结构稳定，便于批处理。
- 跨数据源字段存在差异，但可通过统一 schema 解决。
- 数据中存在一定比例异常记录，但类型明确，清洗规则可以较清晰地制定。
- 后续开发应重点放在高效聚合和轻量 JSON 输出上，避免前端直接接触原始 Parquet。

