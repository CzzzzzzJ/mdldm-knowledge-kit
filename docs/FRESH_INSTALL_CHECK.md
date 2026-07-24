# 全新环境安装验收

## v0.1.0

验收时间：2026-07-24

远端提交：`f116a23fd24dc11831abafd9b86fadbe136f8121`

### 环境

- macOS 26.5.2 / arm64；
- Node.js 22.23.1；
- npm 10.9.8；
- MongoDB 8.2.1；
- ffmpeg 8.0.1。

验收从 GitHub `main` 新建浅克隆，不复用原工作区的 `node_modules`、构建目录或 Git 对象。数据库使用本机 MongoDB 中新建的 `mdldm_knowledge_kit_fresh_install`；由于本机 `27017` 已被 MongoDB 服务占用，没有重复启动 Docker Compose。Docker 镜像下载时间不计入以下结果。

### 实测耗时

| 步骤 | 结果 | 耗时 |
| --- | --- | ---: |
| `git clone --depth 1` | 通过 | 5.53 秒 |
| `npm ci` | 安装 461 个包，0 漏洞 | 7.11 秒 |
| `npm run check-config` | Mock/Local/Console 配置通过 | 1.25 秒 |
| `npm run create-admin` | 创建虚构管理员 | 2.29 秒 |
| `npm run seed-demo` | 1 系列、3 课时、2 商品 | 5.20 秒 |
| `npm run check` | Lint、类型、40 单测、生产构建通过 | 64.26 秒 |
| `npm run release:audit` | 204 文件、576 依赖记录通过 | 0.29 秒 |
| 生产启动与深度健康检查 | 首页 200、MongoDB `ok`、版本 `0.1.0` | 0.42 秒 |

合计约 **86.35 秒**，低于 15 分钟目标。正式 Release 前的原工作区另行完成 7/7 E2E，覆盖课程媒体、身份与密码、邀请码、双支付模式、幂等权益、运营失败队列和数据导出。

### 清理

验收后已停止临时服务，删除 3 个只含虚构数据的隔离数据库，并将全新克隆目录移入本机废纸篓。未修改或删除任何原有业务数据库。

### 结论

README 的无付费 Provider 本地路径可用，Phase 6 的 15 分钟安装门槛通过。若端口 `27017` 已被其他 MongoDB 占用，应复用该服务或先释放端口，再执行 `docker compose up -d mongodb`。
