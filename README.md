# 网文大神模拟器

一个基于 React + TypeScript + Vite 的长篇网文创作辅助工具。项目围绕“先出大纲、再写正文、持续扩章”的创作流程构建，支持官方 Gemini 和兼容接口两种大模型接入方式。

## 功能概览

- 输入小说设定，生成整书摘要、世界观、人物设定和前 10 章章节大纲
- 在大纲页手动编辑主线、人物与章节细纲
- 按章节流式生成正文内容，并自动生成下一章所需摘要
- 根据现有剧情继续续写后续章节大纲
- 导出已完成章节为 `.txt`
- 在浏览器本地保存当前大模型配置，并支持一键恢复项目默认值

## 技术栈

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- `@google/genai`
- Base UI
- `node:test`

## 项目结构

```text
src/
  components/
    outline/               # 大纲页拆分组件
    setup/                 # 配置页拆分组件
    ui/                    # 通用基础 UI
    writing/               # 写作页拆分组件
    OutlineScreen.tsx
    SetupScreen.tsx
    WritingScreen.tsx
  domain/
    novel/types.ts         # 小说领域类型
  lib/
    compatible-interface.ts # 兼容接口协议与请求执行
    gemini-provider.ts      # Gemini SDK 专属调用
    llm-settings.ts         # Provider 配置与默认值
    novel-generation.ts     # 创作业务逻辑与 provider 分发
    gemini.ts               # 兼容导出入口
  store/
    types.ts               # Store 类型
    reducer.ts             # 纯 reducer
    persistence.ts         # localStorage 持久化
    index.tsx              # Store Provider 与导出
vite.proxy.ts             # 本地/预览代理，转发兼容接口请求
```

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 创建本地环境文件，例如 `.env.local`

3. 启动开发服务器

```bash
npm run dev
```

4. 常用检查命令

```bash
npm run lint
npm run build
node --import tsx --test src/lib/__tests__/gemini.test.ts
node --import tsx --test src/lib/__tests__/llm-settings.test.ts
node --import tsx --test src/lib/__tests__/compatible-interface.test.ts
```

## 环境变量

界面中的模型配置会优先读取以下默认值；用户在浏览器内修改后的值会写入 `localStorage`，直到点击“重置为当前默认值”。

```env
VITE_DEFAULT_PROVIDER=gemini

VITE_GEMINI_API_KEY=
VITE_GEMINI_OUTLINE_MODEL=gemini-3.1-pro-preview
VITE_GEMINI_CHAPTER_MODEL=gemini-3.1-pro-preview
VITE_GEMINI_SUMMARY_MODEL=gemini-3-flash-preview

VITE_OPENAI_BASE_URL=https://xiaohumini.site/v1/chat/completions
VITE_OPENAI_API_KEY=
VITE_OPENAI_OUTLINE_MODEL=gpt-5.4
VITE_OPENAI_CHAPTER_MODEL=gpt-5.4
VITE_OPENAI_SUMMARY_MODEL=gpt-5.4
```

补充说明：

- `VITE_DEFAULT_PROVIDER` 支持 `gemini` 和 `compatible`
- `VITE_OPENAI_*` 目前是“兼容接口”模式的默认变量名，兼容历史配置
- `VITE_OPENAI_BASE_URL` 需要填写完整上游端点，例如 `/v1/chat/completions` 或 `/v1/responses`

## Provider 模式

### 官方 Gemini

- 通过 `@google/genai` 直接请求 Gemini
- `src/lib/gemini-provider.ts` 只负责 Gemini SDK 调用
- 适合直接使用 Google 官方接口

### 兼容接口

- 通过 `src/lib/compatible-interface.ts` 组装请求体、识别协议并执行请求
- 支持 `Chat Completions`、`Responses` 和 `auto`
- `auto` 会优先根据 URL 末尾是否包含 `/chat/completions` 或 `/responses` 判断协议

### 为什么有 `vite.proxy.ts`

兼容接口模式下，浏览器不能安全地直接把目标 URL 和 API Key 发给第三方端点，因此项目通过本地 `/api/llm-proxy` 转发请求：

- 前端把目标地址和 API Key 通过本地自定义头传给代理
- 代理再以标准 JSON 请求体转发给上游模型服务
- 这样可以减少浏览器侧 CORS 和预检问题

## 数据持久化

- 小说配置、大纲、章节内容保存在 React Store 运行态中
- 大模型设置单独持久化到 `localStorage`
- 存储 key 为 `novel-ai-creator:llm-settings`
- 如果当前设置和项目默认值一致，Store 会自动清理本地缓存，避免冗余覆盖

## 测试说明

当前仓库的自动化验证主要覆盖三块：

- `gemini.test.ts`：大纲解析容错
- `llm-settings.test.ts`：默认值、兼容旧配置、Store 重置与持久化
- `compatible-interface.test.ts`：兼容协议识别、请求结构与响应提取

`npm run lint` 实际执行的是 `tsc --noEmit`，用于做整仓 TypeScript 类型校验。

## 开发约定

- 新的小说领域类型统一放在 `src/domain/novel`
- Provider 相关逻辑不要混写：Gemini 专属调用和兼容接口协议分开维护
- Screen 组件负责页面级状态与动作编排，复杂 UI 区块优先下沉到子组件
- 如果新增兼容接口能力，优先补 `compatible-interface.test.ts`
- 如果调整 Store 行为，优先补 `llm-settings.test.ts`

## 常见问题

### 兼容接口为什么还保留 `openai` 命名的环境变量？

这是为了兼容历史配置和已有部署环境，当前运行时语义已经统一到“兼容接口”。

### 为什么改了环境变量，页面里没有立刻生效？

因为页面中的大模型设置会被浏览器本地缓存覆盖。点击“重置为当前默认值”后，会重新回到当前项目环境变量对应的默认值。

### 构建时出现 chunk size warning 要处理吗？

目前不是功能性错误，只是 Vite 的体积提示。只要 `npm run build` 成功即可。
