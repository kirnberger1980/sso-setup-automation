import boto3
import coto
import json
import time
import os
session = coto.Session(
    boto3_session=boto3.Session()
)

region = os.getenv('AWS_DEFAULT_REGION')
awsaccountid = boto3.client('sts').get_caller_identity().get('Account')

sso = session.client('sso')

def change_source_identity(DirectoryId, DirectoryType, SyncProfileName, SyncTargetName):
    print(f"⚠️ Changing Source Identity for SSO Instance in region {region}")
    print(f"⚙️ Settings:\n  DirectoryId: {DirectoryId}\n  DirectoryType: {DirectoryType}\n  SyncProfileName: {SyncProfileName}\n  SyncTargetName: {SyncTargetName}")
    response = sso.list_associations()
    print("    🧪 Checking if there are old Directory Associations")
    if response['directoryAssociations'] != []:
        for association in response['directoryAssociations']:
            directory_id = association['directoryId']
            directory_type= association['directoryType']
        print(f"    💡 Found old Directory Association: {directory_id} - {directory_type}")
        try:
            print(f"    💥 Removing old Directory Association: {directory_id} - {directory_type}")
            response = sso.disassociate_directory(directory_id,directory_type)
            time.sleep(10)
        except:
            print(f"    🚨 Error while removing old Directory Association: {directory_id} - {directory_type}")
    else:
        print("    ✅ No old Directory Associations")
    try:
        response = sso.associate_directory(DirectoryId,DirectoryType)
        print(f"    ✅ Associated Directory {DirectoryId} to SSO Instance in {region}.")
    except:
        print(f"    🚨 Error while associating Directory {DirectoryId} to SSO Instance in {region}.")
    time.sleep(10)
    try:
        response = sso.delete_syncprofile("SynchronizationToActiveDirectoryAwsSso")
        print(f"    ✅ Sucessfully Deleted SyncProfile  SynchronizationToActiveDirectoryAwsSso.")
    except:
        print(f"    🚨 Error while deleting SyncProfile SynchronizationToActiveDirectoryAwsSso.")
    time.sleep(10)
    try:
        SourceResourceArn = "arn:aws:ds:" + region + ":" + awsaccountid + ":directory/" + DirectoryId
        create = sso.create_syncprofile("SynchronizationToActiveDirectoryAwsSso",SourceResourceArn)
        print(f"    ✅ Sucessfully Creating SyncProfile  SynchronizationToActiveDirectoryAwsSso.")
    except:
        print(f"    🚨 Error while creating SyncProfile SynchronizationToActiveDirectoryAwsSso.")
    time.sleep(10)
    try:
        print("✚ Adding Test User Sync Filter")
        groupadd = sso.create_sync_filter("SynchronizationToActiveDirectoryAwsSso",SyncType,DomainName,SyncTargetName)
        print(groupadd)
    except:
        print(f"🚨 Error while adding test sync filter.")
    synctarget= sso.create_synctarget(SyncProfileName,SyncTargetName,"identitystore/"+DirectoryId)
    print(synctarget)
    reponse= sso.get_ssoconfiguration()
    print(reponse)
    start = sso.start_sync("SynchronizationToActiveDirectoryAwsSso")
    print(start)


#Variabables
DirectoryId="d-1234" #Needs to be adjusted
DirectoryType="ADConnector"
DomainName="test.domain" #Needs to be adjusted
SyncName ="testgroup" #Needs to be adjusted
SyncProfileName= "SynchronizationToActiveDirectoryAwsSso"
SyncTargetName="IdentityStoreForSSO"
SyncType="GROUP"

change_source_identity(DirectoryId, DirectoryType, SyncProfileName, SyncTargetName, SyncType, DomainName, )

