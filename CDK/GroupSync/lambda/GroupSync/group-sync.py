import boto3
import coto
import json
import time
import os
from datetime import datetime
import requests
import logging 
import os
import urllib
from urllib.error import HTTPError, URLError

session = coto.Session(
    boto3_session=boto3.Session()
)

if os.environ.get('WEBHOOK_URL_TEAMS') is None:
    print("🚨 NO WEBHOOK URL FOR TEAMS SET.")
else:
    webhook_url_teams = os.environ['WEBHOOK_URL_TEAMS']


region = os.getenv('AWS_DEFAULT_REGION')
awsaccountid = boto3.client('sts').get_caller_identity().get('Account')



sso = session.client('sso')

def update_cloudformation(event,status,message):
    cfn_url = event["ResponseURL"]
    cfn_stack_id = event["StackId"]
    cfn_request_id = event["RequestId"]
    logical_resource_id = event["LogicalResourceId"]
    data={}

    json_body = {
        "Status": status,
        "Reason": message,
        "PhysicalResourceId": logical_resource_id,
        "StackId": cfn_stack_id,
        "RequestId": cfn_request_id,
        "LogicalResourceId": logical_resource_id,
        'Data': data
    }
    logging.info(json_body)
    response = requests.put(
        url=cfn_url,
        json=json_body,
    )


def notify_teams(webhook_url_teams,docu_website,title,text):
            message = {
                "type":"message",
                "attachments":[
                    {
                    "contentType":"application/vnd.microsoft.card.adaptive",
                    "contentUrl": "",
                    "content":{
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "msteams": {
                            "width": "Full"
                        },
                        "version": "1.4",
                        "body": [
                        {
                            "type": "TextBlock",
                            "size": "Medium",
                            "weight": "Bolder",
                            "text": f"{title}"
                        },
                        {
                            "type": "TextBlock",
                            "text": f"{text}",
                            "wrap": "true"
                        }
                    ],
                    "actions": [
                        {
                            "type": "Action.OpenUrl",
                            "title": "View Current Documentation",
                            "url": f"{docu_website}"
                        }
                    ],
                    }
                    }
                ]
                }
            req = urllib.request.Request(webhook_url_teams, json.dumps(message).encode('utf-8'))
            while True:
                try:
                    time.sleep(1)
                    response = urllib.request.urlopen(req)
                    logging.info(response)
                    #response.read()
                    raw_data = bytes.decode(response.read(), 'utf-8') 
                    logging.info("MS Teams-Response: "+raw_data)
                    if "Microsoft Teams endpoint returned HTTP error" in raw_data:
                        logging.info("No Success, retrying: "+raw_data)
                        time.sleep(3)
                    else:
                        logging.info("Sucess: Message posted")
                        break
                except HTTPError as e:
                    logging.info("Request failed: %d %s", e.code, e.reason)
                except URLError as e:
                    logging.info("Server connection failed: %s", e.reason)

