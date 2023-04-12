import { Injectable, type ReadableStreamResult } from "oak_nest";
import { UpgradeDto } from "./app.dto.ts";
import globals from "./globals.ts";
import * as fs from "std/node/fs/promises.ts";
import { exec } from "std/node/child_process.ts";
import { BadRequestException } from "oak_exception";
import { Logger } from "./tools/log.ts";
import { readYaml } from "./tools/utils.ts";
import { walk } from "std/fs/mod.ts";

const ignore_re = /(redis|mongo|postgres|mysql|mariadb|elasticsearch)/;
const SEPARATOR_LINE = `------------------------------------------------`;
enum DeployType {
  Deployment = "deployment",
  Config = "config",
  Service = "service",
  Ingress = "ingress",
  Job = "job",
  Namespace = "namespace",
}

type FileTypeStrategy = {
  pattern: RegExp;
  type: DeployType;
};

const fileTypeStrategies: FileTypeStrategy[] = [
  { pattern: /deployment\.yaml$/, type: DeployType.Deployment },
  { pattern: /config\.yaml$/, type: DeployType.Config },
  { pattern: /service\.yaml$/, type: DeployType.Service },
  { pattern: /ingress\.yaml$/, type: DeployType.Ingress },
  { pattern: /job\.yaml$/, type: DeployType.Job },
  { pattern: /namespace\.yaml$/, type: DeployType.Namespace },
];

interface FileOptions {
  file_path: string;
  file_type: DeployType;
  content: string;
  unchanged?: boolean;
}

@Injectable()
export class AppService {
  constructor(private readonly logger: Logger) {}

  async upgrade(params: UpgradeDto, res: ReadableStreamResult) {
    try {
      const fileOptions = await this.get_yaml_file_path(params);
      this.logger.info(`Found yaml in ${fileOptions.file_path}`);
      const success = await this.deploy_with_yaml(
        fileOptions,
        params,
        res,
      );
      if (success) {
        res.end(globals.end_msg);
      } else {
        res.end();
      }
      this.logger.info(`Upgrade finished`);
    } catch (error) {
      this.logger.error(error);
      res.end(error + "");
      return "error: " + error;
    }
  }

  private async get_namespace(dir_path: string): Promise<string | null> {
    try {
      const data = await readYaml<{
        metadata: {
          name: string;
        };
      }>(dir_path + `/${DeployType.Namespace}.yaml`);
      return data.metadata?.name;
    } catch {
      return null;
    }
  }

  private getFileType(fileName: string): DeployType | undefined {
    for (const strategy of fileTypeStrategies) {
      if (strategy.pattern.test(fileName)) {
        return strategy.type;
      }
    }
    return undefined;
  }

  private async findFile(
    regex: RegExp,
    folderPath: string,
  ): Promise<FileOptions | undefined> {
    for await (
      const entry of walk(folderPath, {
        includeFiles: true,
        includeDirs: false,
      })
    ) {
      const content = await Deno.readTextFile(entry.path);
      if (!regex.test(content)) {
        continue;
      }
      const file_type = this.getFileType(entry.name);
      if (!file_type) {
        console.error(
          `File ${entry.name} found image, but name is not valid`,
        );
        continue;
      }
      return {
        content,
        file_path: entry.path,
        file_type,
      };
    }
  }

