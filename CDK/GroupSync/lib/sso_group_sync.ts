import * as cdk from "aws-cdk-lib";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import {
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_ec2 as ec2,
  aws_events as events,
  aws_events_targets as targets,
  aws_ssm as ssm
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Config } from "./types/config";
import * as path from "path";
import { SopsSyncProvider, SopsSecret } from "cdk-sops-secrets";
import * as statement from "cdk-iam-floyd";

export interface ConfigStackProps extends cdk.StackProps {
  readonly config: Config;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ConfigStackProps) {
    super(scope, id, props);

    // Create SOPS SecretProvider Construct
    const sopsSyncProvider = new SopsSyncProvider(
      this,
      "SopsSyncProvider"
    );

    const adsecret = new SopsSecret(this,  "SopsSecret", {
      sopsFilePath: props.config.SSO.LdapConfig.SecretFile,
      sopsProvider: sopsSyncProvider,
      stringifyValues: false,
      convertToJSON: false,
      flatten: false
    });

    // Group Sync Lambda
    const ssoGroupSyncLambdaRole = new iam.Role(this, "SssoGroupSyncLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    ssoGroupSyncLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    ),);
    const s3bucket = "arn:aws:s3:::"+props.config.general.s3_DOKUBUCKET;
    const s3allow = new iam.PolicyStatement({
      actions:[
        "s3:PutObject",
        "s3:PutObjectAcl",
      ],
      resources: [s3bucket,s3bucket+"/*"]});
    ssoGroupSyncLambdaRole.addToPolicy(s3allow);
    ssoGroupSyncLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    ),);
    const subnets : ec2.ISubnet[] = [];
    const vpc = ec2.Vpc.fromLookup(this, "myvpc", {vpcId: props.config.Vpc.vpcId, isDefault: false});
    props.config.Vpc.subnetIds.forEach(subnetId => {
      const subnet = vpc.isolatedSubnets.find(subnet => subnet.subnetId == subnetId);
      if (subnet) {
        subnets.push(subnet);
      }
    });

    const vpcSubnets : ec2.SubnetSelection = { subnets };
    const parameterName = `SSO/AD/${props.config.general.stage.toUpperCase()}/CA`;
    if(props.config.general.rootCaCertificateString){
      new ssm.CfnParameter(
        this,
        "CaCertificateParameter",
        {
          value: props.config.general.rootCaCertificateString,
          type: "String",
          name: `/${parameterName}`
        }
      );
    }


    const lambdaSecurityGroup =  new ec2.SecurityGroup(this, "lambdaSecurityGroup", {
      vpc,
      securityGroupName: "adGroupSynclambdaSecurityGroup",
      allowAllOutbound: true
    });

    const adGroupSyncLambda = new lambdaNodejs.NodejsFunction(this, "ssoGroupSyncLambdaFunction", {
      vpc,
      vpcSubnets,
      entry: path.join(__dirname, "../lib/lambda/sso_group_sync/sso_group_sync_lambda.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(90),
      architecture:lambda.Architecture.ARM_64,
      role: ssoGroupSyncLambdaRole,
      memorySize: 256,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
      runtime: lambda.Runtime.NODEJS_16_X,
      securityGroups: [lambdaSecurityGroup],
      environment: {
        S3_DOKUBUCKET: props.config.general.s3_DOKUBUCKET,
        MS_TEAMS_WEBHOOK_URL: props.config.general.WebhookUrlTeams,
        DOKU_WEBSITE: props.config.general.DocuWebsite,
        SSO_ENDPOINT: props.config.SSO.Endpoint,
        IDENTITY_STORE_ID: props.config.SSO.IdentityStoreId,
        DOMAINNAME: props.config.SSO.ad_DomainName,
        LDAP_BASE_PATH: props.config.SSO.LdapConfig.BasePath,
        LDAP_GROUP_PREFIXES: props.config.SSO.LdapConfig.GroupPrefixes.toString(),
        LDAP_URL: props.config.SSO.LdapConfig.Url,
        AD_SECRET_ID: adsecret.secretName,
        CA_CERT_PARAM_NAME: "/"+parameterName,
        LDAP_PORT: props.config.SSO.LdapConfig.Port.toString()
      }
    });

    adsecret.grantRead(adGroupSyncLambda);
    adGroupSyncLambda.addToRolePolicy(
      new statement.Statement.Ssm()
        .allow()
        .toGetParameter()
        .onParameter(parameterName, this.account, this.region)
    );
    adGroupSyncLambda.addToRolePolicy(
      new statement.Statement.IdentitySync()
        .allow()
        .toCreateSyncFilter()
        .toGetSyncProfile()
        .toListSyncFilters()
        .onAllResources()
    );
    adGroupSyncLambda.addToRolePolicy(
      new statement.Statement.Identitystore()
        .allow()
        .toListGroups()
        .onAllResources()
    );
    adGroupSyncLambda.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));


    const eventRule = new events.Rule(this, "CloudWatchScheduleRule", {
      schedule: events.Schedule.rate(props.config.general.LambdaSchedule),
    });

    eventRule.addTarget(new targets.LambdaFunction(adGroupSyncLambda));

  }
}