def render_html(groups,s3bucketname):
    content = ""
    content = f"""<html><head></head><body>"""
    content += f"""<h2><?xml version="1.0" encoding="UTF-8"?> <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <!-- Generator: Sketch 64 (93537) - https://sketch.com --> <title>Icon-Architecture/16/Arch_AWS-Identity-and-Access-Management_16</title> <desc>Created with Sketch.</desc> <defs> <linearGradient x1="0%" y1="100%" x2="100%" y2="0%" id="linearGradient-1"> <stop stop-color="#BD0816" offset="0%"></stop> <stop stop-color="#FF5252" offset="100%"></stop> </linearGradient> </defs> <g id="Icon-Architecture/16/Arch_AWS-Identity-and-Access-Management_16" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Icon-Architecture-BG/16/Security-Identity-Compliance" fill="url(#linearGradient-1)"> <rect id="Rectangle" x="0" y="0" width="24" height="24"></rect> </g> <path d="M5,18 L19,18 L19,7 L5,7 L5,18 Z M20,6.5 L20,18.5 C20,18.776 19.776,19 19.5,19 L4.5,19 C4.224,19 4,18.776 4,18.5 L4,6.5 C4,6.224 4.224,6 4.5,6 L19.5,6 C19.776,6 20,6.224 20,6.5 L20,6.5 Z M7,14.998 L10.998,15 L11,12.002 L7.002,12 L7,14.998 Z M8,11 L10,11.001 L10,9.854 C10,9.264 9.645,8.939 9,8.939 L8.999,8.939 C8.67,8.939 8.407,9.027 8.239,9.193 C8.042,9.388 8.001,9.659 8.001,9.852 L8,11 Z M6.146,15.852 C6.053,15.758 6,15.63 6,15.498 L6.002,11.5 C6.002,11.224 6.226,11 6.502,11 L7,11 L7.001,9.852 C7.001,9.301 7.187,8.827 7.537,8.481 C7.896,8.127 8.401,7.939 8.999,7.939 L9,7.939 C10.196,7.939 11,8.708 11,9.854 L11,11.002 L11.5,11.002 C11.633,11.002 11.76,11.055 11.854,11.148 C11.947,11.242 12,11.37 12,11.502 L11.998,15.5 C11.998,15.776 11.774,16 11.498,16 L6.5,15.998 C6.367,15.998 6.24,15.945 6.146,15.852 L6.146,15.852 Z M14,14 L16,14 L16,13 L14,13 L14,14 Z M14,11 L18,11 L18,10 L14,10 L14,11 Z" id="AWS-Identity-and-Access-Management_Icon_16_Squid" fill="#FFFFFF"></path> </g> </svg> AWS SSO </h2>"""
    content += f"""<h3><?xml version="1.0" encoding="UTF-8" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"> <svg width="20px" height="20px" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"> <g transform="matrix(0.1,0,0,-0.1,0,512)"> <path d="M3290,4785C2856,4697 2576,4290 2654,3860C2692,3654 2815,3462 2986,3344L3041,3306L2973,3283C2789,3221 2593,3099 2442,2953L2357,2871L2316,2892C2294,2904 2231,2930 2178,2950L2080,2987L2135,3025C2213,3079 2304,3174 2355,3255C2610,3662 2457,4191 2025,4399C1905,4457 1827,4474 1680,4474C1533,4474 1455,4457 1335,4399C1009,4242 830,3894 894,3540C932,3334 1055,3142 1225,3025L1280,2987L1178,2948C747,2786 424,2432 266,1948C242,1875 213,1766 201,1705C164,1508 149,1280 171,1238C183,1216 405,1105 565,1042C794,951 1080,869 1280,836C1590,785 1818,789 2220,855C2255,861 2255,860 2300,783C2362,676 2517,521 2625,459C2718,405 2810,367 2906,343C3009,317 3249,320 3351,348C3656,431 3898,642 4010,923C4037,990 4052,1048 4076,1177C4079,1194 4091,1202 4123,1210C4398,1280 4883,1482 4944,1553C4961,1573 4962,1587 4957,1700C4921,2452 4538,3043 3942,3268L3840,3307L3895,3345C4229,3575 4337,4036 4139,4389C3972,4687 3619,4851 3290,4785ZM3574,4625C3815,4574 4014,4375 4065,4134C4125,3851 3986,3561 3730,3432C3620,3377 3523,3356 3405,3363C3239,3373 3108,3433 2985,3555C2737,3802 2740,4199 2991,4451C3144,4606 3361,4670 3574,4625ZM1814,4305C2055,4254 2254,4055 2305,3814C2365,3531 2226,3241 1970,3112C1860,3057 1763,3036 1645,3043C1479,3053 1348,3113 1225,3235C977,3482 980,3879 1231,4131C1384,4286 1601,4350 1814,4305ZM3710,3171C3959,3114 4156,3005 4341,2820C4595,2567 4747,2220 4790,1801C4807,1630 4819,1652 4673,1582C4535,1517 4479,1493 4355,1450C4216,1401 4099,1368 4084,1374C4076,1377 4070,1392 4070,1408C4070,1452 4035,1580 4001,1659C3909,1874 3715,2069 3501,2160C3367,2217 3290,2233 3125,2235L2975,2238L2930,2313C2831,2477 2685,2643 2556,2740L2497,2785L2576,2858C2774,3043 3023,3159 3300,3194C3379,3204 3627,3190 3710,3171ZM1869,2864C2183,2818 2470,2652 2676,2398C2753,2302 2815,2201 2804,2191C2799,2186 2775,2175 2750,2166C2664,2133 2546,2055 2463,1976C2229,1755 2121,1438 2174,1121C2184,1064 2190,1017 2188,1015C2181,1008 1988,980 1885,970C1671,950 1480,961 1246,1006C975,1059 617,1180 377,1302L318,1331L324,1418C377,2102 724,2619 1260,2808C1454,2876 1659,2895 1869,2864ZM3310,2057C3410,2029 3478,2000 3553,1950C3980,1672 4043,1075 3684,716C3325,357 2728,420 2450,847C2258,1139 2283,1527 2510,1795C2630,1936 2783,2026 2970,2066C3050,2083 3232,2078 3310,2057Z" style="fill:rgb(218,42,47);fill-rule:nonzero;"/> <path d="M3065,1735C3040,1711 3040,1708 3040,1535L3040,1360L2865,1360C2692,1360 2689,1360 2665,1335C2649,1320 2640,1299 2640,1280C2640,1261 2649,1240 2665,1225C2689,1200 2692,1200 2865,1200L3040,1200L3040,1025C3040,852 3040,849 3065,825C3080,809 3101,800 3120,800C3139,800 3160,809 3175,825C3200,849 3200,852 3200,1025L3200,1200L3375,1200C3548,1200 3551,1200 3575,1225C3608,1257 3608,1303 3575,1335C3551,1360 3548,1360 3375,1360L3200,1360L3200,1535C3200,1708 3200,1711 3175,1735C3160,1751 3139,1760 3120,1760C3101,1760 3080,1751 3065,1735Z" style="fill:rgb(218,42,47);fill-rule:nonzero;"/> </g> </svg>  Synced Groups</h3>"""
    content += f"""<table id="sso-groups"><tr><th><b>🏷 Name</b></th><th><b>🌎 Domain</b></th><th><b>🗓 CreateTime</b></th></tr>"""
    for group in groups["GroupFilters"]:
        content += f"""<tr><td>  {group['Name']} </td><td>  {group['Domain']} </td><td>{group['CreateTime']}</td></tr>"""
    content += """</table>"""
    generationTime = datetime.now()
    content += f"""<br><font size=-4>{generationTime} +0000 UTC</font> </body></html>"""

    s3 = boto3.client('s3')
    try:
        s3.put_object(Body=content, Bucket=s3bucketname, Key=f"sso/group-monitoring.html",ContentType='text/html',ServerSideEncryption="AES256",ACL="bucket-owner-full-control")
    except:
        logging.info(f"Could not store sso/group-monitoring.html on s3:{s3bucketname}")

