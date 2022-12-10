import {
  Body,
  Controller,
  Get,
  getReadableStream,
  Post,
  Res,
  Response,
  UseGuards,
} from "oak_nest";
import { Scripts } from "./type.ts";
import { parse } from "jsonc";
import { AuthGuard } from "./guards/auth.guard.ts";
import { UpgradeDto } from "./app.dto.ts";
import { Logger } from "./tools/log.ts";
import { AppService } from "./app.service.ts";

@Controller("")
export class AppController {
  constructor(
    private readonly logger: Logger,
    private readonly appService: AppService,
  ) {
  }
  @Get("/")
  async version() {
    const text = await Deno.readTextFile("deno.jsonc");
    const json: Scripts = parse(text);
    return `<html><h2>${json.version}</h2></html>`;
  }

  @Post("upgrade-k8s-service")
  @UseGuards(AuthGuard)
  upgrade(@Body() params: UpgradeDto, @Res() response: Response) {
    const rs = getReadableStream();
    this.logger.debug(
      `upgrading start and params is ${JSON.stringify(params)}`,
    );
    response.body = rs.body;
    this.appService.upgrade(params, rs); // 不能用await等待，否则不能第一时间响应
  }
}
