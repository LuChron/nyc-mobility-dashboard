# NYC Mobility Dashboard 数据清洗记录与图表数据结构定义

## 第一部分：数据清洗过程记录

### 1. 处理目标

本次处理的目标是将 `data/raw/` 中的 NYC TLC 原始 Parquet 行程数据清洗、标准化并聚合为前端可直接读取的静态 JSON 文件。

处理后的 JSON 输出目录为：

```text
frontend/public/data/
```

本次处理遵循一个核心原则：前端只读取聚合数据，不直接读取原始 Parquet，也不读取行程级明细。

### 2. 实际执行命令

本次实际执行的数据处理命令为：

```bash
python scripts/preprocess_trips.py --threads 6 --memory-limit 10GB --od-top-n 300
```

脚本实现位置：

```text
scripts/preprocess_trips.py
```

处理方式：

- 使用 DuckDB 逐个读取 Parquet 文件。
- 每次只处理一个月、一个数据源的文件。
- 将每个文件的清洗结果追加到 DuckDB 中间聚合表。
- 全部文件处理完成后，从中间聚合表导出前端 JSON。

这样做可以避免一次性将 3.9 亿行数据加载进 Python 内存。

### 3. 原始数据范围

本次处理覆盖：

- 时间范围：`2025-01` 至 `2026-04`
- 月份数量：16
- 数据源：Yellow Taxi、Green Taxi、HVFHV
- 原始 Parquet 文件数：48
- 原始数据体积：9,089,009,098 bytes，约 9.09 GB
- 原始记录总量：391,817,992

按数据源统计：

| 数据源 | 原始记录数 | 时间清洗后记录数 | OD 清洗后记录数 |
|---|---:|---:|---:|
| Yellow Taxi | 63,600,472 | 62,899,692 | 59,633,162 |
| Green Taxi | 757,466 | 755,134 | 665,094 |
| HVFHV | 327,460,054 | 327,446,414 | 289,226,756 |
| 合计 | 391,817,992 | 391,101,240 | 349,525,012 |

说明：

- 时间清洗后记录数用于时间趋势、小时需求、星期小时热力图、总体指标等图表。
- OD 清洗后记录数用于 OD 流向图和 Top OD 路线，要求上车和下车区域均能映射到 Taxi Zone，且排除同一区域内部流动。

### 4. 字段统一思路

三类数据源字段名不同，但都能映射到统一字段：

| 统一字段 | Yellow Taxi | Green Taxi | HVFHV |
|---|---|---|---|
| `source` | 固定值 `yellow` | 固定值 `green` | 固定值 `hvfhv` |
| `month` | 文件月份 | 文件月份 | 文件月份 |
| `pickup_time` | `tpep_pickup_datetime` | `lpep_pickup_datetime` | `pickup_datetime` |
| `dropoff_time` | `tpep_dropoff_datetime` | `lpep_dropoff_datetime` | `dropoff_datetime` |
| `pickup_zone` | `PULocationID` | `PULocationID` | `PULocationID` |
| `dropoff_zone` | `DOLocationID` | `DOLocationID` | `DOLocationID` |
| `distance` | `trip_distance` | `trip_distance` | `trip_miles` |
| `duration_seconds` | 上下车时间差 | 上下车时间差 | `trip_time` |
| `fare` | `fare_amount` | `fare_amount` | `base_passenger_fare` |
| `tips` | `tip_amount` | `tip_amount` | `tips` |
| `tolls` | `tolls_amount` | `tolls_amount` | `tolls` |

### 5. 清洗规则

本次采用分层清洗口径，不同图表使用不同强度的有效记录。

#### 5.1 时间有效记录

时间有效记录要求：

```text
pickup_time 所在月份必须等于文件月份
dropoff_time 必须晚于 pickup_time
duration_seconds 必须大于 0
duration_seconds 必须不超过 24 小时
```

该口径用于：

- 顶部 KPI
- 月度趋势图
- 小时需求
- 星期小时热力图
- 服务类型对比
- 费用 / 距离分布

#### 5.2 空间区域有效记录

地图区域统计使用 Taxi Zone GeoJSON 中存在的 `LocationID`。

规则：

```text
pickup_count 要求 PULocationID 能映射到 Taxi Zone
dropoff_count 要求 DOLocationID 能映射到 Taxi Zone
```

该口径用于：

- Taxi Zone 地图热力图
- Top 区域排行

#### 5.3 OD 有效记录

OD 流向图和 Top OD 路线要求：

