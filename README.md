# NYC Urban Mobility Dashboard

基于 NYC TLC Trip Record Data 的城市出行可视化大屏项目。

当前阶段先完成前端骨架与 mock 数据展示，后续通过 Python pipeline 生成静态 JSON 后接入真实数据。

## 运行前端

```bash
cd frontend
npm install
npm run dev
```

## 构建检查

```bash
cd frontend
npm run build
```

## 数据 pipeline

当前脚本先提供稳定入口和轻量 mock 导出，避免直接下载大体量 parquet 文件。

```bash
python scripts/run_pipeline.py --mock
```

地图使用 NYC Open Data 的官方 Taxi Zone GeoJSON，可用下面命令重新获取：

```bash
python scripts/fetch_taxi_zones.py
```

后续接入真实数据时，按以下流程扩展：

```text
download_data.py -> preprocess_trips.py -> export_frontend_json.py
```

生成结果输出到：

```text
frontend/public/data/
```

原始数据保存在 `data/raw/`，不提交到 Git。

## 目录结构

```text
docs/       项目文档
scripts/    数据下载、预处理与导出脚本
data/       本地数据目录，原始大文件不提交
frontend/   React + Vite 单页应用
```

## 当前完成情况

- React + TypeScript + Vite 前端骨架
- 一屏式城市出行大屏布局
- 左侧筛选区、主地图、KPI、排行和底部图表占位
- 官方 NYC Taxi Zone GeoJSON 地图
- 筛选状态联动 KPI、地图、排行和底部图表
- ECharts mock 聚合数据图表
- 数据 pipeline 入口和前端静态数据目录
