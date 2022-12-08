import { DateFileLogConfig } from "date_file_log";

// 添加interface或type
export type Config = {
  port: number;
  kubectl_dir?: string;
  guard_token: string;
  upgrade_base_dir: string;
  end_msg: string;
  log: DateFileLogConfig; //log4js配置
};

export type Scripts = {
  version: string;
};
