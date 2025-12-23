# 🎓 2025 知识竞赛模拟系统 (Serverless 版)

一个基于 **Cloudflare Pages + D1 Database** 构建的轻量级、高并发在线考试系统。无需购买服务器，零成本部署，支持万人同时在线答题。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Cloudflare-orange.svg)

## ✨ 功能特性

### 👨‍🎓 考生端
* **双模式考试**：支持“完整版”（全库抽题）和“精简版”（半库抽题）。
* **防作弊监测**：自动记录考试期间的切屏次数。
* **智能题库**：支持单选、多选、判断三种题型，随机乱序抽取。
* **历史复盘**：本地存储练习记录，可随时回看错题和完整试卷快照。
* **断点保护**：极其轻量，纯前端渲染，体验流畅。

### 👨‍🏫 管理后台
* **数据看板**：实时查看考生成绩、耗时、切屏次数及详细得分率（单/多/判）。
* **题库体检**：
    * **覆盖率分析**：自动统计哪些题目从未被考过（僵尸题）。
    * **高频错题**：自动生成 Top 20 易错题报告。
    * **异常检测**：自动发现“伪多选题”或“长选项陷阱题”。
* **数据分布**：可视化展示各题型的答案分布概率。
* **一键导出**：支持导出 Excel (CSV) 格式成绩单。

## 🛠️ 技术栈

* **前端**：原生 HTML5 / CSS3 / JavaScript (无框架依赖，极速加载)
* **后端**：Cloudflare Pages Functions (Serverless 无服务器架构)
* **数据库**：Cloudflare D1 (基于 SQLite 的边缘数据库)

## 🚀 部署指南

### 第一步：准备工作
1.  注册一个 [Cloudflare](https://dash.cloudflare.com/) 账号。
2.  将本项目 Fork 到你的 GitHub 仓库。

### 第二步：创建数据库 (D1)
1.  在 Cloudflare 后台，进入 **Workers & Pages** -> **D1**。
2.  创建一个新的数据库，命名为 `jszs_db` (或其他你喜欢的名字)。
3.  进入 **Console** 标签页，执行以下 SQL 语句初始化表结构：

```sql
CREATE TABLE results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT,
    student_id TEXT,
    score REAL,
    duration TEXT,
    correct_count INTEGER,
    submit_time TEXT,
    exam_version TEXT DEFAULT '完整版',
    switch_count INTEGER DEFAULT 0,
    stats_json TEXT
);


第三步：部署 Pages 项目
进入 Workers & Pages -> Create Application -> Pages -> Connect to Git。

选择你 Fork 的仓库。

Build settings 保持默认（Framework preset 选 None）。

点击 Save and Deploy。

第四步：绑定数据库
部署完成后，进入该 Pages 项目的 Settings -> Functions。

找到 D1 Database Bindings。

设置变量名为 DB (必须是这个名字，与代码对应)，选择刚才创建的 jszs_db。

重新部署 (Retry deployment) 以使绑定生效。

第五步：修改管理员密码
默认管理员密码在 functions/api/records.js 文件中。 为了安全，建议修改代码中的 MY_SECRET 变量：

// functions/api/records.js
const MY_SECRET = "你的复杂密码";

或者使用 Cloudflare 环境变量 ADMIN_PASSWORD (需修改对应代码逻辑)。

📂 项目结构

/
├── index.html          # 完整版考试入口
├── exam.html           # 简易版考试入口 (只抽前50%题目)
├── admin.html          # 教师管理后台 (查看成绩/分析)
├── questions_data.js   # 题库文件 (JS对象格式)
├── functions/          # 后端 API 目录
│   └── api/
│       ├── submit.js   # 提交成绩接口
│       └── records.js  # 获取成绩接口 (含鉴权)
└── analyze_db.py       # 本地题库分析脚本 (Python版)

📝 题库格式说明
questions_data.js 需遵循以下格式：

const QUESTION_DB = {
    "single": [
        { "id": "1001", "type": "single", "question": "题目内容...", "options": ["A.选项1", "B.选项2"], "answer": "A", "analysis": "解析..." }
    ],
    "multi": [...],
    "tf": [...]
};

📄 开源协议
本项目采用 MIT License 开源。 你可以免费使用、修改、分发本项目，也可用于商业用途。