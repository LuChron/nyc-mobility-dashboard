# NYC Urban Mobility Dashboard 可视化图表定义与数据规范

## 1. 文档目的

本文件基于以下三类材料，对项目可视化方案进行修订：

- 原始实施方案：`可视化大作业实施方案.md`
- 当前前端框架：React + ECharts 大屏布局，包含筛选区、地图、KPI、排行、趋势图、热力图、服务对比图、分布图
- 原始数据结构分析：`docs/raw_data_analysis_report.md`

目标是明确：

- 现有可视化方案是否适合真实 NYC TLC 数据。
- 哪些图表应保留，哪些图表需要调整。
- 每个图表的视觉形式、交互方式和分析任务。
- 每个图表所需的前端 JSON 数据结构。

## 2. 真实数据对可视化设计的影响

### 2.1 数据规模

当前原始数据规模为：

| 数据源 | 文件数 | 总行数 | 总大小 |
|---|---:|---:|---:|
| Yellow Taxi | 16 | 63,600,472 | 1.09 GB |
| Green Taxi | 16 | 757,466 | 18.5 MB |
| HVFHV | 16 | 327,460,054 | 7.98 GB |
| 合计 | 48 | 391,817,992 | 9.09 GB |

因此，前端不应直接读取原始 Parquet，也不应读取原始行程级 JSON。所有图表必须使用后端脚本预聚合后的轻量 JSON。

### 2.2 字段结构

三类数据源内部 schema 稳定，但跨数据源字段名不同。后续预处理必须先统一字段：

| 统一字段 | Yellow Taxi | Green Taxi | HVFHV |
|---|---|---|---|
| `source` | 固定值 `yellow` | 固定值 `green` | 固定值 `hvfhv` |
| `pickup_time` | `tpep_pickup_datetime` | `lpep_pickup_datetime` | `pickup_datetime` |
| `dropoff_time` | `tpep_dropoff_datetime` | `lpep_dropoff_datetime` | `dropoff_datetime` |
| `pickup_zone` | `PULocationID` | `PULocationID` | `PULocationID` |
| `dropoff_zone` | `DOLocationID` | `DOLocationID` | `DOLocationID` |
| `distance` | `trip_distance` | `trip_distance` | `trip_miles` |
| `duration_seconds` | 由上下车时间计算 | 由上下车时间计算 | `trip_time` |
| `fare` | `fare_amount` | `fare_amount` | `base_passenger_fare` |
| `tips` | `tip_amount` | `tip_amount` | `tips` |
| `tolls` | `tolls_amount` | `tolls_amount` | `tolls` |

### 2.3 数据质量

真实数据中存在异常时间、非正距离、负费用、无法映射到 Taxi Zone 的区域 ID。不同图表的清洗强度应不同：

| 图表类型 | 必要清洗规则 |
|---|---|
| 时间趋势、小时需求、星期小时热力图 | `pickup_time` 位于目标月份内 |
| 地图热力图 | 上车或下车区域可映射到 Taxi Zone |
| OD 流向图 | 上车和下车区域都可映射到 Taxi Zone |
| 费用分布、平均费用 | `fare >= 0` |
| 距离分布、平均距离 | `distance > 0`，极端值截断或进入最高桶 |
| 时长指标 | `duration_seconds > 0` 且不超过 24 小时 |

## 3. 现有可视化方案合理性评估

### 3.1 合理部分

当前前端大屏方案整体合理，原因如下：

- 中心地图适合承载 Taxi Zone 空间分布，是该数据最重要的空间分析入口。
- KPI 卡片可以快速概括当前筛选条件下的总量、费用、距离和高峰时段。
- Top 区域和 Top OD 路线适合呈现空间集中性与区域流动关系。
- 月趋势图适合观察 2025-01 至 2026-04 的长期变化。
- 星期 × 小时热力图适合展示出行节律差异。
- 服务类型对比适合突出 Yellow / Green / HVFHV 的结构性差异。
- 费用 / 距离分布图适合展示出行行为差异。

