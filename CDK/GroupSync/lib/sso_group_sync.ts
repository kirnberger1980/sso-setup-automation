import * as cdk from "aws-cdk-lib";
import * as lambdaPy from '@aws-cdk/aws-lambda-python-alpha'
import {aws_ssm as ssm} from "aws-cdk-lib";

import {
  aws_iam as iam,
  aws_secretsmanager as secretmanager,
  aws_kms as kms,
  aws_lambda as lambda,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_logs as logs,
  Tags,
  SecretValue,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Config } from "./types/config";
import { RuntimeProperties } from "./types/runtimeprops";

export interface ConfigStackProps extends cdk.StackProps {
  readonly config: Config;
  runtimeprops: RuntimeProperties;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ConfigStackProps) {
    super(scope, id, props);

    console.log(
      "🌎 New Ressources are beeing created in :",
      "\x1b[33m",
      "\n                      " + process.env.CDK_DEFAULT_REGION,
      "\x1b[0m \n",
      "👤 in AWS Account : ",
      "\x1b[33m",
      "\n                      " + process.env.AWSUME_PROFILE,
      "\x1b[0m"
    );


    const ssmressource = new ssm.StringParameter(this, 'GroupFilters', {
      description: "SSO GroupFilters for" + props.config.SSO.ad_DomainName,
      parameterName: '/SSO/GroupFilters',
      stringValue: JSON.stringify(props.config.SSO.GroupFilterConfig),
    });

    // Group Sync Lambda
    const SssoGroupSyncLambdaRole = new iam.Role(this, "SssoGroupSyncLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    SssoGroupSyncLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    ),);
    const identitySyncAllow = new iam.PolicyStatement({
      actions:[
        "identity-sync:CreateSyncFilter",
        "identity-sync:DeleteSyncFilter",
        "identity-sync:ListSyncFilters"
      ],
      resources: ["*"]})
      const s3bucket = "arn:aws:s3:::"+props.config.general.s3_DOKUBUCKET
      const s3allow = new iam.PolicyStatement({
        actions:[
          "s3:PutObject",
          "s3:PutObjectAcl",
        ],
        resources: [s3bucket,s3bucket+"/*"]})
        const ssmallow = new iam.PolicyStatement({
          actions:[
            "ssm:DescribeParameters"
          ],
          resources: ["*"]})
        const ssmparameter = "arn:aws:ssm:" + process.env.CDK_DEFAULT_REGION +":" + process.env.CDK_DEFAULT_ACCOUNT + ":parameter/SSO/GroupFilters"
        const ssmparameterallow = new iam.PolicyStatement({
        actions:[
          "ssm:GetParameter"
        ],
        resources: [ssmparameter]})
      SssoGroupSyncLambdaRole.addToPolicy(identitySyncAllow)
      SssoGroupSyncLambdaRole.addToPolicy(s3allow)
      SssoGroupSyncLambdaRole.addToPolicy(ssmparameterallow)
      SssoGroupSyncLambdaRole.addToPolicy(ssmallow)
      SssoGroupSyncLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    ),);
    const SssoGroupSyncLambdaFunction = new lambdaPy.PythonFunction(this, "SssoGroupSyncLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: "./lambda/GroupSync",
      index: "group-sync.py",
      handler: "lambda_handler",
      timeout: cdk.Duration.seconds(90),
      architecture: lambda.Architecture.ARM_64,
      role: SssoGroupSyncLambdaRole,
      memorySize: 128,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment:
        {
          "S3_DOKUBUCKET": props.config.general.s3_DOKUBUCKET,
          "AD_DOMAINNAME": props.config.SSO.ad_DomainName,
          "SSM_GROUPS_PARAMETER": "/SSO/GroupFilters",
          "WEBHOOK_URL_TEAMS": props.config.general.WebhookUrlTeams,
          "DOKU_WEBSITE": props.config.general.DocuWebsite
        }
    });
    SssoGroupSyncLambdaFunction.node.addDependency(ssmressource)
    const SsoGroupSyncCustomResource = new cdk.CustomResource(this, "SsoGroupSyncCustomResource", {
      properties: {
        "NOW": new Date().toLocaleTimeString()
      },
      serviceToken: SssoGroupSyncLambdaFunction.functionArn
    })
    }
}