```text
PULocationID 能映射到 Taxi Zone
DOLocationID 能映射到 Taxi Zone
PULocationID != DOLocationID
```

同一区域内部行程不绘制为 OD 线，避免地图上线段不可见或解释困难。

#### 5.4 费用和距离指标

费用和距离类指标采用局部过滤：

```text
fare < 0 的记录不参与 fare_sum 和 avg_fare
distance <= 0 的记录不参与 distance_sum 和 avg_distance
```

但这些记录不会从所有计数图表中整体删除。这样可以避免因为费用或距离异常影响出行需求统计。

### 6. 异常数据统计

本次处理记录到的主要异常如下：

| 异常类型 | 记录数 |
|---|---:|
| pickup_time 不在文件月份内 | 561 |
| 非正时长 | 715,717 |
| 时长超过 24 小时 | 475 |
| 上车区域无法映射到 Taxi Zone | 225,948 |
| 下车区域无法映射到 Taxi Zone | 15,113,402 |
| 非正距离 | 1,933,798 |
| 距离超过 100 miles | 32,653 |
| 负费用 | 3,010,791 |
| 费用超过 500 美元 | 9,607 |

这些异常没有全部采用同一种删除规则，而是按照图表语义分层处理。

### 7. 生成的 JSON 文件

本次实际生成的 JSON 文件及数据量如下：

| 文件名 | 数据量 | 用途 |
|---|---:|---|
| `metadata.json` | 1 个对象 | 数据范围、清洗统计、元信息 |
| `zone_lookup.json` | 263 行 | Taxi Zone 名称、borough、中心点 |
| `summary_overview.json` | 192 行 | KPI 与总体摘要 |
| `zone_metrics.json` | 48,745 行 | 地图热力图与 Top 区域排行 |
| `pickup_by_zone.json` | 48,745 行 | 兼容旧方案，内容同 `zone_metrics.json` |
| `dropoff_by_zone.json` | 48,745 行 | 兼容旧方案，内容同 `zone_metrics.json` |
| `od_top_routes.json` | 57,600 行 | 地图 OD 线与 Top OD 路线 |
| `monthly_trend.json` | 64 行 | 月度趋势 |
| `hourly_demand.json` | 4,608 行 | 小时需求与 Peak Hour |
| `weekday_hour_heatmap.json` | 10,752 行 | 星期 × 小时热力图 |
| `source_comparison.json` | 144 行 | 服务类型对比 |
| `fare_distance_distribution.json` | 3,072 行 | 费用 / 距离分布 |

## 第二部分：各图表数据结构定义

### 1. 最终可视化方案

最终大屏采用一屏式多视图布局：

```text
顶部：项目标题 + 数据更新时间 + 覆盖月份 + 总体指标
左侧：全局筛选器
中部：Taxi Zone 地图热力图 + OD 流向线
右侧：KPI 卡片 + Top 区域排行 + Top OD 路线排行
底部：月度趋势 + 星期小时热力图 + 服务类型对比 + 费用/距离分布
```

该方案覆盖四类核心分析任务：

- 时间差异：月度趋势、小时需求、星期小时热力图
- 空间差异：Taxi Zone 地图热力图、Top 区域排行
- 区域流动：OD 流向线、Top OD 路线排行
- 出行行为：平均费用、平均距离、费用/距离分布、服务类型对比

### 2. 全局筛选器

推荐前端筛选状态：

```ts
type SourceKey = 'all' | 'yellow' | 'green' | 'hvfhv';
type DayType = 'all' | 'weekday' | 'weekend';
type MetricKey = 'pickup_count' | 'dropoff_count' | 'trip_count' | 'avg_fare' | 'avg_distance';

interface FilterState {
  source: SourceKey;
  startMonth: string;
  endMonth: string;
  dayType: DayType;
  borough: string;
  zone: string;
  metric: MetricKey;
}
```

本次导出的数据支持：

- `source`
- `month`
- `day_type`
- `borough = all`
- `zone_id = all`
- 地图区域级 `location_id`

当前版本主要聚合到全市层级与 Taxi Zone 层级。若后续需要 borough 级趋势，可在现有脚本基础上增加 borough 维度聚合。

### 3. `metadata.json`

用途：顶部数据范围说明、清洗统计说明、文档复现信息。

结构：

