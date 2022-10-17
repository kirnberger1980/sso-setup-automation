import { CdkStack } from "../lib/sso_group_sync";
import * as cdk from "aws-cdk-lib";
import * as fs from "fs";
import { validate } from "../lib/tools/config-validator";
import * as cloudformation from "@aws-sdk/client-cloudformation";
import { Config } from "../lib/types/config";
import { RuntimeProperties } from "../lib/types/runtimeprops";
const configFile = process.env.PROCESS_PARAMETERS;

const runtimeprops: RuntimeProperties = {
  DirectoryId: "",
  Secret: "",
  SecretValue: "",
}


async function GetOutputsFromStack(StackName:string,runtimeprops: RuntimeProperties): Promise<void>{
  const cloudformation_client = new cloudformation.CloudFormationClient({region: process.env.CDK_DEFAULT_REGION ? "eu-central-1" : process.env.CDK_DEFAULT_REGION});
  const params ={
    StackName: StackName
  };
  const liststacks = new cloudformation.ListStacksCommand({
    StackStatusFilter: [
      cloudformation.StackStatus.CREATE_COMPLETE,
      cloudformation.StackStatus.ROLLBACK_COMPLETE,
      cloudformation.StackStatus.UPDATE_COMPLETE,
      cloudformation.StackStatus.UPDATE_ROLLBACK_COMPLETE,
    ],
  });
  const responsestack = await cloudformation_client.send(liststacks);
  const found = responsestack.StackSummaries?.find(
    (Stack) => Stack.StackName === StackName
  );

  if (found) {
    const command = new cloudformation.DescribeStacksCommand(params);
    const responsestack = await cloudformation_client.send(command);
    if (
      responsestack.Stacks?.[0].StackName &&
      responsestack.Stacks?.[0].Outputs
    ) {
      for(const output of responsestack.Stacks?.[0].Outputs){

          if(output.ExportName == StackName + "DirectoryId")
          {
            runtimeprops.DirectoryId = output.OutputValue  || "" ;
          }
          if(output.ExportName == StackName + "Secret")
          {
            runtimeprops.Secret = output.OutputValue  || "" ;
          }
      }
    }
  }
}

if (configFile && fs.existsSync(configFile)) {
  const config: Config = require(fs.realpathSync(configFile));
  (async () => {
    const StackName = config.general.prefix.toLocaleUpperCase() +"-"+ config.general.produkt.toLocaleUpperCase() + "-" + config.general.stage.toLocaleUpperCase()
    await GetOutputsFromStack(StackName,runtimeprops);
    var region = ""
    if(process.env.CDK_DEFAULT_REGION){
      region = process.env.CDK_DEFAULT_REGION
    }
    else{
      region = "eu-central-1"
    }
    const app = new cdk.App();
    console.log(
      "👤 AWS Profile used: ",
      "\x1b[33m",
      "\n                      " + process.env.AWSUME_PROFILE,
      "\x1b[0m"
    );
    console.log(
      "🌎 CDK deployment region:",
      "\x1b[33m",
      "\n                      " + process.env.CDK_DEFAULT_REGION,
      "\x1b[0m \n"
    );
    if (validate(config)) {
      console.log(
        `🌐\tDeploying in ${process.env.CDK_DEFAULT_ACCOUNT} / ${process.env.CDK_DEFAULT_REGION} - Stackname: ${StackName}`
      );
      (async () => {
        new CdkStack(app, StackName, {
          config,
          runtimeprops,
          env: {
            region: process.env.CDK_DEFAULT_REGION,
            account: process.env.CDK_DEFAULT_ACCOUNT,
          },
        });
        // app.synth()
      })();
    } else {
      console.log(
        "\n 🧪 Validation of your ConfigFile: \n   📂 " + configFile + "\n\n"
      );
      console.error(
        "\u001B[31m",
        "🚨 Invalid Configuration File 🚨 \n\n",
        "\x1b[0m" + JSON.stringify(validate.errors, null, 2) + "\n\n"
      );
      process.exitCode = 1;
    }
  })();
} else {
  console.log("🚨 File", configFile, "not found. - NO CDK ERROR");
}