这些模块覆盖了实施方案中提出的时间、空间、区域流动和出行行为四类分析任务。

### 3.2 需要修改的部分

真实数据结构暴露出以下问题，需要修订设计：

1. 当前 mock 方案允许前端自由组合筛选，但真实数据量过大，必须预聚合。
2. 当前 `Source Comparison` 把 Trip Count、Avg Fare、Avg Distance 放在同一个坐标轴上，单位混杂，真实数据接入后不应这样展示。
3. 当前 `Weekday x Hour Heatmap` 使用少量示例小时，真实数据应使用完整 7 × 24 网格。
4. 当前 `Top Pickup Zones` 名称较窄，真实系统中应根据指标切换为 Top Pickup / Top Dropoff / Top Avg Fare / Top Avg Distance。
5. 当前地图同时承担区域热力和 OD 流向，真实数据下 OD 路线数量巨大，只应显示 Top N 或选中区域相关路线。
6. Green Taxi 数据量远小于 Yellow 和 HVFHV，服务对比图应避免只用绝对量导致 Green 几乎不可见，可提供比例或归一化指标。

## 4. 修订后的整体可视化方案

### 4.1 页面结构

继续保留当前一屏式大屏布局：

```text
顶部：标题 + 数据更新时间 + 总体指标
左侧：全局筛选器
中部：Taxi Zone 地图热力 + OD 流向
右侧：KPI 卡片 + Top 区域 + Top OD 路线
底部：月趋势 + 星期小时热力图 + 服务类型对比 + 费用/距离分布
```

### 4.2 全局筛选器

建议前端筛选器定义如下：

```ts
type SourceKey = 'all' | 'yellow' | 'green' | 'hvfhv';
type MetricKey = 'pickup_count' | 'dropoff_count' | 'trip_count' | 'avg_fare' | 'avg_distance';
type DayType = 'all' | 'weekday' | 'weekend';

interface FilterState {
  source: SourceKey;
  startMonth: string;      // YYYY-MM
  endMonth: string;        // YYYY-MM
  dayType: DayType;
  borough: string;         // all / Manhattan / Queens / Brooklyn / Bronx / Staten Island / EWR
  zone: string;            // all or LocationID
  metric: MetricKey;
}
```

当前前端中的 `year`、`month` 可先保留，但真实数据接入时建议改为 `startMonth` / `endMonth`，这样能更自然地支持 2025-01 至 2026-04 的连续月份范围。

## 5. 数据导出口径总则

### 5.1 文件输出位置

所有前端数据输出到：

```text
frontend/public/data/
```

### 5.2 数据源枚举

统一使用：

```text
yellow
green
hvfhv
all
```

其中 `all` 是预处理阶段由三类数据聚合得到，不建议前端临时简单相加平均值。平均费用、平均距离必须由 `sum / count` 计算。

### 5.3 通用指标字段

所有聚合文件中建议尽量保留以下指标：

```json
{
  "trip_count": 123456,
  "pickup_count": 123456,
  "dropoff_count": 120000,
  "fare_sum": 2345678.9,
  "distance_sum": 456789.1,
  "duration_sum": 9876543,
  "avg_fare": 19.02,
  "avg_distance": 3.72,
  "avg_duration_minutes": 18.4
}
```

说明：

- `avg_fare = fare_sum / fare_valid_count`
- `avg_distance = distance_sum / distance_valid_count`
- 若某图表只需要平均值，也建议保留分母，便于后续校验。

## 6. 图表一：顶部总体指标栏

### 6.1 图表形式

形式：指标卡片组。

位置：顶部标题栏右侧。

建议展示：

- 数据更新时间
- 覆盖月份
- 原始记录数
- 清洗后有效记录数

当前前端已有 `DashboardHeader`，可以继续使用。