def create_update(groups,s3_dokubucket,ad_domainname):
    added = []
    removed = []
    try:
        logging.info("🔎 Get Current Sync Filters")
        filters = sso.list_sync_filters("SynchronizationToActiveDirectoryAwsSso","GROUP")
        currentfilters ={}
        currentfiltersfull ={"GroupFilters": []}
        currentfilters = {"GroupFilters": []}
        if filters['SyncFilters'] != []:
            for filter in filters['SyncFilters']:
                groupinfo = json.loads(filter['Attributes'])
                currentfilters["GroupFilters"].append(groupinfo['samaccountname'][0]['display-only'])
                currentfiltersfull["GroupFilters"].append({"Name": groupinfo['samaccountname'][0]['display-only'],"Domain": {groupinfo['associateddomain'][0]}, "FilterId": filter['SyncFilterId']})

        logging.info(f"␖ adding new Group Filters...")
        addingfilters = False
        for group in groups["GroupFilters"]:
            if group["Name"] not in currentfilters["GroupFilters"]:
                logging.info(f"+ Creating filter for {group['Name']}.")
                name = group['Name']
                addingfilters = True
                groupadd = sso.create_sync_filter("SynchronizationToActiveDirectoryAwsSso","GROUP",ad_domainname,name)
                added.append(f"""{name}""")
                logging.info(groupadd)
        if(not addingfilters):
            logging.info(f"ℹ️  No Filters needs to be added.")

        logging.info(f"🧹 Cleanup unused Group Filters...")
        cleanupfilters = False
        for group in currentfiltersfull["GroupFilters"]:
                limited_list = [item for item in groups['GroupFilters'] if item.get('Name')==group['Name']]
                if(limited_list ==[]):
                    logging.info(f"− Removing filter for {group['Name']}.")
                    filterid = group['FilterId']
                    sso.delete_sync_filter("SynchronizationToActiveDirectoryAwsSso",filterid)
                    removed.append(f"""{name}""")
                    cleanupfilters = True
        if(not cleanupfilters):
            logging.info(f"ℹ️  No Filters needs to be removed.")

        logging.info("🔎 Get Current Sync Filters")
        filters = sso.list_sync_filters("SynchronizationToActiveDirectoryAwsSso","GROUP")
        currentfiltersfull ={"GroupFilters": []}
        if filters['SyncFilters'] != []:
            for filter in filters['SyncFilters']:
                groupinfo = json.loads(filter['Attributes'])
                currentfiltersfull["GroupFilters"].append({"Name": groupinfo['samaccountname'][0]['display-only'],"Domain": groupinfo['associateddomain'][0], "FilterId": filter['SyncFilterId'],"CreateTime": filter['CreateTime']})
        logging.info("📄 Rendering HTML for Documentation")
        render_html(currentfiltersfull,s3_dokubucket)
        status = "SUCCESS"
        message = "Create / Update Successful GroupFilters for AWS SSO"
        title = "⚠️ Create / Update Successful GroupFilters for AWS SSO"
        text = "An Create / Update Event was invoked for the GroupFilters Lambda."
        if(added == []):
            text += f"\n  No new SSO SyncFilters where created. \n\n"
        else:
            text += f"\n  \n ✚  The following SSO SyncFilters where created: \n\n \n\n"
        for group in added:
            text += f"\n  *{group}:* \n\n"
        if(removed == []):
            text += f"\n  No new SSO SyncFilters where deleted. \n\n"
        else:
            text += f"\n  \n −  The following SSO SyncFilters where deleted: \n\n \n\n"
        for group in removed:
            text += f"\n  *{group}:* \n\n"
        return status, message, title, text
    except Exception as e:
        status = "FAILED"
        message = "Could not Create / Update SSO SyncFilters for AWS SSO"
        title = "🚨 Could not Create / Update SSO SyncFilters for AWS SSO"
        text = "An Create / Update Event was invoked for the GroupFilters Lambda. \n\n Error: {e}"
        return status, message, title, text

