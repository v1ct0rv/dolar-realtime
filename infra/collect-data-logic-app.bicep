@description('Full URL of the collect-data endpoint')
param appUrl string = 'https://salmon-ground-0be8b030f.4.azurestaticapps.net/api/cron/collect-data'

@description('Bearer token for CRON_SECRET')
@secure()
param cronSecret string

@description('Azure region')
param location string = resourceGroup().location

var logicAppName = 'dolar-v2-data-collector'

resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  properties: {
    state: 'Enabled'
    definition: loadJsonContent('collect-data-workflow.json')
    parameters: {
      appUrl:     { value: appUrl }
      cronSecret: { value: cronSecret }
    }
  }
}

output logicAppName string = logicApp.name
output logicAppId   string = logicApp.id
