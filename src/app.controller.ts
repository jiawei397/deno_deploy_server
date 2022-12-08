import { Body, Controller, Get, Post, UseGuards } from "oak_nest";
import { Scripts } from "./type.ts";
import { parse } from "jsonc";
import { AuthGuard } from "./guards/auth.guard.ts";
import { UpgradeDto } from "./app.dto.ts";
import { Logger } from "./tools/log.ts";
import { AppService } from "./app.service.ts";
import { StringWriter } from "std/io/mod.ts";

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
  async upgrade(@Body() params: UpgradeDto) {
    try {
      this.logger.debug(
        `upgrading start and params is ${JSON.stringify(params)}`,
      );
      const writer = new StringWriter("");
      await this.appService.upgrade(params, writer);
      this.logger.info(`Upgrade finished`);
      return writer.toString();
    } catch (error) {
      this.logger.error(error);
      return "error: " + error;
    }
  }
}
