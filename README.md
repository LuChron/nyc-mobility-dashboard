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

### 下载真实 TLC 原始数据

下载脚本只负责拉取原始 Parquet 文件，不做字段选择、清洗或聚合。默认数据源包括 Yellow / Green / HVFHV，默认起始月份为 `2025-01`，`--end latest` 会自动探测三个数据源共同可用的最新月份。

先预览下载计划：

```bash
python scripts/download_data.py --start 2025-01 --end latest --sources all --dry-run
```

确认后开始下载：

```bash
python scripts/download_data.py --start 2025-01 --end latest --sources all
```

脚本默认不使用 CloudFront HEAD 探测，避免下载前被 `403 Forbidden` 误判为文件不存在。若需要在下载前额外检查远端文件并估算大小，可以增加 `--check-remote`：

```bash
python scripts/download_data.py --start 2025-01 --end 2025-01 --sources all --dry-run --check-remote
```

也可以只下载某个月或某个数据源用于测试：

```bash
python scripts/download_data.py --start 2026-04 --end 2026-04 --sources green
```

下载结果会保存到 `data/raw/<source>/`，并生成 `data/raw/download_manifest.json`。已完整存在的文件会自动跳过；如需重新下载，可增加 `--force`。

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