### 6.2 分析任务

帮助用户确认当前系统加载的数据范围和数据可靠性。

### 6.3 数据文件

文件名：

```text
metadata.json
```

### 6.4 数据结构

```json
{
  "generated_at": "2026-05-30T15:03:02Z",
  "covered_months": ["2025-01", "2026-04"],
  "sources": ["yellow", "green", "hvfhv"],
  "raw_file_count": 48,
  "raw_record_count": 391817992,
  "clean_record_count": 370000000,
  "raw_size_bytes": 9089009098,
  "cleaning_summary": {
    "outside_month_rows": 561,
    "invalid_zone_rows": 15109564,
    "nonpositive_distance_rows": 1933798,
    "negative_fare_rows": 3010791,
    "nonpositive_duration_rows": 714310
  }
}
```

## 7. 图表二：KPI 指标卡片

### 7.1 图表形式

形式：4 个 KPI 卡片。

位置：右侧上方。

建议展示：

- Total Trips
- Avg Fare
- Avg Distance
- Peak Hour

当前前端已有 `KpiCard`，可继续使用。

### 7.2 分析任务

在当前筛选条件下快速判断总需求规模、平均费用、平均距离和高峰时段。

### 7.3 数据文件

文件名：

```text
summary_overview.json
```

### 7.4 数据结构

建议按筛选粒度预聚合：

```json
[
  {
    "source": "yellow",
    "month": "2025-01",
    "day_type": "weekday",
    "borough": "Manhattan",
    "zone_id": "all",
    "trip_count": 123456,
    "fare_sum": 2345678.9,
    "fare_valid_count": 120000,
    "distance_sum": 456789.1,
    "distance_valid_count": 121000,
    "duration_sum": 9876543,
    "duration_valid_count": 121000,
    "peak_hour": 17,
    "peak_hour_trip_count": 20000
  }
]
```

### 7.5 计算规则

- `Total Trips = sum(trip_count)`
- `Avg Fare = sum(fare_sum) / sum(fare_valid_count)`
- `Avg Distance = sum(distance_sum) / sum(distance_valid_count)`
- `Peak Hour` 从 `hourly_demand.json` 中按当前筛选条件取最大值更稳妥。

## 8. 图表三：Taxi Zone 地图热力图

### 8.1 图表形式

形式：ECharts GeoJSON 区域分级设色图。

位置：页面中心主视图。

编码：

- 区域颜色：当前指标值
- 区域边界：Taxi Zone GeoJSON
- hover tooltip：区域名、Borough、当前指标值
- click：设置当前选中 Taxi Zone

当前前端已有 `MobilityMapChart`，可以保留。

### 8.2 分析任务

回答：

- 不同服务类型的上车/下车热点在哪里？
- Yellow / Green / HVFHV 是否呈现不同空间集中性？
- 机场、曼哈顿核心区、外 borough 的需求差异如何？

### 8.3 数据文件

```text
taxi_zones.geojson
zone_lookup.json
zone_metrics.json
```

原实施方案中拆分为 `pickup_by_zone.json` 与 `dropoff_by_zone.json`。真实接入时建议合并为 `zone_metrics.json`，减少前端多文件同步成本。

### 8.4 `zone_lookup.json`

```json
[
  {
    "location_id": 161,
    "zone": "Midtown Center",
    "borough": "Manhattan",
    "centroid": [-73.9792, 40.7589]
  }
]
```

### 8.5 `zone_metrics.json`

```json
[
  {
    "source": "hvfhv",
    "month": "2025-01",
    "day_type": "weekday",
    "location_id": 161,
    "borough": "Manhattan",
    "pickup_count": 123456,
    "dropoff_count": 120000,
    "trip_count": 123456,
    "fare_sum": 2345678.9,
    "fare_valid_count": 123000,
    "distance_sum": 456789.1,
    "distance_valid_count": 123000,
    "avg_fare": 19.07,
    "avg_distance": 3.71
  }
]
```

