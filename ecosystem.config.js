module.exports = {
  apps: [{
    name: "deno_deploy_server",
    script: ' ',
    interpreter: "deno",
    interpreter_args: "run --allow-net --allow-env --allow-write --allow-read --allow-run --importmap https://deno-mirror.uino.cn/https/deno.land/x/deno_deploy_server@v1.0.0/import_map_proxy.json --unstable  https://deno-mirror.uino.cn/https/deno.land/x/deno_deploy_server@v1.0.0/mod.ts"
  }]
};
