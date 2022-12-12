# deno_deploy_server

[![deno version](https://img.shields.io/badge/deno-^1.26.1-green?logo=deno)](https://github.com/denoland/deno)

## 安装插件

在当前工程执行：

```
deno run  --allow-write https://deno.land/x/jw_cli@v0.5.0/cli/git_hook.ts
```

## vscode开启deno插件

在应用商店查找`deno`插件，安装使用。

## 运行

```
deno task dev
```

## 锁定依赖

```
deno task cache
```

## 校验

```shell
deno lint
```

## 格式化

```shell
deno fmt
```

建议开发时，开启`vscode`自动格式化。

## 生成git日志文件

```
npm install -g conventional-changelog-cli
conventional-changelog -p angular -i CHANGELOG.md -s -r 0
```

如果只是添加：

```
conventional-changelog -p angular -i CHANGELOG.md -s
```

现使用`deno task log`来调用上述命令。
