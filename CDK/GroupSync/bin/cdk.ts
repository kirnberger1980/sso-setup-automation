#!/usr/bin/env node
import { CdkStack } from "../lib/sso_group_sync";
import * as cdk from "aws-cdk-lib";
import { sandboxConfig } from "../values/sandbox/sandbox";
const app = new cdk.App();

new CdkStack(app, "sandbox", {
  config: sandboxConfig,
  stackName: sandboxConfig.general.prefix.toLocaleUpperCase() +"-"+ sandboxConfig.general.produkt.toLocaleUpperCase() + "-" + sandboxConfig.general.stage.toLocaleUpperCase(),
  env: {
    region: "eu-central-1",
    account: "123456789012",
  },
});