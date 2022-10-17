# Init Setup of AWS SSO

## Description
This solution setup your AWS Indentity Center and configures a Ad Connector as Identity Source
### Prerequisite:

- Identity Center must be enabled in your Organization
- Existing AD Connect (for this example - Script can be adjusted to use different Identity Sources)
- [AWS CLI](https://aws.amazon.com/de/cli/) is installed and configured
- [Python](https://www.python.org/) is installed

## Architecture
![Architecture](./static/sso-init.drawio.png)

### Deployment:

1. Run setup.py to install all dependencies for coto
2. Adjust variables in init.py
3. Open shell
4. Login to your aws account
5. Run init.py