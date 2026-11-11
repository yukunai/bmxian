# Bmxian / 斑马线

面向电商和自媒体的多模型创作台，支持文字、图像、视频和模板。

## 安装

需要 Node.js 与 pnpm。

克隆仓库后，在项目根目录执行以下步骤。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## 使用

打开 http://localhost:3000。选择创作路线、模型或 Skill，输入素材生成草稿。需要真实模型时，根据 .env.example 配置自己的服务。

## 检查

```sh
pnpm typecheck
```

## 说明

仓库包含源码与启动所需的示例。模型、平台或推送服务的凭据由使用者在本机配置。
