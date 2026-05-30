# NYC Urban Mobility Dashboard 初步设计

## 当前阶段目标

先完成课程项目的前端初步框架，使用 mock 数据还原最终大屏结构，后续再接入真实 TLC 聚合 JSON。

当前地图已接入 NYC Open Data 的 Taxi Zone GeoJSON，前端展示的区域边界是真实出租车分区；图表数值仍是 mock 聚合数据。

## 技术栈

- React
- TypeScript
- Vite
- ECharts
- lucide-react
- Python 标准库脚本入口

## 前端模块

```text
frontend/src/
  charts/       ECharts 封装与图表组件
  components/   顶部栏、筛选区、KPI、排行、面板组件
  data/         mock 数据
  pages/        Dashboard 页面
  styles/       全局大屏样式
  types/        数据类型
```

## 数据文件规划

真实 pipeline 最终应输出到 `frontend/public/data/`：

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

## 后续开发顺序

1. 下载 2025 年至最新月份的 Yellow / Green / HVFHV parquet。
2. 用 Python 逐文件清洗和聚合，不把原始记录交给前端。
3. 替换 mock 数据读取逻辑，改为加载 `frontend/public/data/*.json`。
4. 实现筛选状态联动地图、趋势图、热力图和排行表。
5. 补充 GitHub Pages 部署配置。

## 参考项目

- SaleVis：参考其大屏式布局组织方式，保留顶部概览、中心主视图、多图表区域和模块边界的设计思路。
- NYC Open Data Taxi Zones：用于真实 NYC Taxi Zone 区域地图。