  /**
   * 找到需要更新的ing.yaml或者deployment.yaml，修改镜像版本号
   */
  private async get_yaml_file_path(upgrade: UpgradeDto): Promise<FileOptions> {
    const { upgrade_base_dir } = globals;
    // dk.uino.cn/project/repository:1.0.0
    const reg = new RegExp(
      `dk\\.uino\\.cn\\/${upgrade.project}\\/${upgrade.repository}:([\\w\\-\\.]+)`,
    ); // "gm",
    const result = await this.findFile(reg, upgrade_base_dir);
    if (!result) {
      throw new BadRequestException("not find yaml");
    }
    const { content, file_path, file_type } = result;
    const matched = reg.exec(content);
    const version = matched && matched[1];
    if (!version) { // 这里一定会取到的
      this.logger.warn("not find version");
      throw new BadRequestException("not find version");
    }
    const res2 = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (
      upgrade.strict_version &&
      res2 &&
      new RegExp(
        `\\s+${upgrade.hostname.replace(/\./gm, "\\.")}\\s+`,
        "gm",
      ).test(content)
    ) {
      const ug_version = upgrade.version.split(".").map((v) => Number(v));
      // 匹配了版本规则的进行校验
      const version_arr = (res2[0].split(":").pop() as string)
        .split(".")
        .map((v) => Number(v));
      if (ug_version.join(".") === version_arr.join(".")) {
        throw new BadRequestException(
          "Target version same with currently running version",
        );
      } else if (
        upgrade.strict_version === "" ||
        (upgrade.strict_version === "patch" &&
          ug_version[0] === version_arr[0] &&
          ug_version[1] === version_arr[1] &&
          ug_version[2] > version_arr[2]) ||
        (upgrade.strict_version === "minor" &&
          ug_version[0] === version_arr[0] &&
          (ug_version[1] > version_arr[1] ||
            (ug_version[1] === version_arr[1] &&
              ug_version[2] > version_arr[2]))) ||
        (upgrade.strict_version === "major" &&
          (ug_version[0] > version_arr[0] ||
            (ug_version[0] === version_arr[0] &&
              ug_version[1] > version_arr[1]) ||
            (ug_version[0] === version_arr[0] &&
              ug_version[1] === version_arr[1] &&
              ug_version[2] > version_arr[2])))
      ) {
        await fs.writeFile(
          file_path,
          content.replace(
            reg,
            `dk.uino.cn/${upgrade.project}/${upgrade.repository}:${upgrade.version}`,
          ),
          "utf8",
        );
        return {
          file_type,
          file_path,
          content,
          unchanged: upgrade.version === version,
        };
      } else {
        throw new BadRequestException(
          `Strict version skip, from ${
            version_arr.join(
              ".",
            )
          } to ${ug_version.join(".")}`,
        );
      }
    } else {
      if (upgrade.version !== version) {
        await fs.writeFile(
          file_path,
          content.replace(
            reg,
            `dk.uino.cn/${upgrade.project}/${upgrade.repository}:${upgrade.version}`,
          ),
          "utf8",
        );
      }
      return {
        file_type,
        file_path,
        content,
        unchanged: upgrade.version === version,
      };
    }
  }

  get kubectlBin() {
    return (globals.kubectl_dir || "") + "kubectl";
  }

  /**
   * 查找appName
   */
  private async find_app_name(
    fileOptions: FileOptions,
    params: UpgradeDto,
    namespace: string,
    apply_output: string,
  ) {
    let appName: string | undefined;
    const findContainerByAppName = async (appName: string) => {
      const dockerUrl = await this.exec(
        `${this.kubectlBin} describe -n ${namespace} ${appName} |grep Image |  awk '{print $2}'`,
      );
      return dockerUrl.trim() ===
        `dk.uino.cn/${params.project}/${params.repository}:${params.version}`;
    };
    if (params.is_local) { // 测试环境，与生产的逻辑不同的一点在于，如果镜像没有改变，需要restart，所以，对于生产环境而言，只需要判断有没有configured，没有就报错了，有的话再确认下哪个是正确的appName
      const reg = /((deployment\.apps\/|cronjob\.batch\/)([\w-]+))\s+/;
      const appNames: string[] = [];
      apply_output.split("\n").forEach((line: string) => {
        const matched = line.match(reg);
        // [
        //   "deployment.apps/server configured",
        //   "deployment.apps/server",
        //   "deployment.apps/",
        //   "server",
        // ]
        if (matched && !ignore_re.test(matched[2])) {
          appNames.push(matched[1]);
        }
      });
      if (appNames.length === 0) {
        const msg =
          `${fileOptions.file_path} applied result not matched deployment.apps or cronjob.batch`;
        throw new BadRequestException(msg);
      } else {
        for (let i = 0; i < appNames.length; i++) {
          const find = await findContainerByAppName(appNames[i]);
          if (find) {
            appName = appNames[i];
            break;
          }
        }
        if (!appName) {
          const msg = `Not found Image by describe.`;
          throw new BadRequestException(msg);
        }
      }
    } else {
      const reg =
        /((deployment\.apps\/|cronjob\.batch\/)([\w-]+))\s+(configured|created)/;
      const appNames: string[] = [];
      apply_output.split("\n").forEach((line: string) => {
        const matched = line.match(reg);
        // [
        //   "deployment.apps/server configured",
        //   "deployment.apps/server",
        //   "deployment.apps/",
        //   "server",
        //   "configured" 或者 "created"
        // ]
        if (matched && !ignore_re.test(matched[2])) {
          appNames.push(matched[1]);
        }
      });
      if (appNames.length === 0) {
        const msg =
          `${fileOptions.file_path} applied result not matched deployment.apps.configured or cronjob.batch.configured`;
        throw new BadRequestException(msg);
      } else {
        for (let i = 0; i < appNames.length; i++) {
          const find = await findContainerByAppName(appNames[i]);
          if (find) {
            appName = appNames[i];
            break;
          }
        }
        if (!appName) { // 正常情况不可能找不到
          const msg =
            `Not found Image by describe, there may be something wrong.`;
          throw new BadRequestException(msg);
        }
      }
    }
    return appName;
  }