```json
{
  "generated_at": "2026-05-30T17:02:22Z",
  "mode": "real",
  "covered_months": ["2025-01", "2026-04"],
  "month_count": 16,
  "sources": ["yellow", "green", "hvfhv"],
  "raw_file_count": 48,
  "raw_size_bytes": 9089009098,
  "taxi_zone_count": 263,
  "totals": {},
  "by_source": [],
  "by_source_month": [],
  "cleaning_rules": {}
}
```

实际生成：1 个对象。

### 4. `zone_lookup.json`

用途：为地图、OD、排行提供区域名称、borough 和中心点。

结构：

```json
{
  "location_id": 161,
  "zone": "Midtown Center",
  "borough": "Manhattan",
  "centroid": [-73.9792, 40.7589]
}
```

实际生成：263 行。

### 5. KPI 卡片：`summary_overview.json`

适用图表：

- 顶部 / 右侧 KPI 卡片
- Total Trips
- Avg Fare
- Avg Distance
- Peak Hour

结构：

```json
{
  "source": "yellow",
  "month": "2025-01",
  "day_type": "weekday",
  "borough": "all",
  "zone_id": "all",
  "trip_count": 123456,
  "fare_sum": 2345678.9,
  "fare_valid_count": 120000,
  "distance_sum": 456789.1,
  "distance_valid_count": 121000,
  "duration_sum": 9876543.0,
  "duration_valid_count": 121000,
  "avg_fare": 19.07,
  "avg_distance": 3.72,
  "avg_duration_minutes": 18.4,
  "peak_hour": 17,
  "peak_hour_trip_count": 20000
}
```

实际生成：192 行。

使用方式：

- 按 `source + month + day_type` 过滤。
- 多月份范围由前端累加 `sum` 后重新计算平均值。
- `avg_fare` 不应直接跨月平均，应使用 `sum(fare_sum) / sum(fare_valid_count)`。
- `avg_distance` 不应直接跨月平均，应使用 `sum(distance_sum) / sum(distance_valid_count)`。

### 6. 地图热力图与 Top 区域：`zone_metrics.json`

适用图表：

- Taxi Zone 地图热力图
- Top Pickup Zones
- Top Dropoff Zones
- Top Avg Fare Zones
- Top Avg Distance Zones

结构：

```json
{
  "source": "hvfhv",
  "month": "2025-01",
  "day_type": "all",
  "location_id": 161,
  "borough": "Manhattan",
  "pickup_count": 123456,
  "dropoff_count": 120000,
  "trip_count": 123456,
  "fare_sum": 2345678.9,
  "fare_valid_count": 123000,
  "distance_sum": 456789.1,
  "distance_valid_count": 123000,
  "duration_sum": 9876543.0,
  "duration_valid_count": 123000,
  "avg_fare": 19.07,
  "avg_distance": 3.71,
  "avg_duration_minutes": 18.2
}
```

实际生成：48,745 行。

说明：

- `pickup_by_zone.json` 和 `dropoff_by_zone.json` 当前作为兼容文件保留，内容与 `zone_metrics.json` 相同。
- 地图颜色由当前 `metric` 决定。
- 选择 `pickup_count` 时使用 `pickup_count`。
- 选择 `dropoff_count` 时使用 `dropoff_count`。
- 选择平均指标时应避免样本量过小的区域，可在前端设置最小 `fare_valid_count` 或 `distance_valid_count`。

### 7. OD 流向图与 Top OD：`od_top_routes.json`

适用图表：

- 地图上的 OD 流向线
- Top OD Routes 排行

结构：

```json
{
  "source": "yellow",
  "month": "2025-01",
  "day_type": "weekday",
  "from_location_id": 161,
  "to_location_id": 132,
  "from_zone": "Midtown Center",
  "to_zone": "JFK Airport",
  "from_borough": "Manhattan",
  "to_borough": "Queens",
  "from_centroid": [-73.9792, 40.7589],
  "to_centroid": [-73.7781, 40.6413],
  "trip_count": 12840,
  "avg_fare": 48.2,
  "avg_distance": 15.4,
  "avg_duration_minutes": 42.1
}
```

实际生成：57,600 行。

生成规则：

- 对每个 `source + month + day_type` 保留 Top 300 OD。
- 包含 `source = all` 的聚合结果。
- 只保留上车和下车区域都能映射到 Taxi Zone 的记录。
- 排除 `from_location_id == to_location_id` 的同区内部流动。

前端建议：

- 未选择区域时显示 Top 30。
- 选择区域后显示与该区域相关的 Top 20。

### 8. 月度趋势图：`monthly_trend.json`

适用图表：

- Monthly Trend 折线图

结构：

