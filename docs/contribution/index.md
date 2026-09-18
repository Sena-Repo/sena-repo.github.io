# 贡献指南

欢迎为 Sena Repo 提交 bug 反馈、功能建议、文档修正或代码贡献。

## 开始之前

- 先搜索项目 Issues，确认是否已有相同问题或建议。
- 较大的功能改动建议先开 Issue 讨论方向。
- 代码贡献建议从 `dev` 分支创建工作分支。

## 提交代码

1. Fork [Sena-Repo](https://github.com/404-GCross/Sena-Repo)。
2. 从 `dev` 分支创建新分支。
3. 按服务端 Python / 客户端 Flutter 的现有风格修改。
4. 为有风险的行为补充测试或手动验证说明。
5. 提交 Pull Request 到 `dev` 分支。

## 本地运行

服务端：

```bash
cd server
pip install -r requirements.txt
python main.py --host 0.0.0.0 --port 11451 \
  --games-path /path/to/games \
  --data-path /path/to/data
```

客户端：

```bash
cd client
flutter pub get
flutter run
```

## 许可证

贡献内容默认采用项目相同的 AGPL-3.0 许可证。
