---
title: "EdgeDistillDet: a one-stop distillation platform for small-object detection on edge devices"
published: 2026-05-02
pinned: false
description: From model training to edge deployment, so knowledge distillation stops being a black box in the terminal.
tags: [reflection, project]
category: Programming
draft: false
---

# I built a distillation training tool because I did not want to stare at a pitch-black terminal forever

> This is EdgeDistillDet, a learning project that is still growing.

---

# First, who am I

I am Vedaru, a first-year undergraduate. My academic background... still under construction. I only got serious about programming late in high school; before that I tinkered with a Discord bot and wrote some small scripts. These days I mostly chew on Python, C++ and deep learning.

EdgeDistillDet is part of my SDD-YOLO project plan: I want to build a lightweight framework for industrial defect detection, and this is the first module that actually runs.

---

# Why build this?

The origin is simple. While learning knowledge distillation I found that almost every step happened in the terminal: edit config, run training, read logs, tune parameters... Once training started I would stare blankly at scrolling numbers with no idea what was happening inside.

Worse, once you finally train a model and want to try it on a Raspberry Pi or an RK board, you have to switch to a completely different toolchain to measure speed and latency. The whole flow is fragmented.

So I thought: since I am going to repeat this loop anyway, why not write a tool that strings training, evaluation and edge benchmarking together, with an interface you can actually read.

That is how EdgeDistillDet came about.

---

# What EdgeDistillDet does

Honestly, it is not the first tool to do this, and possibly not the best. But it solves a few problems I ran into while learning:

1. Manage training with YAML configs

No code changes: swap models, datasets and hyperparameters from a config file. Very friendly for a beginner like me who constantly needs to run comparisons. It supports resuming from a checkpoint, so an accidental interruption is recoverable.

```bash
edgedistilldet train --config configs/distill_config.yaml
```

2. One-command evaluation

Run the benchmark after training and get mAP and FPS directly, which makes it easy to compare distillation strategies.

```bash
edgedistilldet eval --config configs/eval_config.yaml
```

3. Edge device profiling

Before actually flashing a model onto a board, see how it performs on an RK3588, an Ascend 310 or plain CPU. The supported device list is still growing.

```bash
edgedistilldet profile --weight model.pt --device rk3588
```

4. A web interface (the part I most wanted)

I did not want to keep watching terminal logs, so I built a web workbench with React + FastAPI. Training progress, metric curves, device benchmark results: open the browser and see them.

I also put an AI agent module in there (`agent_graph` + `agent_rag`), as an attempt at "AI-assisted alchemy". It is not smart enough yet, but I think the direction is right.

---

# How the project is put together

EdgeDistillDet's code structure looks like this:

```
EdgeDistillDet/
|\
|  main.py              # CLI entry point, every command starts here
|\
|  core/
|  |-- distillation/   # the core distillation training logic
|  |-- evaluation/     # evaluation and benchmarking
|  |-- detection/      # inference wrappers
|\
|  web/
|  |-- app.py           # FastAPI backend
|  |-- src/             # React frontend
|  |-- agent_graph/     # agent workflow
|  |-- agent_rag/       # document retrieval
|\
|  configs/             # YAML configs
|  utils/               # assorted utilities
|  tests/               # pytest tests
```

Building this project also taught me some engineering practice:

- Running automated checks with GitHub Actions
- Using pre-commit to stop myself committing badly formatted code
- Managing dependencies with pyproject.toml
- Writing a CHANGELOG, forcing myself to record what changed in each version

None of that is deep technology, but I think the habits matter.

---

# Current state

The code is still changing fast; lately there are commits almost every day. Some features work, some are still trial and error. If you are patient enough to read my commit history you will find a fair number of "Fix xxx bug" and "Refactor xxx" entries: that is what real learning looks like.

---

# How to run it

```bash
# Clone the repository
git clone https://github.com/SDD-YOLO/EdgeDistillDet.git
cd EdgeDistillDet

# Install dependencies (Python 3.12 recommended)
pip install -r requirements.txt

# Start the web interface
cd web && npm ci && npm run build && cd ..
python web/app.py
# Open http://127.0.0.1:5000 in your browser
```

---

# Some thoughts

A few things I felt while building this:

First, learning while building is far more efficient than finishing every tutorial first. I spent a lot of time on PyTorch docs and React tutorials, but a lot of it only really landed once I started writing EdgeDistillDet.

Second, a tool has to be comfortable for you to use. I built the web interface purely to solve my own pain. If you do not want to use your own tool, nobody else will.

Third, admitting you are still learning is not shameful. There are certainly inelegant parts of the code and aspects of the architecture that could be improved. That is the process. What matters is iterating.

---

# Last words

If you are also learning computer vision, or grappling with knowledge distillation and edge deployment, I hope EdgeDistillDet gives you something useful. And of course, issues and bug reports are even more welcome.

::github{repo="SDD-YOLO/EdgeDistillDet"}

If it looks interesting, a Star would be a lovely bit of encouragement for a first-year beginner.

---
*Written against EdgeDistillDet v1.0.5. The project keeps changing, so details may differ.*
