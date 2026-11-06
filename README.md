# Rei Codex Workbench / 绫波丽工作台

Windows 本地白蓝工作台，0.3.0 预览候选版。使用官方 Codex app-server，非官方客户端，不宣称与官方全功能一致。尚未上传或发布。

**公开版与演示不同：人物头像、人物暗纹、NERV/EVA 标志图和 OpenAI 图形已换成中性 SVG，系统播报使用明日香公开版的同一份日语录音，无背景音乐。保留白蓝布局、暖橙液体、同步圆环、确认与真实工作台交接。角色名称不代表授权。不要将本地私人素材目录上传。**

## Windows 安装与启动

1. Windows 10/11、Microsoft Edge、Node.js 20+（含 npm）；Git 面板另需较新的 Git for Windows。建议 Node.js LTS x64。node-pty 在缺少匹配预编译包时可能需要 Python 和 Visual Studio C++ Build Tools，优先使用受支持的 x64 LTS 环境。
2. 从官方渠道安装 Codex CLI，例如 `npm install -g @openai/codex`，运行 `codex --version`、`codex login` 按官方流程使用自己的账号登录。也兼容本机原生 EXE；不随包提供 Codex。CLI 必须支持 app-server 和 plugin 命令。项目内 npm 的 .bin 脚本也可用环境变量 REI_CODEX 指定。
3. 完整解压到自己的目录，在 PowerShell 确认 `node --version`、`npm --version`、`git --version`。
4. 双击 **Install-Dependencies.cmd**，或在根目录运行 `npm run setup`。依赖严格使用 workbench/package-lock.json。
5. 双击 **Start-Rei.cmd**。等待同步率到 99.2%，点击确认后进入工作台。页面左下角可打开官方登录流程，不自动授权插件或任务。
6. 添加本地项目，新对话默认只读；需要编辑时选允许项目写入。**手动终端不受聊天只读模式限制**。权限请求由用户逐次决定。

默认地址 http://127.0.0.1:43147；明日香使用43137，两者可同时运行。若端口被占用会报错，不关闭其他程序。可用 `powershell -NoProfile -ExecutionPolicy Bypass -File workbench/start.ps1 -DesktopBoot -Port 43157` 更换端口。首次启动独立目录使用新的 workbench/data 和独立 Edge 配置；Cookie 为 unit00_session，不与明日香 unit02_session 混用。Cookie 不以端口隔离，同一普通浏览器同时访问两者可能失效，因此使用各自启动器的独立配置。

仅监听127.0.0.1，不提供公网托管。GitHub Pages 不能运行本地服务。退出按钮停止本项目服务并结束终端；关闭终端面板只隐藏面板，不结束会话。

## 功能与边界

- 真实 Codex：流式聊天、图片选择/粘贴/拖入、模型与推理强度、只读/项目写入、文件变更、命令反馈、Diff、权限确认与停止。
- 本工作台创建的会话保存、重启接续、重命名、归档/恢复。尚无官方全部历史会话浏览或导入，不保证跨设备历史同步。
- PowerShell：真实 PTY、多会话、Ctrl+C、窗口尺寸适配、面板关闭后恢复。服务退出清理；强制终止/系统崩溃不保证清理所有后代进程。
- Git：仓库根目录状态、工作区/暂存区差异、暂存/取消暂存、提交、创建/切换分支、fetch、仅快进pull、push。不提供强推、reset、丢弃、自动合并或解决冲突。远端认证由本机 Git 处理；需交互认证时先在外部终端完成。
- 插件：调用官方 codex plugin list/add/remove，搜索已配置市场的插件、查看状态、安装/卸载；新对话载入变更。账号授权在官方流程完成。不提供独立启停或市场配置编辑，不保证与 ChatGPT 桌面插件同步。
- 没有自动更新、安装器、角色配音、后台系统自启动。确认卡只是视觉入口，不是身份认证。动画中的同步率不是设备诊断。

## 数据和升级

本地状态、附件、服务日志与 Edge 浏览器配置在 **workbench/data**。官方 Codex 按自身机制保存登录和官方会话，本项目不复制账号文件，也不隔离官方账号。若使用自定义 CODEX_HOME，需自行在官方流程登录；不要复制认证文件。

升级前从页面退出并确认服务停止；在本机安全位置保留旧 workbench/data，再替换程序文件并重新安装依赖。新干净发布目录不包含 data，首次不会自动导入私人历史。自定义 `-DataDirectory` 可指向自己的数据目录。不要同时让两个服务写同一数据目录。迁移失败先保留原文件，不要覆盖或删除历史；不要把 data 上传给维护者。

## 测试和许可

`npm test` 运行单元/本地Git测试。开发浏览器测试另运行 `npm ci` 安装根目录锁定的 Playwright，使用系统 Edge：`npm run test:browser`。可用 REI_EDGE_PATH 指定 Edge，REI_TEST_PORT 指定空闲端口，REI_SCREENSHOT_DIR 指定私有输出目录。

`npm run test:live` 会消耗真实模型用量，只使用新临时项目和新工作台数据，通过官方现有登录使用测试会话；出现权限请求即停，绝不自动批准。`npm run test:tools` 验证真实终端和独立 CODEX_HOME 的无联网工具测试插件，不改个人插件。REI_CODEX 可指定官方入口。测试产物不应上传。完整本次结果见 VALIDATION.md，未验证项不能当作通过。

自有代码 MIT，Copyright (c) 2026 Iris-change。参考与第三方分别见 CODE-ORIGINS.md、THIRD_PARTY_NOTICES.md、ASSETS.md；MIT 不授予角色、商标或未分发素材的权利。使用 `node verify-manifest.cjs` 核对文件哈希；MANIFEST.json 不包含自身。依赖安装后出现 node_modules 不属于发布内容。