### 8.6 清洗口径

- 地图热力图要求当前展示维度对应的 `LocationID` 可映射到 Taxi Zone。
- `pickup_count` 只要求 `PULocationID` 可映射。
- `dropoff_count` 只要求 `DOLocationID` 可映射。
- `avg_fare`、`avg_distance` 需过滤负费用和非正距离。

## 9. 图表四：OD 流向图

### 9.1 图表形式

形式：地图上的 ECharts `lines` 流向线，叠加在 Taxi Zone 地图上。

编码：

- 线宽：OD trip count
- 颜色：当前 source 颜色
- 动画箭头：方向
- tooltip：起点、终点、行程数、占比

当前 `MobilityMapChart` 已经支持 OD lines，建议继续使用。

### 9.2 展示规则

为避免真实 OD 组合过多，建议：

- 未选中区域时：展示当前筛选条件下 Top 30 OD。
- 选中区域时：展示与该区域相关的 Top 20 OD。
- 只显示上车和下车区域都能映射到 Taxi Zone 的记录。

### 9.3 数据文件

```text
od_top_routes.json
```

### 9.4 数据结构

```json
[
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
    "avg_distance": 15.4
  }
]
```

### 9.5 清洗口径

- 过滤无法映射的 `PULocationID` / `DOLocationID`。
- 可保留同区 OD，但图表上建议降低优先级或不绘制线，仅在排行中显示。
- Top OD 应在预处理阶段按 `source + month + day_type` 计算，前端再根据筛选合并。

## 10. 图表五：Top 区域排行

### 10.1 图表形式

形式：水平排行条。

位置：右侧中部。

当前前端组件为 `RankingList`，可继续使用。

### 10.2 设计修改

当前标题为 `Top Pickup Zones`，真实接入后建议根据当前指标动态变化：

| 当前 metric | 标题 |
|---|---|
| `pickup_count` | Top Pickup Zones |
| `dropoff_count` | Top Dropoff Zones |
| `trip_count` | Top Active Zones |
| `avg_fare` | Top Avg Fare Zones |
| `avg_distance` | Top Avg Distance Zones |

### 10.3 数据文件

直接复用：

```text
zone_metrics.json
```

前端根据当前筛选条件排序取 Top 5 或 Top 10。

### 10.4 排序规则

- 数量类指标：按值降序。
- 平均类指标：建议要求 `valid_count >= 100`，避免小样本区域因极端值冲到榜首。

## 11. 图表六：Top OD 路线排行

### 11.1 图表形式

形式：水平排行条。

位置：右侧中部，与 Top 区域排行并列。

### 11.2 分析任务

展示当前筛选条件下最主要的区域流动方向。

### 11.3 数据文件

```text
od_top_routes.json
```

### 11.4 数据结构

与地图 OD 流向图一致。

### 11.5 交互

- 点击路线后，地图中高亮该 OD。
- 若当前选中了 Taxi Zone，排行只显示与该区域相关的 OD。

## 12. 图表七：月度趋势图

### 12.1 图表形式

形式：折线图。

位置：底部左侧。

当前前端已有 `MonthlyTrendChart`，可继续使用。

### 12.2 分析任务

展示 2025-01 至 2026-04 的月度出行需求变化，并比较三类服务的趋势差异。

### 12.3 数据文件

```text
monthly_trend.json
```

### 12.4 数据结构

```json
[
  {
    "month": "2025-01",
    "borough": "all",
    "zone_id": "all",
    "source": "yellow",
    "trip_count": 3475226,
    "pickup_count": 3475226,
    "dropoff_count": 3475226,
    "fare_sum": 66280000.0,
    "fare_valid_count": 3300000,
    "distance_sum": 11000000.0,
    "distance_valid_count": 3300000
  }
]
```