  private async deploy_with_yaml(
    fileOptions: FileOptions,
    params: UpgradeDto,
    res: ReadableStreamResult,
  ): Promise<boolean> {
    const { file_path, file_type } = fileOptions;
    const apply_output = await this.exec(
      `${this.kubectlBin} apply -f ${file_path}`,
    );
    // 虽然大部分情况下输出结果应该只有一个configured，但也有例外，所以不能根据它来确定appName
    // namespace/spacex-cert unchanged
    // configmap/config unchanged
    // deployment.apps/server configured
    // service/server-svc unchanged
    // deployment.apps/web unchanged
    // service/web-svc unchanged
    // ingress.networking.k8s.io/web-ing unchanged
    if (
      file_type !== DeployType.Deployment &&
      file_type !== DeployType.Ingress
    ) {
      this.logger.info(`[${file_path}] will not check success.`);
      return true;
    }

    let namespace: string | null;
    const namespace_match = apply_output.match(/namespace\/([\w-]+)/m);
    if (!namespace_match || namespace_match.length < 2) {
      const arr = file_path.split("/");
      arr.pop();
      namespace = await this.get_namespace(arr.join("/"));
      if (!namespace) {
        const msg = `${file_path} applied result not matched namespace`;
        this.logger.error(msg);
        res.write(msg);
        return false;
      } else {
        this.logger.info(`find namespace [${namespace}] from namespace.yaml`);
      }
    } else {
      namespace = namespace_match[1];
    }

    // 查找appName
    const appName = await this.find_app_name(
      fileOptions,
      params,
      namespace,
      apply_output,
    );
    if (params.is_local) {
      if (fileOptions.unchanged) { // 只有镜像未改变时需要restart，否则上面的apply已经可以了
        await this.exec(
          `${this.kubectlBin} rollout restart -n ${namespace} ${appName}`,
        );
      }
    }

    // 等待2分钟
    const timeoutMinutes = params.timeout || 2;
    const time = 1000 * 60 * timeoutMinutes;
    res.write(
      `Applied deployment ok, and will check the pods status within ${timeoutMinutes} minutes.\n`,
    );
    const bool = await this.checkIsSuccess(namespace, appName, time);
    if (bool) {
      this.logger.info(`pod ${namespace} ${appName} successfully`);
      return true;
    }
    res.write(SEPARATOR_LINE + "\n");
    this.logger.info(SEPARATOR_LINE);
    const msg =
      `pod ${namespace} ${appName} failed to start, the error logs will be shown: `;
    this.logger.warn(msg);
    res.write(msg + "\n");
    const podName = await this.findErrorPod(namespace, appName);
    const errorLogs = await this.logPod(namespace, podName, time);
    res.write(errorLogs + "\n");
    res.write(SEPARATOR_LINE + "\n");
    this.logger.info(SEPARATOR_LINE);
    this.logger.warn(`pod ${namespace} ${appName} will try to rollout`);
    await this.rollout(namespace, appName, res);
    return false;
  }

  private async checkIsSuccess(
    namespace: string,
    appName: string,
    time: number,
  ) {
    if (appName.startsWith("cronjob.batch/")) {
      // cronjob.batch/clear-env
      return true;
    }
    //查询执行的状态
    // admin@ip-10-120-1-167:~$ /usr/bin/kubectl rollout status -n test deployment.apps/test1
    // deployment "test1" successfully rolled out
    //这一步可能会卡住，一般情况下不会
    try {
      const output = await this.exec(
        `${this.kubectlBin} rollout status -n ${namespace} ${appName}`,
        time,
      );
      return output.includes("successfully");
    } catch {
      return false;
    }
  }

