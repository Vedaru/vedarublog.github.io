---
title: EdgeDistillDet：为边缘设备打造的一站式小目标检测蒸馏平台
published: 2026-05-02
pinned: false
description: 从模型训练到边缘部署，让知识蒸馏不再是命令行里的黑盒。
tags: [思考, 项目]
category: 编程
draft: false
---

# 我做了一个蒸馏训练工具，因为不想一辈子对着黑漆漆的终端

> 这是 EdgeDistillDet，一个还在成长中的学习项目。

---

# 先说说我是谁

我是 Vedaru，一个大一的学生。专业背景...还在建。编程算是从高中后期才开始认真玩，之前折腾过 Discord Bot，写过一些小脚本。现在主要在啃 Python、C++，以及深度学习相关的东西。

EdgeDistillDet 是我 SDD-YOLO 项目计划的一部分——我想做一个面向工业缺陷检测的轻量框架，而这是其中第一个能跑出来的模块。

---

# 为什么要做这个东西？

事情的起因挺简单的。我在学习知识蒸馏的时候发现，几乎每一步操作都要在终端里完成：改配置、跑训练、看日志、调参数... 训练跑起来之后，我就盯着一串串滚动的数字发呆，完全不知道里面发生了什么。

更头疼的是，当你好不容易训出一个模型，想放到树莓派或者 RK 板子上试试的时候，你又得换一套完全不同的工具链去测速度、测延迟。整个流程非常割裂。

我就想：既然我要反复折腾这个流程，不如干脆写一个工具，把训练、评估、还有在边缘设备上跑分这些事情，全部串在一起，再加上一个能看得懂的界面。

于是就有了 EdgeDistillDet。

---

# EdgeDistillDet 能做什么

坦白说，它不是第一个做这件事的工具，甚至可能不是最好的。但它刚好解决了我学习过程中遇到的几个问题：

1. 用 YAML 配置文件管训练

不用改代码，改个配置文件就能换模型、换数据集、调超参数。对我这种经常需要跑对照实验的新手来说，非常友好。支持断点续训，不小心中断了也能接着跑。

```bash
edgedistilldet train --config configs/distill_config.yaml
```

2. 一键评估

训练完一键跑 Benchmark，直接出 mAP、FPS 这些指标，方便我横向对比不同蒸馏策略的效果。

```bash
edgedistilldet eval --config configs/eval_config.yaml
```

3. 边缘设备跑分

在真正往板子上烧模型之前，先看看模型在 RK3588、Ascend310 或者纯 CPU 上的表现怎么样。支持的设备列表我还在扩充。

```bash
edgedistilldet profile --weight model.pt --device rk3588
```

4. Web 界面（这是我最想做的部分）

我不想一直盯着终端看 log，所以我用 React + FastAPI 搭了一个 Web 工作台。训练进度、指标曲线、设备跑分结果，打开浏览器就能看。

这个 Web 界面里我还塞了一个 AI Agent 模块（`agent_graph` + `agent_rag`），算是我探索"AI 辅助炼丹"的一个尝试吧。虽然它现在还不够聪明，但方向我觉得是对的。

---

# 项目是怎么搭起来的

EdgeDistillDet 的代码结构长这样：

```
EdgeDistillDet/
|\
|  main.py              # CLI 入口，所有命令都从这里进
|\
|  core/
|  |-- distillation/   # 蒸馏训练的核心逻辑
|  |-- evaluation/     # 评估跑分
|  |-- detection/      # 推理封装
|\
|  web/
|  |-- app.py           # FastAPI 后端
|  |-- src/             # React 前端
|  |-- agent_graph/     # Agent 工作流
|  |-- agent_rag/       # 文档检索
|\
|  configs/             # YAML 配置
|  utils/               # 各种小工具
|  tests/               # pytest 测试
```

做这个项目的过程中，我也在学一些工程化的东西：

- 用 GitHub Actions 跑自动化检查
- 用 pre-commit 防止自己提交格式混乱的代码
- 用 pyproject.toml 管理依赖
- 写 CHANGELOG，强迫自己记录每个版本改了什么

这些都不是什么高深的技术，但我觉得养成习惯很重要。

---

# 当前的状态

代码还在快速迭代，最近几乎每天都有 commit。有些功能已经能用了，有些还在试错。如果你有耐心看完我的 commit 历史，会发现里面有不少 "Fix xxx bug"、"Refactor xxx" 的记录——这就是真实的学习过程。

---

# 怎么跑起来

```bash
# 克隆仓库
git clone https://github.com/SDD-YOLO/EdgeDistillDet.git
cd EdgeDistillDet

# 安装依赖（推荐 Python 3.12）
pip install -r requirements.txt

# 启动 Web 界面
cd web && npm ci && npm run build && cd ..
python web/app.py
# 浏览器打开 http://127.0.0.1:5000
```

---

# 我的一些想法

做这个项目的这段时间，有几个感受：

第一，边做边学比看完所有教程再做效率高得多。 我之前花了不少时间看 PyTorch 文档和 React 教程，但很多东西是直到我开始写 EdgeDistillDet 才真正理解的。

第二，工具一定要让自己用得舒服。 我做 Web 界面的初衷完全是为了解决自己的痛点。如果一个工具连你自己都不想用，那别人更不可能用了。

第三，承认自己还在学习并不可耻。 代码里肯定有写得不优雅的地方，架构肯定有可以改进的地方。但这就是过程。重要的是持续迭代。

---

# 写在最后

如果你也在学习计算机视觉，或者在折腾知识蒸馏、边缘部署这些方向，希望 EdgeDistillDet 能给你一点参考。当然，更欢迎你给我提 issue、挑 bug。

::github{repo="SDD-YOLO/EdgeDistillDet"}

觉得有意思的话，可以赏一个 Star，就当是给我这个大一新手的一点鼓励吧。

---
*本文基于 EdgeDistillDet v1.0.5 撰写。项目持续更新中，内容可能有变动。*