### 12.5 前端转换

当前前端 `MonthlyPoint` 为：

```ts
interface MonthlyPoint {
  month: string;
  all: number;
  yellow: number;
  green: number;
  hvfhv: number;
}
```

真实接入时可在数据加载层将 long format 转为该 wide format。建议单位使用百万次：

```text
display_value = trip_count / 1_000_000
```

## 13. 图表八：星期 × 小时热力图

### 13.1 图表形式

形式：7 × 24 heatmap。

位置：底部中左。

当前前端已有 `WeekdayHeatmapChart`，但 mock 中只用了少数小时。真实接入后应改为完整 24 小时。

### 13.2 分析任务

展示不同服务在一周内的出行节律：

- 工作日通勤高峰是否明显？
- 周末夜间需求是否增强？
- HVFHV 是否比出租车更晚间活跃？

### 13.3 数据文件

```text
weekday_hour_heatmap.json
```

### 13.4 数据结构

```json
[
  {
    "source": "hvfhv",
    "month": "2025-01",
    "borough": "all",
    "zone_id": "all",
    "weekday": 0,
    "weekday_label": "Mon",
    "hour": 17,
    "trip_count": 123456,
    "pickup_count": 123456,
    "dropoff_count": 120000
  }
]
```

### 13.5 清洗口径

- 使用合法 `pickup_time` 计算 weekday 和 hour。
- 只用于时间节律时，可以不要求区域可映射。
- 若当前筛选了 borough / zone，则需要使用可映射的 `PULocationID` 进行区域过滤。

## 14. 图表九：服务类型对比图

### 14.1 当前问题

当前前端 `SourceComparisonChart` 使用 grouped bar，同时展示：

```text
Trip Count
Avg Fare
Avg Distance
```

这三个指标单位不同，真实数据接入后放在同一 y 轴上不合理。

### 14.2 修订方案

建议改为“可切换指标的服务类型对比柱状图”：

- 默认指标：Trip Share
- 可切换：Trip Count、Avg Fare、Avg Distance、Avg Duration
- 每次只展示一种单位

如果保持当前组件结构，也应将不同指标做归一化，标题明确为 `Indexed Source Comparison`。但为了可解释性，更推荐指标切换。

### 14.3 图表形式

形式：分组柱状图或单指标柱状图。

编码：

- x 轴：Yellow / Green / HVFHV
- y 轴：当前选中指标
- 颜色：服务类型

### 14.4 数据文件

```text
source_comparison.json
```

### 14.5 数据结构

```json
[
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
]
```

### 14.6 说明

由于 HVFHV 的行程量远大于 Green Taxi，若使用绝对值，Green 会非常小。因此建议同时提供：

- `trip_count`：展示绝对规模。
- `trip_share`：展示占比。
- 平均指标：展示服务行为差异。

## 15. 图表十：费用 / 距离分布图

### 15.1 图表形式

形式：分布折线图或面积折线图。

位置：底部右侧。

当前前端已有 `DistributionChart`，可继续使用。

### 15.2 分析任务

比较不同服务类型在费用和距离上的分布差异：

- HVFHV 是否长距离更多？
- Yellow Taxi 是否短途高频？
- Green Taxi 的费用/距离分布是否更偏外 borough？

### 15.3 数据文件

```text
fare_distance_distribution.json
```

### 15.4 数据结构

建议使用 long format：

```json
[
  {
    "mode": "fare",
    "source": "yellow",
    "month": "2025-01",
    "day_type": "all",
    "borough": "all",
    "zone_id": "all",
    "bucket_start": 0,
    "bucket_end": 10,
    "bucket_label": "$0-$10",
    "trip_count": 123456,
    "density": 0.031
  },
  {
    "mode": "distance",
    "source": "hvfhv",
    "month": "2025-01",
    "day_type": "all",
    "borough": "all",
    "zone_id": "all",
    "bucket_start": 0,
    "bucket_end": 1,
    "bucket_label": "0-1 mi",
    "trip_count": 234567,
    "density": 0.045
  }
]
```

