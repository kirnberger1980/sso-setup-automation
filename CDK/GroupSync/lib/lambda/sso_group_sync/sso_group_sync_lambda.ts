
import { ssoNotification } from "./teams/notifications";
import { updateGroups } from "./services/identitystore";
import { aws_events as events } from "aws-cdk-lib";
import { renderdocumentation } from "./services/utils";
import { uploadDocumentation } from "./services/s3";
import { getGroupsfromLdap } from "./services/ldap";
import { SecretDefinition} from "../../types/config";
import { getSecret } from "./services/secretsmanager";

const BUCKETNAME = process.env.S3_DOKUBUCKET || "";
const IDENTITIYSTOREID = process.env.IDENTITY_STORE_ID || "";
const DOMAINNAME = process.env.DOMAINNAME  || "";
const DOKU_WEBSITE = process.env.DOKU_WEBSITE  || "";
const LDAP_BASE_PATH = process.env.LDAP_BASE_PATH ?? "";
const LDAP_GROUP_PREFIXES = process.env.LDAP_GROUP_PREFIXES ?? "";
const LDAP_URL = process.env.LDAP_URL ?? "";
const AD_SECRET_ID = process.env.AD_SECRET_ID ?? "";
const LDAP_PORT = parseInt(process.env.LDAP_PORT ?? "636");
/**
 * The method distinguishes the type of event and calls the appropriate method for each form, namely:
 * Create, Update, and Delete.
 * @param event Schedule Event.
 */
export async function handler(event: events.Schedule){
  console.log("Event 👉", event);
  let adlogincredentials: SecretDefinition = { "username": "string", "password": "string"};
  try{
    adlogincredentials = await getSecret(AD_SECRET_ID);
  }
  catch (error){
    console.log("🚨 Error while get LDAP Credentials");
    const errortext = "🚨 Error while get LDAP Credentials";
    await ssoNotification([], DOMAINNAME, DOKU_WEBSITE, IDENTITIYSTOREID, errortext);
    throw error;
  }
  console.log("🔑 Login to LDAP with user: "+adlogincredentials.username);
  const [adGroups, err] = await getGroupsfromLdap(DOMAINNAME,adlogincredentials.username, adlogincredentials.password, LDAP_BASE_PATH, LDAP_GROUP_PREFIXES.split(","), LDAP_URL, LDAP_PORT);
  if(err){
    await ssoNotification([], DOMAINNAME, DOKU_WEBSITE, IDENTITIYSTOREID, err);
    throw err;
  }
  try {
    if(adGroups.length !== 0){
      const addedgroups = await updateGroups(DOMAINNAME, adGroups);
      if(addedgroups.length !== 0){
        const content = await renderdocumentation(DOMAINNAME);
        await uploadDocumentation(BUCKETNAME,"sso/group-monitoring.html", content);
        await ssoNotification(addedgroups, DOMAINNAME, DOKU_WEBSITE, IDENTITIYSTOREID, "");
      }
    }
  }
  catch (error){
    console.log("🚨 Error while updating Groups");
    const errortext = "🚨 Error while updating Groups";
    await ssoNotification([], DOMAINNAME, DOKU_WEBSITE, IDENTITIYSTOREID, errortext);
    throw error;
  }
}