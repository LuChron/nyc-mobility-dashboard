# NYC Urban Mobility Dashboard

基于 NYC TLC Trip Record Data 的城市出行可视化大屏项目。

当前阶段先完成前端骨架与 mock 数据展示，后续通过 Python pipeline 生成静态 JSON 后接入真实数据。

## 运行前端

```bash
cd frontend
npm install
npm run dev
```

## 目录结构

```text
docs/       项目文档
scripts/    数据下载、预处理与导出脚本
data/       本地数据目录，原始大文件不提交
frontend/   React + Vite 单页应用
```