  private async findErrorPod(namespace: string, appName: string) {
    //先找到更新的deployment的标签
    //admin@ip-10-120-1-167:~$ kubectl describe deployment.apps/test1 -n test  |grep Labels |  awk '{if($2~"=")print $2}'  | head -n 1
    //app=test1
    let command =
      `${this.kubectlBin} describe ${appName} -n ${namespace} | grep Labels |  awk '{if($2~"=")print $2}'  | head -n 1`;
    const deploy_label_output = await this.exec(command);
    if (!deploy_label_output) {
      throw new Error(
        "Not find the pod label.",
      );
    }

    //找到异常的pods，或者正在启动运行的pods
    //admin@ip-10-120-1-167:~$ kubectl get pods -l app=test1 -n test |grep -v 'Running'|grep -v 'NAME' |grep -v 'Terminating'|head -n 1 |awk '{print $1}'
    //test1-c7d77f47-m7r7l
    command =
      `${this.kubectlBin} get pods -l ${deploy_label_output.trim()} -n ${namespace} | grep -v 'Running' | grep -v 'NAME' | grep -v 'Terminating' | head -n 1 | awk '{print $1}'`;
    const error_pod_output = await this.exec(command);
    if (!error_pod_output.trim()) {
      throw new Error(
        "Not find error pod. Perhaps the startup time of your service exceeds 2 minutes. You can verify it by adjusting the parameter timeout, for example --timeout=3, then the waiting time will become 3 minutes.",
      );
    }
    return error_pod_output.trim();
  }

  private logPod(namespace: string, podName: string, time: number) {
    //打印近5s的非运行的pods日志
    //admin@ip-10-120-1-167:~$ kubectl logs --tail=-1 --since=5s test1-c7d77f47-m7r7l -n test
    //Error from server (BadRequest): container "test1" in pod "test1-c7d77f47-m7r7l" is waiting to start: image can't be pulled
    const command = `${this.kubectlBin} logs --tail=-1 --since=${
      time / 1000
    }s ${podName} -n ${namespace}`;
    return this.exec(command);
  }
  /**
   * 回流到上一版本
   */
  private async rollout(
    namespace: string,
    appName: string,
    res: ReadableStreamResult,
  ) {
    //进行版本回退
    //取上一个版本号准备回退
    // admin@ip-10-120-1-167:~$ /usr/bin/kubectl rollout history -n test deployment.apps/test1 | awk '{print $1}' |tail -n 3 | head -n 1
    // 31
    let command =
      `${this.kubectlBin} rollout history -n ${namespace} ${appName} | awk '{print $1}' |tail -n 3 | head -n 1`;
    const rollout_history_output = await this.exec(command);
    //获取要回退的镜像tag
    // admin@ip-10-120-1-167:~$ kubectl rollout history  -n test deployment.apps/test1 --revision=31  |grep Image |  awk '{print $2}'
    // dk.uino.cn/studio/test1:v38
    command =
      `${this.kubectlBin} rollout history -n ${namespace} ${appName} --revision=${rollout_history_output.trim()} |grep Image |  awk '{print $2}'`;
    const dockerVersion = await this.exec(command);
    res.write(
      `The deployment failed, then will try to rollback version: ${dockerVersion}.\n`,
    );
    // console.log(
    //   "deployment failed will rollback version:",
    //   rollout_image_output
    // );
    // admin@ip-10-120-1-167:~$ /usr/bin/kubectl rollout undo  -n test deployment.apps/test1 --to-revision=31
    // deployment.apps/test1 rolled back
    //因为上个版本肯定是没有问题的，所以直接回退不需要判断
    command =
      `${this.kubectlBin} rollout undo -n ${namespace} ${appName} --to-revision=${rollout_history_output.trim()}`;
    await this.exec(command);
    res.write(
      `Rollback ok. You may check your deployment by the error message above.\n`,
    );
  }

  private exec(command: string, timeout = 60_000): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.logger.info(SEPARATOR_LINE);
      this.logger.info(command);
      // res.write(separator);
      exec(
        command,
        {
          timeout,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          this.logger.info(stdout);
          if (stderr) {
            // 错误输出不异常
            this.logger.warn(stderr);
          }
          resolve(typeof stdout === "string" ? stdout : ""); // 都认为是成功了
        },
      );
    });
  }
}