### 15.5 推荐分桶

费用分桶：

```text
$0-10, $10-20, $20-30, $30-40, $40-50, $50-70, $70-100, $100+
```

距离分桶：

```text
0-1 mi, 1-2 mi, 2-3 mi, 3-5 mi, 5-8 mi, 8-12 mi, 12-20 mi, 20+ mi
```

### 15.6 清洗口径

- 费用分布过滤 `fare < 0`。
- 距离分布过滤 `distance <= 0`。
- 极端费用和极端距离进入最高桶，不建议直接丢弃。

## 16. 可选图表：小时需求曲线

### 16.1 是否保留

原实施方案列出了 `hourly_demand.json`，但当前前端没有单独的小时需求曲线组件。由于底部空间有限，建议暂不新增独立图表。

不过该数据仍建议导出，因为：

- KPI 的 Peak Hour 需要它。
- 后续可作为 tooltip 或详情弹窗数据。
- 若答辩需要展示高峰时段分析，可快速扩展。

### 16.2 数据文件

```text
hourly_demand.json
```

### 16.3 数据结构

```json
[
  {
    "source": "yellow",
    "month": "2025-01",
    "day_type": "weekday",
    "borough": "all",
    "zone_id": "all",
    "hour": 17,
    "trip_count": 123456
  }
]
```

## 17. 前端数据文件总清单

修订后建议输出以下文件：

```text
frontend/public/data/
  metadata.json
  zone_lookup.json
  taxi_zones.geojson
  summary_overview.json
  zone_metrics.json
  od_top_routes.json
  hourly_demand.json
  weekday_hour_heatmap.json
  monthly_trend.json
  fare_distance_distribution.json
  source_comparison.json
```

与原方案相比：

- `pickup_by_zone.json` 和 `dropoff_by_zone.json` 合并为 `zone_metrics.json`。
- 保留 `hourly_demand.json`，但暂不一定单独画图。
- `source_comparison.json` 改为单指标可切换的数据结构，避免混合单位。

## 18. 与当前前端类型的衔接

当前前端类型仍可作为 view model 使用，但真实 JSON 建议采用 long format。加载层负责转换：

```text
真实 JSON long format
        ↓
filter + aggregate
        ↓
DashboardViewModel
        ↓
现有 Chart Components
```

这样做的好处是：

- 图表组件改动较小。
- 数据文件结构更适合预处理脚本生成。
- 后续增加筛选条件时，不需要频繁改 JSON 文件格式。

需要调整的前端类型包括：

- `FilterState.month` 从 `q1 / q2 / h2` 改为真实月份范围。
- `HeatmapPoint.hour` 从字符串改为 `0-23` 后再格式化显示。
- `SourceComparisonChart` 增加当前比较指标参数。
- `RankingList` 标题根据当前 metric 动态变化。

## 19. 结论

现有可视化方案的总体方向是合理的，已经覆盖本项目最重要的分析任务：

- 时间变化：月趋势、星期小时热力图、Peak Hour
- 空间分布：Taxi Zone 地图热力
- 区域流动：OD 流向图、Top OD 路线
- 服务差异：服务类型对比
- 出行行为：费用 / 距离分布、平均费用、平均距离

根据真实数据结构，主要修改点不是推翻前端设计，而是重构数据规范和部分图表口径：

- 所有图表必须读取聚合 JSON。
- 三类数据源必须先统一字段。
- 地图和 OD 必须处理无法映射的区域 ID。
- 费用和距离图表必须明确异常过滤规则。
- 服务类型对比图不能混用不同单位，应改为单指标切换或归一化展示。

完成这些调整后，当前大屏设计可以较好地承载真实 NYC TLC 数据，并能形成具有分析价值的多视图联动系统。