def delete():
    try:
        removed = []
        logging.info("🔎 Get Current Sync Filters")
        filters = sso.list_sync_filters("SynchronizationToActiveDirectoryAwsSso","GROUP")
        currentfilters ={}
        currentfiltersfull ={"GroupFilters": []}
        currentfilters = {"GroupFilters": []}
        if filters['SyncFilters'] != []:
            for filter in filters['SyncFilters']:
                groupinfo = json.loads(filter['Attributes'])
                logging.info(f"− Removing filter for {groupinfo['samaccountname'][0]['display-only']}.")
                sso.delete_sync_filter("SynchronizationToActiveDirectoryAwsSso",filter['SyncFilterId'])
                removed.append(f"""{groupinfo['samaccountname'][0]['display-only']} - {filter['SyncFilterId']}""")
        status = "SUCCESS"
        message = "Deleted GroupFilters for AWS SSO"
        if(removed == []):
            text += f"\n  No new SSO SyncFilters where deleted. \n\n"
        else:
            text += f"\n  \n −  The following SSO SyncFilters where deleted: \n\n \n\n"
        for group in removed:
            text += f"\n  *{group}:* \n\n"
        return status, message, title, text
    except Exception as e:
        status = "FAILED"
        message = "Could not Create / Update SSO SyncFilters for AWS SSO"
        title = "🚨 Could not Create / Update SSO SyncFilters for AWS SSO"
        text = "An Create / Update Event was invoked for the GroupFilters Lambda. \n\n Error: {e}"
        return status, message, title, text

def lambda_handler(event, context):
    logging.info(json.dumps(event, indent=4))
    s3_dokubucket = os.environ['S3_DOKUBUCKET']
    ad_domainname= os.environ['AD_DOMAINNAME']
    docu_website = os.environ['DOKU_WEBSITE']
    ssm_groups_parameter= os.environ['SSM_GROUPS_PARAMETER']
    ssm = boto3.client('ssm')
    print(ssm_groups_parameter)
    try:
        parameter = ssm.get_parameter(
            Name=ssm_groups_parameter)
        groups = json.loads(parameter['Parameter']['Value'])
        logging.info(f"✅ Successfull retrieved SSM Parameter for GroupFilters.")
    except Exception as e:
        status = "FAILED"
        message = "Could not retrieve SSM Parameter for GroupFilters."
        logging.info(f"🚨 Could not retrieve SSM Parameter for GroupFilters. - Error {e}")
        update_cloudformation(event,status,message)
    if (event['RequestType'] == 'Create'):
        logging.info(f"💡 Got event: {event['RequestType']}")
        status, message, title, text = create_update(groups,s3_dokubucket,ad_domainname)
        # executed only if webhook for Teams is set
        if webhook_url_teams:
           notify_teams(webhook_url_teams, docu_website,title, text)
        update_cloudformation(event,status,message)
    if(event['RequestType']  == 'Update'):
        logging.info(f"💡 Got event: {event['RequestType']}")
        status, message, title, text = create_update(groups,s3_dokubucket,ad_domainname)
        # executed only if webhook for Teams is set
        if webhook_url_teams:
            notify_teams(webhook_url_teams, docu_website,title, text)
        update_cloudformation(event,status,message)
    if(event['RequestType'] == 'Delete'):
        logging.info(f"💡 Got event: {event['RequestType']}")
        status, message, title, text = delete()
        # executed only if webhook for Teams is set
        if webhook_url_teams:
            notify_teams(webhook_url_teams, docu_website,title, text)
        update_cloudformation(event,status,message)