```json
{
  "source": "all",
  "month": "2025-01",
  "borough": "all",
  "zone_id": "all",
  "trip_count": 123456,
  "fare_sum": 2345678.9,
  "fare_valid_count": 120000,
  "distance_sum": 456789.1,
  "distance_valid_count": 121000,
  "avg_fare": 19.07,
  "avg_distance": 3.72,
  "avg_duration_minutes": 18.4
}
```

实际生成：64 行。

说明：

- 包含 `yellow`、`green`、`hvfhv`、`all` 四类 source。
- 每类 source 覆盖 16 个月。
- 前端可将 `trip_count / 1_000_000` 显示为百万行程。

### 9. 小时需求：`hourly_demand.json`

适用用途：

- KPI 中的 Peak Hour
- 可选小时需求曲线
- 辅助 tooltip / details-on-demand

结构：

```json
{
  "source": "hvfhv",
  "month": "2025-01",
  "day_type": "weekday",
  "borough": "all",
  "zone_id": "all",
  "hour": 17,
  "trip_count": 123456
}
```

实际生成：4,608 行。

说明：

- `hour` 范围为 `0-23`。
- 包含 `day_type = all / weekday / weekend`。

### 10. 星期 × 小时热力图：`weekday_hour_heatmap.json`

适用图表：

- Weekday × Hour Heatmap

结构：

```json
{
  "source": "yellow",
  "month": "2025-01",
  "borough": "all",
  "zone_id": "all",
  "weekday": 0,
  "weekday_label": "Mon",
  "hour": 17,
  "trip_count": 123456
}
```

实际生成：10,752 行。

说明：

- `weekday` 使用 `0-6` 表示 Monday 到 Sunday。
- `hour` 使用 `0-23`。
- 每个 `source + month` 形成完整 7 × 24 网格。

### 11. 服务类型对比：`source_comparison.json`

适用图表：

- Source Comparison

最终方案：

- 不再把 Trip Count、Avg Fare、Avg Distance 混在同一个 y 轴。
- 改为单指标切换的服务类型对比图。
- 可选指标包括：`trip_count`、`trip_share`、`avg_fare`、`avg_distance`、`avg_duration_minutes`。

结构：

```json
{
  "source": "yellow",
  "month": "2025-01",
  "day_type": "all",
  "borough": "all",
  "zone_id": "all",
  "trip_count": 3475226,
  "trip_share": 0.145,
  "avg_fare": 19.07,
  "avg_distance": 6.64,
  "avg_duration_minutes": 18.2
}
```

实际生成：144 行。

说明：

- 只包含 `yellow`、`green`、`hvfhv` 三类源。
- 不包含 `source = all`，因为该图用于比较服务类型。
- `trip_share` 是同一月份、同一 day_type 下该 source 占三类服务总量的比例。

### 12. 费用 / 距离分布：`fare_distance_distribution.json`

适用图表：

- Fare / Distance Distribution

结构：

```json
{
  "mode": "fare",
  "source": "yellow",
  "month": "2025-01",
  "day_type": "all",
  "borough": "all",
  "zone_id": "all",
  "bucket_start": 10,
  "bucket_end": 20,
  "bucket_label": "$10-$20",
  "trip_count": 123456,
  "density": 0.031
}
```

实际生成：3,072 行。

费用分桶：

```text
$0-$10
$10-$20
$20-$30
$30-$40
$40-$50
$50-$70
$70-$100
$100+
```

距离分桶：

```text
0-1 mi
1-2 mi
2-3 mi
3-5 mi
5-8 mi
8-12 mi
12-20 mi
20+ mi
```

说明：

- `mode = fare` 时，过滤 `fare < 0`。
- `mode = distance` 时，过滤 `distance <= 0`。
- `density = 当前 bucket trip_count / 当前 source-month-day_type 总有效数量`。

## 13. 前端接入建议

前端接入时建议使用一个数据加载层，将这些 long-format JSON 转换为当前图表组件需要的 view model：

```text
frontend/public/data/*.json
        ↓
loadDashboardData()
        ↓
applyFilters()
        ↓
DashboardViewModel
        ↓
ECharts components
```

重点注意：

- 多月筛选时，数量类指标直接求和。
- 平均类指标不要直接平均平均值，必须用 `sum / valid_count` 重算。
- Top 区域排行应根据当前 metric 动态切换标题与排序字段。
- 服务类型对比图应改为单指标切换，避免不同单位混用。
- OD 图只渲染 Top N，避免地图过载。

