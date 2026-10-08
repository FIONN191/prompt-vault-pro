# Firebase 登录与桌面设置

Prompt Vault Pro 1.0.16 增加「账号与设置」。离线访客仍可使用全部本地功能；账号登录不会自动上传、隔离或清除这台设备的提示词。不同账号目前共用本机素材库，切换账号也不会切换素材库。GitHub 登录和 GitHub Secret Gist 备份是独立配置。

## 当前发行版配置

已创建专用 Firebase 项目 `prompt-vault-pro-fionn-261008`，Web 应用为 `Prompt Vault Pro Desktop`，使用 Spark 免费方案。Google 和 GitHub 已在认证提供商中启用，授权域包含 `127.0.0.1`。GitHub OAuth 应用位于 `https://github.com/settings/applications/3914672`，其 Secret 仅保存在 Firebase 控制台。

Apple 暂未启用：用户目前没有 Apple Developer Program 账号。界面显示「Apple 登录 · 未启用」，后续在 Apple/Firebase 配置完成后，可在应用项目配置中勾选 Apple。

## 项目配置

在 Firebase 项目中注册 Web 应用，将公开 `apiKey`、`projectId`、`authDomain`、`appId` 填入应用「账号与设置 → Firebase 项目配置」。仅支持项目默认的 `<projectId>.firebaseapp.com` 认证域。也可以在打包前添加 `electron/firebase-public.json`，只包含以上四个公开字段，作为发行版的默认配置。个人账号凭据不应写进这个文件。

在 Authentication 的授权域中添加 `127.0.0.1`，因为桌面应用会在随机端口启动一次性的 loopback 登录页面。开发者如需单独测试网页，可再添加 `localhost`。新 Firebase 项目不一定默认允许本地域名。

在 Authentication → Sign-in method 中配置：

- **Google**：启用 Google，选择支持邮箱。
- **GitHub**：在 GitHub Developer Settings 注册 OAuth App；Authorization callback URL 为 `https://<projectId>.firebaseapp.com/__/auth/handler`。Client ID / Client Secret 只填 Firebase 控制台，不进入客户端、仓库或提示词备份。
- **Apple**：需要 Apple Developer Program 账号、启用 Sign in with Apple 的 App ID、关联的 Services ID、Team ID、Key ID 和 Sign in with Apple 私钥。回调同上；在 Firebase 控制台配置，不把私钥打包进应用。

供应商未启用、授权域缺失或网络失败时，浏览器登录页面会显示原因。三个按钮接入真实 Firebase SDK，但没有完成供应商配置前，不能把按钮存在视为真实账号登录已可用。

官方文档：[Google](https://firebase.google.com/docs/auth/web/google-signin)、[GitHub](https://firebase.google.com/docs/auth/web/github-auth)、[Apple](https://firebase.google.com/docs/auth/web/apple)。

## 登录数据流

1. 主窗口通过受限 IPC 请求选定的 Google / GitHub / Apple 登录；快速面板不能读写账号配置或凭据。
2. 主进程在 `127.0.0.1` 随机端口提供打包在 `dist-auth` 的 Firebase SDK 登录页面，并用系统浏览器打开带一次性随机值的页面。随机值在页面读取后从地址栏清除。
3. 用户点击浏览器里的继续按钮，Firebase SDK 通过官方弹窗完成 OAuth。浏览器 Firebase 会话只保存在内存中。
4. 回传必须满足 Host、同源 Origin 和一次性 Bearer 值校验。主进程检查项目绑定，再调用 Google `accounts:lookup` 验证 ID Token 和用户，不能仅靠解析 JWT 声称已认证。
5. Refresh Token 经 Electron `safeStorage` 加密后保存为用户目录下的 `firebase-session.enc`。渲染器只获得用户摘要，不获得 token。浏览器页收到成功回复后清除其内存会话。
6. 重启时使用 Firebase Secure Token API 刷新并重新检查用户。断网显示离线缓存账号；认证失效要求重登。取消、5 分钟超时和应用退出都会关闭回调服务。

配置存于用户目录 `firebase-config.json`，不进入提示词 JSON 导出。退出登录清除本机的加密会话，但不会退出浏览器本身的 Google / GitHub / Apple 账号，也不会删除本机提示词。

## 开机自启

Mac / Windows 安装版首次启动默认注册登录项。以后用户在应用或系统关闭自启，应用不强制重开。开机登录时主窗口隐藏，只出现悬浮球。用户正常打开应用时仍显示主窗口。

开发模式、网页预览、带 `--user-data-dir` 的隔离测试实例不会注册登录项，避免把测试程序加入系统启动。应用显示实际读取的系统状态；注册失败显示错误。Mac 发行版目前只有本地 ad-hoc 签名，未进行 Developer ID 公证，最终启动行为需要在目标机器验证。Windows 使用系统登录项 API 和 `--startup` 参数。

## 构建与验证

`npm run build` 构建主界面和独立登录页；`npm run dist` 随安装包一起包含二者。

```
node --test tests/account-settings.test.cjs
node tests/settings-desktop-smoke.cjs
```

桌面 smoke 测试需可用的 Playwright、Electron 和 Chrome。测试使用独立用户目录，验证配置、系统浏览器登录页面、取消、IPC 边界、主题和面板入口；不会访问个人素材库、注册真实登录项或自动完成第三方账号授权。单元测试使用模拟的 Google API，仅用于验证回调/加密/恢复逻辑，不代表真实供应商端到端测试。
