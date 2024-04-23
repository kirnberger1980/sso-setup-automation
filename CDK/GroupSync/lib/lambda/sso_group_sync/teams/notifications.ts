/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { IncomingWebhook } from "./IncomingWebhook";
const webhook = new IncomingWebhook(process.env.MS_TEAMS_WEBHOOK_URL);
import * as AdaptiveCards from "adaptivecards";

export async function ssoNotification(addedGroups: string[], domain: string, docuWebsite: string, identityStoreId: string, errortext: string) {
  let summary;
  let activityText;
  const cardfacts: AdaptiveCards.Fact[] = [];
  const action = new AdaptiveCards.OpenUrlAction();

  if(addedGroups.length !== 0){
    summary = "📢 AWS SSO Sync Notification";
    activityText= "New Groups where added to our AWS SSO Identity Store **" +identityStoreId +
      "** and will be synced from now on from our Domain: **" + domain +"**" ;
    addedGroups.map((group: string | undefined) => {
      const fact = new AdaptiveCards.Fact(" ✚ ", group);
      cardfacts.push(fact);
    });
    action.title = "Go to Live Documentation";
    action.isEnabled = true;
    action.url = docuWebsite;
  }
  if(errortext !== ""){
    summary = "📢 AWS SSO Sync Notification";
    activityText= errortext;
    action.title = "Get more Information";
    action.isEnabled = true;
    action.url = "https://"+process.env.AWS_DEFAULT_REGION+".console.aws.amazon.com/cloudwatch/home?region="+process.env.AWS_DEFAULT_REGION+"#logsV2:log-groups/log-group/"+process.env.AWS_LAMBDA_LOG_GROUP_NAME+"/log-events/"+process.env.AWS_LAMBDA_LOG_STREAM_NAME;
  }

  const card = new AdaptiveCards.AdaptiveCard();
  card.version = AdaptiveCards.Versions.v1_4;
  card.height = "stretch";
  card.style;
  const summaryBlock = new AdaptiveCards.TextBlock();
  summaryBlock.text = summary;
  summaryBlock.wrap = true;
  summaryBlock.weight = AdaptiveCards.TextWeight.Bolder;
  card.addItem(summaryBlock);

  const activityTextBlock = new AdaptiveCards.TextBlock();
  activityTextBlock.text = activityText;
  activityTextBlock.weight = AdaptiveCards.TextWeight.Default;
  activityTextBlock.wrap = true;
  card.addItem(activityTextBlock);

  if(addedGroups.length !== 0){
    const facts = new AdaptiveCards.FactSet();
    facts.facts = cardfacts;
    card.addItem(facts);
  }

  card.addAction(action);
  if(errortext !== "" || addedGroups.length !== 0){
    const response = await webhook.send(card);
    console.log("ℹ️ Teams Notification reponse-Code: " + response?.status);
  }

}