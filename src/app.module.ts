import { Module } from "oak_nest";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [],
  controllers: [AppController],
})
export class AppModule {}
